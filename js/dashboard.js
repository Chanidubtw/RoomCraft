document.addEventListener('DOMContentLoaded', async () => {
  if (!API.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const session = API.getSession();
  const ACTIVITY_KEY = 'roomcraft_activity_log';
  let latestDesigns = [];

  document.querySelectorAll('.user-name').forEach(el => el.textContent = session.display_name || 'Designer');
  document.querySelectorAll('.user-email').forEach(el => el.textContent = session.email || '-');
  document.querySelectorAll('.user-initial').forEach(el => {
    el.textContent = (session.display_name || 'D').charAt(0).toUpperCase();
  });

  const openers = ['newDesignBtn', 'newDesignBtnSecondary', 'emptyNewBtn', 'profileNewDesign'];
  openers.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', openModal);
  });

  document.getElementById('logoutBtn').addEventListener('click', () => API.logout());
  document.getElementById('cancelNewDesign').addEventListener('click', closeModal);
  document.getElementById('newDesignForm').addEventListener('submit', createDesign);
  document.getElementById('newDesignModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  await loadDashboard();

  async function loadDashboard() {
    try {
      const [stats, designs] = await Promise.all([API.getStats(), API.getDesigns()]);
      document.getElementById('statDraft').textContent = stats.draft || 0;
      document.getElementById('statOngoing').textContent = stats.in_progress || 0;
      document.getElementById('statFinished').textContent = stats.finished || 0;

      latestDesigns = (designs || []).slice().sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      renderRecentProjects(latestDesigns.slice(0, 8));
      renderRecentActivity(latestDesigns);
    } catch (err) {
      showToast('Could not load dashboard: ' + err.message);
      renderRecentProjects([]);
      renderRecentActivity([]);
    }
  }

  function renderRecentProjects(designs) {
    const list = document.getElementById('recentProjects');
    const empty = document.getElementById('emptyState');

    list.innerHTML = '';

    if (!designs.length) {
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');

    designs.forEach(design => {
      const isDraft = design.status === 'draft';
      const isFinished = design.status === 'finished';

      const row = document.createElement('article');
      row.className = 'project';
      row.innerHTML =
        '<div class="preview">' + miniPreview(design) + '</div>' +
        '<div class="meta">' +
          '<span class="status status-' + esc(design.status) + '">' + API.statusLabel(design.status) + '</span>' +
          '<h3>' + esc(design.name || 'Untitled Design') + '</h3>' +
          '<p>Last edited ' + formatRelativeTime(design.updated_at) + '</p>' +
          '<p>' + roomMeta(design) + '</p>' +
        '</div>' +
        '<div class="project-actions">' +
          '<button class="icon-btn" data-action="open" data-id="' + design.id + '">Open</button>' +
          '<button class="icon-btn" data-action="to-draft" data-id="' + design.id + '"' + (isDraft ? ' disabled' : '') + '>Draft</button>' +
          '<button class="icon-btn" data-action="to-finished" data-id="' + design.id + '"' + (isFinished ? ' disabled' : '') + '>Finish</button>' +
          '<button class="icon-btn icon-btn-danger" data-action="delete" data-id="' + design.id + '" data-name="' + esc(design.name || 'Untitled Design') + '">Delete</button>' +
        '</div>';
      list.appendChild(row);
    });

    list.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async e => {
        const action = e.currentTarget.dataset.action;
        const id = parseInt(e.currentTarget.dataset.id, 10);
        const name = e.currentTarget.dataset.name || findDesignName(id);

        if (action === 'open') {
          goTo(id);
          return;
        }

        if (action === 'to-draft') {
          await changeStatus(id, 'draft', 'Moved "' + name + '" to Draft', 'info');
          return;
        }

        if (action === 'to-finished') {
          await changeStatus(id, 'finished', 'Completed "' + name + '" design', 'ok');
          return;
        }

        if (action === 'delete') {
          await deleteProject(id, name);
        }
      });
    });
  }

  async function changeStatus(id, status, activityTitle, activityType) {
    try {
      await API.updateStatus(id, status);
      pushActivity({ title: activityTitle, type: activityType, ts: new Date().toISOString() });
      showToast('Status updated');
      await loadDashboard();
    } catch (err) {
      showToast('Error: ' + err.message);
    }
  }

  async function deleteProject(id, name) {
    if (!confirm('Delete "' + name + '"? This cannot be undone.')) return;

    try {
      await API.deleteDesign(id);
      pushActivity({ title: 'Deleted "' + name + '" project', type: 'warn', ts: new Date().toISOString() });
      showToast('Project deleted');
      await loadDashboard();
    } catch (err) {
      showToast('Error: ' + err.message);
    }
  }

  function renderRecentActivity(designs) {
    const activityList = document.getElementById('recentActivity');
    const empty = document.getElementById('emptyActivity');
    if (!activityList || !empty) return;

    const derived = buildDerivedActivities(designs);
    const logged = getActivityLog();

    const merged = [...logged, ...derived]
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .filter((item, idx, arr) => {
        const key = item.title + '|' + item.ts;
        return arr.findIndex(x => (x.title + '|' + x.ts) === key) === idx;
      })
      .slice(0, 8);

    activityList.innerHTML = '';

    if (!merged.length) {
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');

    merged.forEach(item => {
      const li = document.createElement('li');
      li.className = 'activity-item';
      li.innerHTML =
        '<span class="activity-dot ' + esc(item.type || 'info') + '"></span>' +
        '<div>' +
          '<p class="activity-title">' + esc(item.title) + '</p>' +
          '<p class="activity-time">' + formatRelativeTime(item.ts) + '</p>' +
        '</div>';
      activityList.appendChild(li);
    });
  }

  function buildDerivedActivities(designs) {
    return (designs || []).slice(0, 10).map(d => {
      const created = new Date(d.created_at || d.updated_at || Date.now()).getTime();
      const updated = new Date(d.updated_at || d.created_at || Date.now()).getTime();
      const justCreated = Math.abs(updated - created) < 120000;
      const name = d.name || 'Untitled Design';

      if (justCreated) {
        return {
          title: 'Created new ' + API.statusLabel(d.status).toLowerCase() + ' "' + name + '"',
          type: d.status === 'finished' ? 'ok' : 'info',
          ts: d.created_at || d.updated_at
        };
      }

      if (d.status === 'finished') {
        return {
          title: 'Completed "' + name + '" design',
          type: 'ok',
          ts: d.updated_at || d.created_at
        };
      }

      return {
        title: 'Updated "' + name + '" project',
        type: 'warn',
        ts: d.updated_at || d.created_at
      };
    });
  }

  function getActivityLog() {
    const all = safeParse(localStorage.getItem(ACTIVITY_KEY), {});
    return all[session.id] || [];
  }

  function pushActivity(entry) {
    const all = safeParse(localStorage.getItem(ACTIVITY_KEY), {});
    const bucket = all[session.id] || [];
    bucket.unshift(entry);
    all[session.id] = bucket.slice(0, 40);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(all));
  }

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function findDesignName(id) {
    const d = latestDesigns.find(item => item.id === id);
    return d ? d.name : 'Untitled Design';
  }

  function roomMeta(d) {
    if (!d.room) return 'No room dimensions';
    const items = d.furniture ? d.furniture.length : 0;
    return d.room.width + 'm x ' + d.room.height + 'm • ' + items + ' item' + (items === 1 ? '' : 's');
  }

  function formatRelativeTime(iso) {
    if (!iso) return 'recently';

    const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (sec < 60) return 'just now';

    const mins = Math.floor(sec / 60);
    if (mins < 60) return mins + ' minute' + (mins === 1 ? '' : 's') + ' ago';

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + ' hour' + (hrs === 1 ? '' : 's') + ' ago';

    const days = Math.floor(hrs / 24);
    if (days < 7) return days + ' day' + (days === 1 ? '' : 's') + ' ago';

    return API.formatDate(iso);
  }

  function miniPreview(d) {
    if (!d.room) return '<span style="font-size:1.2rem">🏠</span>';

    const rw = d.room.width;
    const rh = d.room.height;
    const sc = Math.min(70 / rw, 52 / rh);
    const pw = rw * sc;
    const ph = rh * sc;
    const ox = (80 - pw) / 2;
    const oy = (64 - ph) / 2;
    let fsvg = '';

    if (d.furniture) {
      d.furniture.forEach(f => {
        fsvg += '<rect x="' + (ox + f.x * sc) + '" y="' + (oy + f.y * sc) + '" width="' + (f.w * sc) + '" height="' + (f.h * sc) + '" fill="' + (f.color || '#8B7355') + '" opacity="0.85" rx="2" />';
      });
    }

    return '<svg width="80" height="64" viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="' + ox + '" y="' + oy + '" width="' + pw + '" height="' + ph + '" fill="' + (d.room.color || '#f5e6d3') + '" stroke="#2a2a2a22" stroke-width="1" rx="3" />' +
      fsvg +
      '</svg>';
  }

  function openModal() {
    document.getElementById('newDesignModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('designNameInput').focus(), 40);
  }

  function closeModal() {
    document.getElementById('newDesignModal').classList.add('hidden');
    document.getElementById('newDesignForm').reset();
    document.getElementById('newDesignError').classList.add('hidden');
  }

  async function createDesign(e) {
    e.preventDefault();
    const errEl = document.getElementById('newDesignError');
    const btn = document.getElementById('createDesignBtn');

    errEl.classList.add('hidden');
    btn.textContent = 'Creating...';
    btn.disabled = true;

    try {
      const status = document.getElementById('designStatusInput').value;
      const name = document.getElementById('designNameInput').value.trim() || 'Untitled Design';
      const design = await API.createDesign({
        name,
        status,
        room: {
          width: parseFloat(document.getElementById('roomWidthInput').value) || 5,
          height: parseFloat(document.getElementById('roomHeightInput').value) || 4,
          color: document.getElementById('roomColorInput').value || '#F5E6D3',
          shape: document.getElementById('roomShapeInput').value
        },
        furniture: [],
        notes: document.getElementById('designNotesInput').value.trim()
      });

      pushActivity({
        title: 'Created new ' + API.statusLabel(status).toLowerCase() + ' "' + name + '"',
        type: status === 'finished' ? 'ok' : 'info',
        ts: new Date().toISOString()
      });

      closeModal();
      goTo(design.id);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      btn.textContent = 'Create & Open';
      btn.disabled = false;
    }
  }

  function goTo(id) {
    window.location.href = 'designer.html?id=' + id;
  }

  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
  }
});
