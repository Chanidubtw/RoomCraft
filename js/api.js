const API = (() => {
  const BASE = 'https://roomcraftdb-434523840513.europe-west1.run.app/api';
  const TK_KEY  = 'roomcraft_token';
  const USR_KEY = 'roomcraft_user';

  function getToken()   { return localStorage.getItem(TK_KEY); }
  function getSession() { const r = localStorage.getItem(USR_KEY); return r ? JSON.parse(r) : null; }
  function isLoggedIn() { return !!getToken(); }

  function setSession(token, user) {
    localStorage.setItem(TK_KEY,  token);
    localStorage.setItem(USR_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TK_KEY);
    localStorage.removeItem(USR_KEY);
  }

  async function req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const token = getToken();
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body)  opts.body = JSON.stringify(body);
    let res;
    try {
      res = await fetch(BASE + path, opts);
    } catch (e) {
      throw new Error('Cannot reach server. Please try again later.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) { clearSession(); window.location.href = 'login.html'; return; }
      throw new Error(data.error || 'Request failed (' + res.status + ')');
    }
    return data;
  }

  const get   = path        => req('GET',    path);
  const post  = (path, b)   => req('POST',   path, b);
  const put   = (path, b)   => req('PUT',    path, b);
  const patch = (path, b)   => req('PATCH',  path, b);
  const del   = path        => req('DELETE', path);

  async function register(email, password, displayName, role) {
    const data = await post('/auth/register', { email, password, display_name: displayName, role: role || 'Interior Designer' });
    setSession(data.token, data.user);
    return data.user;
  }

  async function login(email, password) {
    const data = await post('/auth/login', { email, password });
    setSession(data.token, data.user);
    return data.user;
  }

  function logout() { clearSession(); window.location.href = 'login.html'; }

  async function getDesigns(status) {
    const data = await get(status ? '/designs?status=' + status : '/designs');
    return data.designs;
  }

  async function getDesign(id) {
    const data = await get('/designs/' + id);
    return data.design;
  }

  async function createDesign(payload) {
    const data = await post('/designs', payload);
    return data.design;
  }

  async function saveDesign(id, payload) {
    const data = await put('/designs/' + id, payload);
    return data.design;
  }

  async function updateStatus(id, status) {
    const data = await patch('/designs/' + id + '/status', { status });
    return data.design;
  }

  async function duplicateDesign(id) {
    const data = await post('/designs/' + id + '/duplicate');
    return data.design;
  }

  async function deleteDesign(id) { await del('/designs/' + id); }

  async function getStats() {
    const data = await get('/designs/stats');
    return data.stats;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function statusLabel(s) {
    return { draft: 'Draft', in_progress: 'In Progress', finished: 'Finished' }[s] || s;
  }

  return {
    getToken, getSession, setSession, clearSession, isLoggedIn,
    register, login, logout,
    getDesigns, getDesign, createDesign, saveDesign,
    updateStatus, duplicateDesign, deleteDesign, getStats,
    formatDate, statusLabel
  };
})();
