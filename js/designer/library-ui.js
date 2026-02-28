(function () {
  function renderLibrary(opts) {
    const sidebarEl = opts && opts.sidebarEl;
    const groups = (opts && opts.groups) || [];
    const library = (opts && opts.library) || [];
    const onAdd = opts && opts.onAdd;

    if (!sidebarEl || typeof onAdd !== 'function') return;

    sidebarEl.innerHTML = '';
    const map = new Map(library.map(item => [item.type, item]));

    function renderItem(def, isSub) {
      const el = document.createElement('div');
      el.className = 'furniture-item' + (isSub ? ' is-sub-item' : '');
      el.title = `Click to add ${def.label} (${def.w}m × ${def.h}m)`;
      el.innerHTML = `
        <span class="fi-icon">${def.emoji}</span>
        <div class="fi-info">
          <span class="fi-label">${def.label}</span>
          <span class="fi-size">${def.w}×${def.h}m</span>
        </div>`;
      el.addEventListener('click', () => onAdd(def));
      return el;
    }

    groups.forEach(group => {
      const title = document.createElement('div');
      title.className = 'sidebar-section-title';
      title.textContent = group.label;
      sidebarEl.appendChild(title);

      (group.families || []).forEach((family, idx) => {
        const familyBtn = document.createElement('button');
        familyBtn.className = 'furniture-family' + (idx === 0 ? ' open' : '');
        familyBtn.type = 'button';
        familyBtn.innerHTML =
          `<span class="fam-left"><span class="fi-icon">${family.emoji || '◻'}</span><span>${family.label}</span></span>` +
          '<span class="fam-chevron">▾</span>';

        const sub = document.createElement('div');
        sub.className = 'furniture-sublist' + (idx === 0 ? ' open' : '');
        (family.types || []).forEach(type => {
          const def = map.get(type);
          if (def) sub.appendChild(renderItem(def, true));
        });

        familyBtn.addEventListener('click', () => {
          const willOpen = !sub.classList.contains('open');
          sub.classList.toggle('open', willOpen);
          familyBtn.classList.toggle('open', willOpen);
        });

        sidebarEl.appendChild(familyBtn);
        sidebarEl.appendChild(sub);
      });

      (group.items || []).forEach(type => {
        const def = map.get(type);
        if (def) sidebarEl.appendChild(renderItem(def, false));
      });
    });
  }

  window.DesignerLibraryUI = { renderLibrary };
})();
