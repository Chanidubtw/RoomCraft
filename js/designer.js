/**
 * RoomCraft — Designer
 * Full 2D canvas interaction + Three.js 3D visualization
 */

const DesignerCatalog = window.DesignerCatalog || { FURNITURE_LIB: [], LIBRARY_GROUPS: [] };
const FURNITURE_LIB = DesignerCatalog.FURNITURE_LIB;
const LIBRARY_GROUPS = DesignerCatalog.LIBRARY_GROUPS;

/* ══════════════════════════════════════
   CONSTANTS
══════════════════════════════════════ */
const SCALE      = 70;   // pixels per meter
const GRID_SIZE  = 0.5;  // grid lines every 0.5m
const HANDLE_R   = 6;    // resize handle radius px
const SNAP_GRID  = 0.25; // snap to 0.25m increments
const WALL_T     = 0.12; // visual wall thickness in canvas (m)

/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
let state = {
  designId:   null,
  designName: 'Untitled Design',
  userId:     null,
  status:     'draft',           // ← ADD THIS
  room: { width: 5, height: 4, color: '#F5E6D3', shape: 'rectangle' },
  furniture:  [],
  selected:   null,
  history:    [],
  historyIdx: -1,
  dirty:      false,
};

let canvas, ctx;
let roomOffset = { x: 0, y: 0 };

let pointer = { x: 0, y: 0 };      // current mouse in canvas px
let dragState   = null;
let resizeState = null;
let isRotating  = false;

let scene3d = null, renderer3d = null, animId = null;
let threeDepsPromise = null;

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.addEventListener('load', () => { s.dataset.loaded = '1'; resolve(); }, { once: true });
    s.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(s);
  });
}

async function ensure3DDependencies() {
  if (threeDepsPromise) return threeDepsPromise;
  threeDepsPromise = (async () => {
    if (!window.THREE) {
      await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
    }
    if (!window.THREE || !window.THREE.OrbitControls) {
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');
    }
    if (!window.THREE || !window.THREE.GLTFLoader) {
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js');
    }
    if (!window.THREE || !window.THREE.MTLLoader) {
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/MTLLoader.js');
    }
    if (!window.THREE || !window.THREE.OBJLoader) {
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js');
    }
  })().catch(err => {
    threeDepsPromise = null;
    throw err;
  });
  return threeDepsPromise;
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  if (!API.isLoggedIn()) { window.location.href = 'login.html'; return; }
  const session = API.getSession();
  state.userId = session.id;

  const params   = new URLSearchParams(location.search);
  const designId = params.get('id');
  if (designId) {
    try {
      const design = await API.getDesign(designId);
      if (design) {
        state.designId   = design.id;
        state.designName = design.name;
        state.room       = { ...design.room };
        state.furniture  = JSON.parse(JSON.stringify(design.furniture || []));
        state.status     = design.status || 'draft';
      }
    } catch(e) { alert('Could not load design: ' + e.message); }
  }

  canvas = document.getElementById('designCanvas');
  ctx    = canvas.getContext('2d');

  setupUI(session);
  setupFurnitureLibrary();
  applyRoomToPanel();
  pushHistory();
  requestAnimationFrame(() => { setupCanvas(); render(); });
});

/* Safe getElementById — throws a clear error instead of crashing silently */
function $id(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`RoomCraft: element #${id} not found`);
  return el;
}
function on(id, evt, fn) {
  const el = $id(id);
  if (el) el.addEventListener(evt, fn);
}

/* ══════════════════════════════════════
   UI SETUP
══════════════════════════════════════ */
function setupUI(session) {
  // Design name
  const nameInput = $id('designNameField');
  if (nameInput) {
    nameInput.value = state.designName;
    nameInput.addEventListener('input', () => {
      state.designName = nameInput.value || 'Untitled Design';
      state.dirty = true;
    });
  }

  // Topbar buttons
  on('saveBtn', 'click', saveDesign);
  on('backBtn', 'click', () => {
    if (state.dirty && !confirm('You have unsaved changes. Leave anyway?')) return;
    window.location.href = 'dashboard.html';
  });

  // View toggle
  on('view2d', 'click', () => switchView('2d'));
  on('view3d', 'click', () => show3D());

  // Canvas toolbar
  on('undoBtn',     'click', undo);
  on('deleteBtn',   'click', deleteSelected);
  on('rotateBtn',   'click', rotateSelected);
  on('bringFrontBtn','click', bringFront);
  on('clearBtn',    'click', clearAll);

  // Room panel
  on('roomWidth',  'input',  updateRoom);
  on('roomHeight', 'input',  updateRoom);
  on('roomColor',  'input',  updateRoom);
  on('roomShape',  'change', updateRoom);

  // Properties panel — furniture
  on('furColor', 'input', (e) => {
    if (state.selected) { state.selected.color = e.target.value; render(); state.dirty = true; }
  });
  on('furShading', 'input', (e) => {
    if (state.selected) {
      state.selected.shading = parseFloat(e.target.value);
      const lbl = $id('furShadingVal');
      if (lbl) lbl.textContent = Math.round(state.selected.shading * 100) + '%';
      render(); state.dirty = true;
    }
  });
  on('furWidth', 'input', (e) => {
    if (state.selected) { state.selected.w = Math.max(0.3, parseFloat(e.target.value) || 0.5); render(); state.dirty = true; }
  });
  on('furHeight', 'input', (e) => {
    if (state.selected) { state.selected.h = Math.max(0.3, parseFloat(e.target.value) || 0.5); render(); state.dirty = true; }
  });

  // 3D modal close
  on('close3dBtn', 'click', close3D);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); }
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveDesign(); }
    if (e.key === 'r') rotateSelected();
    if (e.key === 'Escape') deselect();
  });
}

/* ══════════════════════════════════════
   FURNITURE LIBRARY SIDEBAR
══════════════════════════════════════ */
function setupFurnitureLibrary() {
  const sidebar = $id('furnitureSidebar');
  if (!sidebar) return;
  if (window.DesignerLibraryUI && typeof window.DesignerLibraryUI.renderLibrary === 'function') {
    window.DesignerLibraryUI.renderLibrary({
      sidebarEl: sidebar,
      groups: LIBRARY_GROUPS,
      library: FURNITURE_LIB,
      onAdd: addFurniture
    });
    return;
  }
  console.warn('DesignerLibraryUI module not loaded. Furniture sidebar is unavailable.');
}

function addFurniture(def) {
  const rw = state.room.width, rh = state.room.height;
  // Place near center, slightly randomized
  const cx = Math.max(0, Math.min(rw - def.w, (rw - def.w) / 2 + (Math.random() - 0.5) * 0.5));
  const cy = Math.max(0, Math.min(rh - def.h, (rh - def.h) / 2 + (Math.random() - 0.5) * 0.5));

  const item = {
    id:       'f_' + Date.now() + Math.random().toString(36).slice(2,6),
    type:     def.type,
    label:    def.label,
    emoji:    def.emoji,
    x:        snapToGrid(cx),
    y:        snapToGrid(cy),
    w:        def.w,
    h:        def.h,
    color:    def.color,
    shading:  0,
    rotation: 0,
    height3d: def.height3d,
  };
  state.furniture.push(item);
  selectItem(item);
  pushHistory();
  render();
  updatePropertiesPanel();
  showToast(`${def.label} added`);
  state.dirty = true;
}

/* ══════════════════════════════════════
   CANVAS SETUP & EVENTS
══════════════════════════════════════ */
function setupCanvas() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('mousedown',  onMouseDown);
  canvas.addEventListener('mousemove',  onMouseMove);
  canvas.addEventListener('mouseup',    onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);

  // Touch
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onMouseDown(touchToMouse(e)); }, { passive: false });
  canvas.addEventListener('touchmove',  (e) => { e.preventDefault(); onMouseMove(touchToMouse(e)); }, { passive: false });
  canvas.addEventListener('touchend',   (e) => { e.preventDefault(); onMouseUp(touchToMouse(e));   }, { passive: false });
}

function touchToMouse(e) {
  const t = e.touches[0] || e.changedTouches[0];
  return { clientX: t.clientX, clientY: t.clientY, button: 0 };
}

function resizeCanvas() {
  const wrapper = canvas.parentElement;
  const W = wrapper.clientWidth  - 40;
  const H = wrapper.clientHeight - 40;
  canvas.width  = Math.max(400, W);
  canvas.height = Math.max(300, H);
  render();
}

/* ── Mouse coordinate helpers ── */
function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width  / rect.width),
    y: (e.clientY - rect.top)  * (canvas.height / rect.height),
  };
}

function canvasToRoom(cx, cy) {
  return {
    x: (cx - roomOffset.x) / SCALE,
    y: (cy - roomOffset.y) / SCALE,
  };
}

function roomToCanvas(rx, ry) {
  return {
    x: roomOffset.x + rx * SCALE,
    y: roomOffset.y + ry * SCALE,
  };
}

function snapToGrid(v) {
  return Math.round(v / SNAP_GRID) * SNAP_GRID;
}

/* ══════════════════════════════════════
   MOUSE EVENTS
══════════════════════════════════════ */
function onMouseDown(e) {
  if (e.button !== 0) return;
  const { x: mx, y: my } = getCanvasPos(e);
  pointer = { x: mx, y: my };

  // 1. Check resize handles if something selected
  if (state.selected) {
    const handle = getHandleAt(mx, my, state.selected);
    if (handle) {
      resizeState = {
        handle,
        startMx:  mx, startMy: my,
        startX:   state.selected.x,
        startY:   state.selected.y,
        startW:   state.selected.w,
        startH:   state.selected.h,
      };
      return;
    }
  }

  // 2. Hit-test furniture (back to front)
  let hit = null;
  for (let i = state.furniture.length - 1; i >= 0; i--) {
    if (hitTest(state.furniture[i], mx, my)) { hit = state.furniture[i]; break; }
  }

  if (hit) {
    selectItem(hit);
    const cp = canvasToRoom(mx, my);
    dragState = {
      item:   hit,
      startMx: mx, startMy: my,
      startX:  hit.x, startY: hit.y,
    };
  } else {
    deselect();
  }
  render();
}

function onMouseMove(e) {
  const { x: mx, y: my } = getCanvasPos(e);
  pointer = { x: mx, y: my };

  // Cursor feedback
  let cursor = 'default';
  if (state.selected) {
    const h = getHandleAt(mx, my, state.selected);
    if (h) cursor = h.includes('n') || h.includes('s') ? (h.length === 1 ? 'ns-resize' : 'nwse-resize') : 'ew-resize';
  }
  if (!cursor || cursor === 'default') {
    for (let i = state.furniture.length - 1; i >= 0; i--) {
      if (hitTest(state.furniture[i], mx, my)) { cursor = 'move'; break; }
    }
  }
  canvas.style.cursor = cursor;

  if (resizeState) {
    const rs = resizeState;
    const dx = (mx - rs.startMx) / SCALE;
    const dy = (my - rs.startMy) / SCALE;
    const item = state.selected;

    if (rs.handle.includes('e')) item.w = snapToGrid(Math.max(0.3, rs.startW + dx));
    if (rs.handle.includes('s')) item.h = snapToGrid(Math.max(0.3, rs.startH + dy));
    if (rs.handle.includes('w')) {
      const nw = snapToGrid(Math.max(0.3, rs.startW - dx));
      item.x   = snapToGrid(rs.startX + (rs.startW - nw));
      item.w   = nw;
    }
    if (rs.handle.includes('n')) {
      const nh = snapToGrid(Math.max(0.3, rs.startH - dy));
      item.y   = snapToGrid(rs.startY + (rs.startH - nh));
      item.h   = nh;
    }
    clampToRoom(item);
    render();
    updatePropertiesPanel();
    state.dirty = true;
    return;
  }

  if (dragState) {
    const ds = dragState;
    const dx = (mx - ds.startMx) / SCALE;
    const dy = (my - ds.startMy) / SCALE;
    ds.item.x = snapToGrid(Math.max(0, Math.min(state.room.width  - ds.item.w, ds.startX + dx)));
    ds.item.y = snapToGrid(Math.max(0, Math.min(state.room.height - ds.item.h, ds.startY + dy)));
    render();
    state.dirty = true;
    return;
  }
}

function onMouseUp(e) {
  if (dragState || resizeState) {
    pushHistory();
    updatePropertiesPanel();
  }
  dragState   = null;
  resizeState = null;
}

/* ── Hit test for a furniture item (non-rotated) ── */
function hitTest(item, mx, my) {
  const c  = roomToCanvas(item.x + item.w / 2, item.y + item.h / 2);
  const hw = (item.w * SCALE) / 2, hh = (item.h * SCALE) / 2;
  const rad = -(item.rotation || 0) * Math.PI / 180;
  const lx  = mx - c.x, ly = my - c.y;
  const rx  = lx * Math.cos(rad) - ly * Math.sin(rad);
  const ry  = lx * Math.sin(rad) + ly * Math.cos(rad);
  return rx >= -hw && rx <= hw && ry >= -hh && ry <= hh;
}

/* ── Resize handles (NW, NE, SE, SW, N, S, E, W) ── */
function getHandlesForItem(item) {
  const c  = roomToCanvas(item.x + item.w / 2, item.y + item.h / 2);
  const hw = (item.w * SCALE) / 2, hh = (item.h * SCALE) / 2;
  const rad = (item.rotation || 0) * Math.PI / 180;

  const pts = [
    [-hw, -hh, 'nw'], [hw, -hh, 'ne'], [hw, hh, 'se'], [-hw, hh, 'sw'],
  ];
  return pts.map(([lx, ly, t]) => {
    const rx = lx * Math.cos(rad) - ly * Math.sin(rad);
    const ry = lx * Math.sin(rad) + ly * Math.cos(rad);
    return { x: c.x + rx, y: c.y + ry, type: t };
  });
}

function getHandleAt(mx, my, item) {
  const handles = getHandlesForItem(item);
  for (const h of handles) {
    if (Math.hypot(mx - h.x, my - h.y) <= HANDLE_R + 3) return h.type;
  }
  return null;
}

function clampToRoom(item) {
  item.x = Math.max(0, Math.min(state.room.width  - item.w, item.x));
  item.y = Math.max(0, Math.min(state.room.height - item.h, item.y));
}

/* ══════════════════════════════════════
   RENDER — 2D Canvas
══════════════════════════════════════ */
function render() {
  if (!canvas || !ctx) return;

  const cw = canvas.width, ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);

  // Canvas bg — dark checkerboard to show room edges
  ctx.fillStyle = '#3D3028';
  ctx.fillRect(0, 0, cw, ch);
  drawCheckerboard(cw, ch);

  // Room dimensions in pixels
  const rw = state.room.width  * SCALE;
  const rh = state.room.height * SCALE;
  roomOffset.x = Math.round((cw - rw) / 2);
  roomOffset.y = Math.round((ch - rh) / 2);
  const rx = roomOffset.x, ry = roomOffset.y;

  // Drop shadow for room
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur  = 24;
  ctx.fillStyle   = state.room.color;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.shadowBlur  = 0;

  // Grid
  drawGrid(rx, ry, rw, rh);

  // Walls (thick borders)
  ctx.strokeStyle = '#5C4A3A';
  ctx.lineWidth   = WALL_T * SCALE;
  ctx.strokeRect(rx, ry, rw, rh);

  // Furniture
  state.furniture.forEach(item => drawFurniture(item, false));
  if (state.selected) drawFurniture(state.selected, true); // redraw selected on top

  // Dimensions overlay
  drawDimensions(rx, ry, rw, rh);

  // Legend
  drawLegend(cw, ch);
}

function drawCheckerboard(cw, ch) {
  const sz = 24;
  ctx.fillStyle = '#352820';
  for (let cy = 0; cy < ch; cy += sz) {
    for (let cx = 0; cx < cw; cx += sz) {
      if ((Math.floor(cx/sz) + Math.floor(cy/sz)) % 2 === 0) {
        ctx.fillRect(cx, cy, sz, sz);
      }
    }
  }
}

function drawGrid(rx, ry, rw, rh) {
  const gridPx = GRID_SIZE * SCALE;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  for (let gx = rx; gx <= rx + rw; gx += gridPx) { ctx.moveTo(gx, ry); ctx.lineTo(gx, ry + rh); }
  for (let gy = ry; gy <= ry + rh; gy += gridPx) { ctx.moveTo(rx, gy); ctx.lineTo(rx + rw, gy); }
  ctx.stroke();

  // Major grid every 1m
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  const step1m = 1 * SCALE;
  for (let gx = rx; gx <= rx + rw; gx += step1m) { ctx.moveTo(gx, ry); ctx.lineTo(gx, ry + rh); }
  for (let gy = ry; gy <= ry + rh; gy += step1m) { ctx.moveTo(rx, gy); ctx.lineTo(rx + rw, gy); }
  ctx.stroke();
  ctx.restore();
}

/* ══════════════════════════════════════
   COLOR HELPERS
══════════════════════════════════════ */
function hexDarken(hex, pct) {
  const n = parseInt((hex||'#888').replace('#',''), 16);
  const r = Math.max(0, ((n>>16)&0xff) - Math.round(((n>>16)&0xff)*pct));
  const g = Math.max(0, ((n>>8) &0xff) - Math.round(((n>>8) &0xff)*pct));
  const b = Math.max(0,  (n     &0xff) - Math.round( (n     &0xff)*pct));
  return `rgb(${r},${g},${b})`;
}
function hexLighten(hex, pct) {
  const n = parseInt((hex||'#888').replace('#',''), 16);
  const r = Math.min(255, ((n>>16)&0xff) + Math.round((255-((n>>16)&0xff))*pct));
  const g = Math.min(255, ((n>>8) &0xff) + Math.round((255-((n>>8) &0xff))*pct));
  const b = Math.min(255,  (n     &0xff) + Math.round((255- (n     &0xff))*pct));
  return `rgb(${r},${g},${b})`;
}

/* ══════════════════════════════════════
   2D FURNITURE DRAWING
   All drawn in local space: centre = (0,0)
   hw = half-width px, hh = half-height px
══════════════════════════════════════ */
function drawFurniture(item, forceTop) {
  if (state.selected && state.selected.id === item.id && !forceTop) return;
  const cx = roomOffset.x + (item.x + item.w/2) * SCALE;
  const cy = roomOffset.y + (item.y + item.h/2) * SCALE;
  const hw = (item.w * SCALE) / 2, hh = (item.h * SCALE) / 2;
  const isSelected = state.selected && state.selected.id === item.id;
  const rad = (item.rotation || 0) * Math.PI / 180;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad);

  if (isSelected) { ctx.shadowColor = '#C9975A'; ctx.shadowBlur = 18; }

  // Draw shape-specific 2D representation
  drawShape2D(item, hw, hh);

  // Shading overlay
  if (item.shading && item.shading > 0) {
    ctx.fillStyle = `rgba(0,0,0,${item.shading * 0.65})`;
    ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 5); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Selection border
  if (isSelected) {
    ctx.strokeStyle = '#C9975A';
    ctx.lineWidth   = 2.5;
    ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 5); ctx.stroke();
  }

  // Label at bottom edge
  const fontSize = Math.max(7, Math.min(11, hw / 2.8));
  ctx.font = `600 ${fontSize}px DM Sans, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur  = 3;
  if (hw > 20 && hh > 16) ctx.fillText(item.label, 0, hh - 3);
  ctx.shadowBlur = 0;

  ctx.restore();

  // Resize handles and rotation hint (not rotated themselves)
  if (isSelected) {
    getHandlesForItem(item).forEach(h => {
      ctx.beginPath(); ctx.arc(h.x, h.y, HANDLE_R, 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#C9975A'; ctx.lineWidth = 2; ctx.stroke();
    });
    ctx.font = '10px DM Sans, sans-serif';
    ctx.fillStyle = 'rgba(201,151,90,0.9)';
    const topC = roomToCanvas(item.x + item.w/2, item.y);
    ctx.fillText('⟳ R', topC.x + 6, topC.y - 16);
  }
}

/* Dispatch to shape-specific draw function */
function drawShape2D(item, hw, hh) {
  const c = item.color;
  switch (item.type) {
    case 'sofa':         draw2D_sofa(hw, hh, c);         break;
    case 'armchair':     draw2D_armchair(hw, hh, c);     break;
    case 'chair':        draw2D_chair(hw, hh, c);        break;
    case 'dining_table': draw2D_diningTable(hw, hh, c);  break;
    case 'coffee_table': draw2D_coffeeTable(hw, hh, c);  break;
    case 'side_table':   draw2D_sideTable(hw, hh, c);    break;
    case 'bed':          draw2D_bed(hw, hh, c);          break;
    case 'bed_platform': draw2D_bed_platform(hw, hh, c); break;
    case 'bed_upholstered': draw2D_bed_upholstered(hw, hh, c); break;
    case 'bed_canopy':   draw2D_bed_canopy(hw, hh, c);   break;
    case 'bed_bunk':     draw2D_bed_bunk(hw, hh, c);     break;
    case 'bed_daybed':   draw2D_bed_daybed(hw, hh, c);   break;
    case 'wardrobe':     draw2D_wardrobe(hw, hh, c);     break;
    case 'bookshelf':    draw2D_bookshelf(hw, hh, c);    break;
    case 'tv_unit':      draw2D_tvUnit(hw, hh, c);       break;
    case 'desk':         draw2D_desk(hw, hh, c);         break;
    case 'plant':        draw2D_plant(hw, hh, c);        break;
    case 'refrigerator': draw2D_refrigerator(hw, hh, c); break;
    case 'kitchen_counter': draw2D_kitchenCounter(hw, hh, c); break;
    case 'washing_machine': draw2D_washingMachine(hw, hh, c); break;
    case 'floor_lamp':   draw2D_floorLamp(hw, hh, c);    break;
    case 'rug':          draw2D_rug(hw, hh, c);          break;
    default:             draw2D_generic(hw, hh, c);      break;
  }
}

function draw2D_sofa(hw, hh, c) {
  const aw = Math.max(5, hw * 0.16); // armrest width
  const bh = Math.max(6, hh * 0.28); // back height
  // Body
  ctx.fillStyle = c;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 5); ctx.fill();
  // Back strip (top)
  ctx.fillStyle = hexDarken(c, 0.22);
  ctx.fillRect(-hw+aw, -hh, (hw-aw)*2, bh);
  // Armrests
  ctx.fillRect(-hw, -hh, aw, hh*2);
  ctx.fillRect( hw-aw, -hh, aw, hh*2);
  // Seat cushion divider
  ctx.strokeStyle = hexDarken(c, 0.18);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -hh+bh+2); ctx.lineTo(0, hh-3); ctx.stroke();
  // Seat front highlight
  ctx.strokeStyle = hexLighten(c, 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-hw+aw+3, hh-5); ctx.lineTo(hw-aw-3, hh-5); ctx.stroke();
  // Outer border
  ctx.strokeStyle = hexDarken(c, 0.3);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 5); ctx.stroke();
}

function draw2D_armchair(hw, hh, c) {
  const aw = Math.max(4, hw * 0.2);
  const bh = Math.max(5, hh * 0.3);
  ctx.fillStyle = c;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 5); ctx.fill();
  ctx.fillStyle = hexDarken(c, 0.22);
  ctx.fillRect(-hw+aw, -hh, (hw-aw)*2, bh);
  ctx.fillRect(-hw, -hh, aw, hh*2);
  ctx.fillRect(hw-aw, -hh, aw, hh*2);
  // Seat cushion circle
  ctx.strokeStyle = hexDarken(c, 0.15);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, (-hh+bh + hh)/2 + bh*0.1, (hw-aw)*0.72, (hh-bh)*0.6, 0, 0, Math.PI*2);
  ctx.stroke();
  ctx.strokeStyle = hexDarken(c, 0.25);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 5); ctx.stroke();
}

function draw2D_chair(hw, hh, c) {
  const bh = Math.max(4, hh * 0.28);
  ctx.fillStyle = c;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 4); ctx.fill();
  // Back rail
  ctx.fillStyle = hexDarken(c, 0.28);
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, bh, 4); ctx.fill();
  // Seat
  ctx.strokeStyle = hexDarken(c, 0.15);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, (-hh+bh + hh)*0.5, hw*0.68, (hh-bh)*0.62, 0, 0, Math.PI*2);
  ctx.stroke();
  // Leg dots
  const lm = 4;
  ctx.fillStyle = hexDarken(c, 0.4);
  [[-hw+lm, -hh+bh+lm],[hw-lm, -hh+bh+lm],[-hw+lm, hh-lm],[hw-lm, hh-lm]].forEach(([lx,ly]) => {
    ctx.beginPath(); ctx.arc(lx, ly, 2.5, 0, Math.PI*2); ctx.fill();
  });
  ctx.strokeStyle = hexDarken(c, 0.3);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 4); ctx.stroke();
}

function draw2D_diningTable(hw, hh, c) {
  // Oval top
  ctx.fillStyle = hexLighten(c, 0.12);
  ctx.beginPath(); ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI*2); ctx.fill();
  // Wood grain
  ctx.strokeStyle = hexDarken(c, 0.08);
  ctx.lineWidth = 0.7;
  for (let i = -2; i <= 2; i++) {
    const lx = i * hw/3;
    const dy = Math.sqrt(Math.max(0, 1-(lx/hw)**2)) * hh;
    ctx.beginPath(); ctx.moveTo(lx, -dy*0.9); ctx.lineTo(lx, dy*0.9); ctx.stroke();
  }
  // Rim
  ctx.strokeStyle = hexDarken(c, 0.3);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI*2); ctx.stroke();
  // Leg dots
  ctx.fillStyle = hexDarken(c, 0.35);
  [[hw*0.62,hh*0.52],[-hw*0.62,hh*0.52],[hw*0.62,-hh*0.52],[-hw*0.62,-hh*0.52]].forEach(([lx,ly]) => {
    ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI*2); ctx.fill();
  });
}

function draw2D_coffeeTable(hw, hh, c) {
  ctx.fillStyle = hexLighten(c, 0.1);
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 7); ctx.fill();
  // Inset edge detail
  const ins = 5;
  ctx.strokeStyle = hexDarken(c, 0.2);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); roundRect(ctx, -hw+ins, -hh+ins, (hw-ins)*2, (hh-ins)*2, 5); ctx.stroke();
  // Surface grain
  ctx.strokeStyle = hexDarken(c, 0.07);
  ctx.lineWidth = 0.6;
  for (let i = -1; i <= 1; i++) {
    const lx = i * hw * 0.45;
    ctx.beginPath(); ctx.moveTo(lx, -hh+ins+2); ctx.lineTo(lx, hh-ins-2); ctx.stroke();
  }
  ctx.strokeStyle = hexDarken(c, 0.28);
  ctx.lineWidth = 1.8;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 7); ctx.stroke();
}

function draw2D_sideTable(hw, hh, c) {
  const r = Math.min(hw, hh);
  ctx.fillStyle = hexLighten(c, 0.15);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexDarken(c, 0.3);
  ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = hexDarken(c, 0.12);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, r*0.5, 0, Math.PI*2); ctx.stroke();
  // Centre dot
  ctx.fillStyle = hexDarken(c, 0.2);
  ctx.beginPath(); ctx.arc(0, 0, r*0.12, 0, Math.PI*2); ctx.fill();
}

function draw2D_bed(hw, hh, c) {
  const headH = Math.max(8, hh * 0.2);
  const foldY = -hh + headH + (hh*2 - headH) * 0.38;
  // Mattress base
  ctx.fillStyle = hexLighten(c, 0.3);
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 6); ctx.fill();
  // Headboard
  ctx.fillStyle = hexDarken(c, 0.3);
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, headH, 6); ctx.fill();
  // Blanket area
  ctx.fillStyle = hexLighten(c, 0.1);
  ctx.fillRect(-hw+3, foldY, (hw-3)*2, hh-foldY-3);
  // Fold line
  ctx.strokeStyle = hexDarken(c, 0.18);
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-hw+4, foldY); ctx.lineTo(hw-4, foldY); ctx.stroke();
  // Pillows
  const pw = hw*0.36, ph = Math.min(14, (foldY+hh)*0.68);
  const pilY = -hh + headH + 4;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); roundRect(ctx, -hw*0.06-pw, pilY, pw, ph, 3); ctx.fill();
  ctx.beginPath(); roundRect(ctx, hw*0.06,      pilY, pw, ph, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath(); roundRect(ctx, -hw*0.06-pw, pilY, pw, ph, 3); ctx.stroke();
  ctx.beginPath(); roundRect(ctx, hw*0.06,      pilY, pw, ph, 3); ctx.stroke();
  // Outer border
  ctx.strokeStyle = hexDarken(c, 0.3);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 6); ctx.stroke();
}

function draw2D_bed_platform(hw, hh, c) {
  // Low profile frame
  ctx.fillStyle = hexDarken(c, 0.1);
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 5); ctx.fill();
  // Mattress
  ctx.fillStyle = '#E6DED2';
  ctx.beginPath(); roundRect(ctx, -hw*0.92, -hh*0.88, hw*1.84, hh*1.72, 4); ctx.fill();
  // Headboard
  ctx.fillStyle = hexDarken(c, 0.24);
  ctx.fillRect(-hw, -hh, hw*2, hh*0.18);
  // Pillows
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); roundRect(ctx, -hw*0.52, -hh*0.72, hw*0.44, hh*0.24, 3); ctx.fill();
  ctx.beginPath(); roundRect(ctx,  hw*0.08, -hh*0.72, hw*0.44, hh*0.24, 3); ctx.fill();
  // Platform shadow line
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-hw*0.92, hh*0.8); ctx.lineTo(hw*0.92, hh*0.8); ctx.stroke();
}

function draw2D_bed_upholstered(hw, hh, c) {
  draw2D_bed(hw, hh, c);
  // Soft tufted headboard cue
  ctx.fillStyle = hexLighten(c, 0.2);
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*0.26, 8); ctx.fill();
  ctx.strokeStyle = hexDarken(c, 0.22);
  ctx.lineWidth = 1;
  for (let x = -2; x <= 2; x++) {
    const px = x * hw * 0.36;
    ctx.beginPath(); ctx.arc(px, -hh + hh*0.13, 1.8, 0, Math.PI*2); ctx.fillStyle = hexDarken(c,0.28); ctx.fill();
  }
}

function draw2D_bed_canopy(hw, hh, c) {
  draw2D_bed(hw, hh, c);
  // Corner posts and top rail hint
  ctx.strokeStyle = hexDarken(c, 0.38);
  ctx.lineWidth = 2;
  [[-hw*0.94,-hh*0.94],[hw*0.94,-hh*0.94],[-hw*0.94,hh*0.94],[hw*0.94,hh*0.94]].forEach(([x,y]) => {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y*0.35); ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(-hw*0.94, -hh*0.94);
  ctx.lineTo(hw*0.94, -hh*0.94);
  ctx.stroke();
}

function draw2D_bed_bunk(hw, hh, c) {
  // Two stacked mattresses from top view (split left/right)
  ctx.fillStyle = hexDarken(c, 0.18);
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 4); ctx.fill();
  // Upper / lower bunks hints
  ctx.fillStyle = '#E5DDD0';
  ctx.beginPath(); roundRect(ctx, -hw*0.95, -hh*0.9, hw*1.9, hh*0.75, 3); ctx.fill();
  ctx.beginPath(); roundRect(ctx, -hw*0.95, hh*0.15, hw*1.9, hh*0.75, 3); ctx.fill();
  // Ladder rungs
  ctx.strokeStyle = hexDarken(c, 0.35);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(hw*0.75, -hh*0.12); ctx.lineTo(hw*0.75, hh*0.9); ctx.stroke();
  [-0.05,0.25,0.55].forEach(r => {
    const y = -hh + (hh*2)*r;
    ctx.beginPath(); ctx.moveTo(hw*0.62, y); ctx.lineTo(hw*0.88, y); ctx.stroke();
  });
}

function draw2D_bed_daybed(hw, hh, c) {
  // Sofa-bed style
  ctx.fillStyle = c;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 5); ctx.fill();
  // Back and side arms
  ctx.fillStyle = hexDarken(c, 0.22);
  ctx.fillRect(-hw, -hh, hw*2, hh*0.2);
  ctx.fillRect(-hw, -hh, hw*0.12, hh*2);
  ctx.fillRect(hw*0.88, -hh, hw*0.12, hh*2);
  // Mattress and cushions
  ctx.fillStyle = '#E7DFD2';
  ctx.beginPath(); roundRect(ctx, -hw*0.82, -hh*0.28, hw*1.64, hh*1.08, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.beginPath(); roundRect(ctx, -hw*0.56, -hh*0.7, hw*0.48, hh*0.24, 3); ctx.fill();
  ctx.beginPath(); roundRect(ctx, hw*0.08, -hh*0.7, hw*0.48, hh*0.24, 3); ctx.fill();
}

function draw2D_wardrobe(hw, hh, c) {
  ctx.fillStyle = c;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 3); ctx.fill();
  // Centre split line
  ctx.strokeStyle = hexDarken(c, 0.35);
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(0, -hh+3); ctx.lineTo(0, hh-3); ctx.stroke();
  // Door panel lines
  ctx.strokeStyle = hexDarken(c, 0.18);
  ctx.lineWidth = 0.8;
  ctx.beginPath(); roundRect(ctx, -hw+4, -hh+4, hw-6, hh*2-8, 2); ctx.stroke();
  ctx.beginPath(); roundRect(ctx, 2, -hh+4, hw-6, hh*2-8, 2); ctx.stroke();
  // Handles
  ctx.fillStyle = hexDarken(c, 0.45);
  ctx.beginPath(); ctx.arc(-hw*0.3, 0, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( hw*0.3, 0, 3, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexDarken(c, 0.3);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 3); ctx.stroke();
}

function draw2D_bookshelf(hw, hh, c) {
  ctx.fillStyle = c;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 3); ctx.fill();
  // Shelf dividers
  ctx.strokeStyle = hexDarken(c, 0.3);
  ctx.lineWidth = 1.2;
  const sections = 3;
  for (let i = 1; i < sections; i++) {
    const sy = -hh + (hh*2/sections)*i;
    ctx.beginPath(); ctx.moveTo(-hw+3, sy); ctx.lineTo(hw-3, sy); ctx.stroke();
  }
  // Books (coloured spines)
  const bookColours = ['#C0392B','#2980B9','#27AE60','#F39C12','#8E44AD','#E67E22','#1ABC9C'];
  let bx = -hw + 5;
  for (let row = 0; row < sections; row++) {
    const rowTop = -hh + (hh*2/sections)*row + 3;
    const rowH   = hh*2/sections - 6;
    bx = -hw + 5;
    bookColours.forEach((bc, i) => {
      const bw = Math.max(4, hw*0.12 + (i%3)*2);
      if (bx + bw > hw - 4) return;
      ctx.fillStyle = bc;
      ctx.fillRect(bx, rowTop, bw, rowH);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, rowTop, bw, rowH);
      bx += bw + 1.5;
    });
  }
  ctx.strokeStyle = hexDarken(c, 0.35);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 3); ctx.stroke();
}

function draw2D_tvUnit(hw, hh, c) {
  ctx.fillStyle = c;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 4); ctx.fill();
  // Screen cutout (dark)
  const sw = hw*0.72, sh = hh*0.52;
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath(); roundRect(ctx, -sw, -sh, sw*2, sh*2, 3); ctx.fill();
  // Screen reflection
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath(); roundRect(ctx, -sw+3, -sh+3, sw*0.6, sh*0.5, 2); ctx.fill();
  ctx.strokeStyle = hexDarken(c, 0.4);
  ctx.lineWidth = 1;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 4); ctx.stroke();
}

function draw2D_desk(hw, hh, c) {
  ctx.fillStyle = hexLighten(c, 0.08);
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 4); ctx.fill();
  // Wood grain
  ctx.strokeStyle = hexDarken(c, 0.07);
  ctx.lineWidth = 0.6;
  for (let i = -2; i <= 2; i++) {
    const lx = i * hw*0.4;
    ctx.beginPath(); ctx.moveTo(lx, -hh+4); ctx.lineTo(lx, hh-4); ctx.stroke();
  }
  // Monitor at back edge
  const mw = Math.min(hw*0.7, 35), mh = Math.min(hh*0.35, 10);
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath(); roundRect(ctx, -mw, -hh+3, mw*2, mh, 2); ctx.fill();
  ctx.fillStyle = 'rgba(100,140,255,0.15)';
  ctx.beginPath(); roundRect(ctx, -mw+2, -hh+5, mw*2-4, mh-4, 1); ctx.fill();
  // Keyboard hint
  ctx.fillStyle = hexDarken(c, 0.2);
  ctx.beginPath(); roundRect(ctx, -hw*0.4, hh*0.1, hw*0.8, hh*0.25, 2); ctx.fill();
  ctx.strokeStyle = hexDarken(c, 0.28);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 4); ctx.stroke();
}

function draw2D_plant(hw, hh, c) {
  const r = Math.min(hw, hh);
  // Pot
  ctx.fillStyle = '#A0826D';
  ctx.beginPath();
  ctx.ellipse(0, r*0.28, r*0.42, r*0.26, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = '#7B5E42'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, r*0.28, r*0.42, r*0.26, 0, 0, Math.PI*2);
  ctx.stroke();
  // Leaves (5 overlapping ellipses)
  const leafC = c || '#5A8A5A';
  for (let i = 0; i < 5; i++) {
    const ang = (i/5)*Math.PI*2 - Math.PI/2;
    const lx = Math.cos(ang)*r*0.38, ly = Math.sin(ang)*r*0.38 - r*0.15;
    ctx.fillStyle = i%2===0 ? leafC : hexDarken(leafC, 0.15);
    ctx.beginPath();
    ctx.ellipse(lx, ly, r*0.36, r*0.24, ang, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = hexDarken(leafC, 0.25); ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  // Centre bud
  ctx.fillStyle = hexDarken(leafC, 0.1);
  ctx.beginPath(); ctx.arc(0, -r*0.18, r*0.16, 0, Math.PI*2); ctx.fill();
}

function draw2D_refrigerator(hw, hh, c) {
  ctx.fillStyle = hexLighten(c, 0.1);
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 4); ctx.fill();
  ctx.strokeStyle = hexDarken(c, 0.28);
  ctx.lineWidth = 1.4;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 4); ctx.stroke();
  // Freezer separator
  ctx.strokeStyle = hexDarken(c, 0.22);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-hw+3, -hh + hh*0.55); ctx.lineTo(hw-3, -hh + hh*0.55); ctx.stroke();
  // Handles
  ctx.fillStyle = '#8C949D';
  ctx.fillRect(hw*0.55, -hh*0.74, 3, hh*0.33);
  ctx.fillRect(hw*0.55, -hh*0.05, 3, hh*0.6);
}

function draw2D_kitchenCounter(hw, hh, c) {
  ctx.fillStyle = c;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 4); ctx.fill();
  // Counter top band
  ctx.fillStyle = hexDarken(c, 0.26);
  ctx.fillRect(-hw, -hh, hw*2, hh*0.22);
  // Sink basin
  ctx.fillStyle = '#D0D6DE';
  ctx.beginPath(); roundRect(ctx, -hw*0.62, -hh*0.36, hw*0.52, hh*0.46, 3); ctx.fill();
  ctx.strokeStyle = '#9AA4B1';
  ctx.lineWidth = 1;
  ctx.beginPath(); roundRect(ctx, -hw*0.62, -hh*0.36, hw*0.52, hh*0.46, 3); ctx.stroke();
  // Hob circles
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1.1;
  [-0.1, 0.18].forEach(off => {
    ctx.beginPath(); ctx.arc(hw*off, -hh*0.13, hh*0.12, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(hw*off + hh*0.24, -hh*0.13, hh*0.12, 0, Math.PI*2); ctx.stroke();
  });
}

function draw2D_washingMachine(hw, hh, c) {
  ctx.fillStyle = hexLighten(c, 0.08);
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 4); ctx.fill();
  ctx.strokeStyle = hexDarken(c, 0.3);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 4); ctx.stroke();
  // Drum
  const r = Math.min(hw, hh) * 0.46;
  ctx.fillStyle = '#AFC3D9';
  ctx.beginPath(); ctx.arc(0, hh*0.08, r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#6F879F';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, hh*0.08, r, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.arc(-r*0.26, hh*0.08-r*0.22, r*0.32, 0, Math.PI*2); ctx.fill();
  // Control bar
  ctx.fillStyle = '#939EAA';
  ctx.fillRect(-hw*0.68, -hh*0.78, hw*1.36, hh*0.2);
}

function draw2D_floorLamp(hw, hh, c) {
  const r = Math.min(hw, hh);
  // Base
  ctx.fillStyle = '#6D5A45';
  ctx.beginPath(); ctx.ellipse(0, r*0.55, r*0.42, r*0.24, 0, 0, Math.PI*2); ctx.fill();
  // Pole
  ctx.fillStyle = '#9D8A70';
  ctx.fillRect(-2, -r*0.48, 4, r*1.05);
  // Shade
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(-r*0.42, -r*0.28);
  ctx.lineTo(r*0.42, -r*0.28);
  ctx.lineTo(r*0.25, r*0.02);
  ctx.lineTo(-r*0.25, r*0.02);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexDarken(c, 0.24);
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function draw2D_rug(hw, hh, c) {
  ctx.fillStyle = hexLighten(c, 0.06);
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 6); ctx.fill();
  ctx.strokeStyle = hexDarken(c, 0.25);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); roundRect(ctx, -hw+3, -hh+3, hw*2-6, hh*2-6, 4); ctx.stroke();
  // Pattern lines
  ctx.strokeStyle = hexLighten(c, 0.25);
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    const y = i * hh * 0.3;
    ctx.beginPath(); ctx.moveTo(-hw+6, y); ctx.lineTo(hw-6, y); ctx.stroke();
  }
}

function draw2D_generic(hw, hh, c) {
  ctx.fillStyle = c;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 5); ctx.fill();
  ctx.strokeStyle = hexDarken(c, 0.3);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); roundRect(ctx, -hw, -hh, hw*2, hh*2, 5); ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawDimensions(rx, ry, rw, rh) {
  ctx.font      = '600 11px DM Sans, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Width label (bottom)
  ctx.fillText(`${state.room.width.toFixed(1)} m`, rx + rw / 2, ry + rh + 18);
  // Height label (right)
  ctx.save();
  ctx.translate(rx + rw + 18, ry + rh / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(`${state.room.height.toFixed(1)} m`, 0, 0);
  ctx.restore();

  // Scale bar
  const barPx = SCALE;  // = 1 m
  const bx = rx + 12, by = ry + rh - 14;
  ctx.fillStyle   = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx, by, barPx, 4);
  ctx.fillStyle   = 'rgba(255,255,255,0.5)';
  ctx.font        = '9px DM Sans, sans-serif';
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('1 m', bx, by - 2);
}

function drawLegend(cw, ch) {
  ctx.fillStyle   = 'rgba(255,255,255,0.3)';
  ctx.font        = '10px DM Sans, sans-serif';
  ctx.textAlign   = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Click library items to add  •  Drag to move  •  Drag corners to resize  •  R to rotate', cw - 14, ch - 10);
}

/* ══════════════════════════════════════
   ROOM PANEL
══════════════════════════════════════ */
function applyRoomToPanel() {
  const set = (id, val) => { const e = $id(id); if (e) e.value = val; };
  set('roomWidth',  state.room.width);
  set('roomHeight', state.room.height);
  set('roomColor',  state.room.color);
  const sh = $id('roomShape'); if (sh) sh.value = state.room.shape;
}

function updateRoom() {
  const get = (id, fallback) => { const e = $id(id); return e ? e.value : fallback; };
  state.room.width  = Math.max(1, Math.min(20, parseFloat(get('roomWidth',  '5')) || 5));
  state.room.height = Math.max(1, Math.min(20, parseFloat(get('roomHeight', '4')) || 4));
  state.room.color  = get('roomColor', '#F5E6D3');
  state.room.shape  = get('roomShape', 'rectangle');
  render();
  state.dirty = true;
}

/* ══════════════════════════════════════
   PROPERTIES PANEL
══════════════════════════════════════ */
function updatePropertiesPanel() {
  const emptyEl    = $id('emptySelection');
  const selectedEl = $id('selectedPanel');
  if (!emptyEl || !selectedEl) return;

  if (!state.selected) {
    emptyEl.classList.remove('hidden');
    selectedEl.classList.add('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  selectedEl.classList.remove('hidden');

  const item = state.selected;
  const set = (id, prop, val) => { const e = $id(id); if (e) e[prop] = val; };
  set('selectedName',  'textContent', item.label);
  set('furColor',      'value',       item.color);
  set('furShading',    'value',       item.shading || 0);
  set('furShadingVal', 'textContent', Math.round((item.shading || 0) * 100) + '%');
  set('furWidth',      'value',       item.w.toFixed(2));
  set('furHeight',     'value',       item.h.toFixed(2));
  set('furRotation',   'textContent', `${item.rotation || 0}°`);
}

/* ══════════════════════════════════════
   SELECTION HELPERS
══════════════════════════════════════ */
function selectItem(item) {
  state.selected = item;
  updatePropertiesPanel();
}

function deselect() {
  state.selected = null;
  updatePropertiesPanel();
}

/* ══════════════════════════════════════
   TOOLBAR ACTIONS
══════════════════════════════════════ */
function deleteSelected() {
  if (!state.selected) return;
  const label = state.selected.label;
  state.furniture = state.furniture.filter(f => f.id !== state.selected.id);
  deselect();
  pushHistory();
  render();
  showToast(`${label} removed`);
  state.dirty = true;
}

function rotateSelected() {
  if (!state.selected) return;
  state.selected.rotation = ((state.selected.rotation || 0) + 90) % 360;
  // Swap w/h every 90 degrees for axis-aligned approximation
  if (state.selected.rotation % 180 !== 0) {
    [state.selected.w, state.selected.h] = [state.selected.h, state.selected.w];
  }
  const rotEl = $id('furRotation');
  if (rotEl) rotEl.textContent = `${state.selected.rotation}°`;
  pushHistory();
  render();
  state.dirty = true;
}

function bringFront() {
  if (!state.selected) return;
  const idx = state.furniture.findIndex(f => f.id === state.selected.id);
  if (idx !== -1 && idx < state.furniture.length - 1) {
    const [item] = state.furniture.splice(idx, 1);
    state.furniture.push(item);
    render();
  }
}

function clearAll() {
  if (state.furniture.length === 0) return;
  if (!confirm('Remove all furniture from this design?')) return;
  state.furniture = [];
  deselect();
  pushHistory();
  render();
  showToast('Canvas cleared');
  state.dirty = true;
}

/* ══════════════════════════════════════
   UNDO / HISTORY
══════════════════════════════════════ */
function pushHistory() {
  const snapshot = JSON.stringify({ furniture: state.furniture, room: state.room });
  state.history = state.history.slice(0, state.historyIdx + 1);
  state.history.push(snapshot);
  if (state.history.length > 50) state.history.shift();
  state.historyIdx = state.history.length - 1;
}

function undo() {
  if (state.historyIdx <= 0) { showToast('Nothing to undo'); return; }
  state.historyIdx--;
  const snap = JSON.parse(state.history[state.historyIdx]);
  state.furniture = snap.furniture;
  state.room      = snap.room;
  deselect();
  applyRoomToPanel();
  render();
  showToast('Undone');
}

/* ══════════════════════════════════════
   SAVE
══════════════════════════════════════ */
async function saveDesign() {
  const btn = $id('saveBtn');
  if (btn) { btn.textContent = '⏳ Saving...'; btn.disabled = true; }
  try {
    const payload = {
      name:      state.designName,
      status:    state.status || 'in_progress',
      room:      state.room,
      furniture: state.furniture,
    };
    let saved;
    if (state.designId) {
      saved = await API.saveDesign(state.designId, payload);
    } else {
      saved = await API.createDesign({ ...payload, userId: state.userId });
    }
    state.designId = saved.id;
    state.dirty    = false;
    history.replaceState({}, '', 'designer.html?id=' + saved.id);
    showToast('Design saved ✓');
  } catch(err) {
    showToast('Save failed: ' + err.message);
  } finally {
    if (btn) { btn.textContent = '💾 Save'; btn.disabled = false; }
  }
}

/* ══════════════════════════════════════
   VIEW SWITCH
══════════════════════════════════════ */
function switchView(mode) {
  const b2 = $id('view2d'); if (b2) b2.classList.toggle('active', mode === '2d');
  const b3 = $id('view3d'); if (b3) b3.classList.toggle('active', mode === '3d');
}

/* ══════════════════════════════════════
   3D VISUALIZATION — Three.js
══════════════════════════════════════ */
async function show3D() {
  showToast('Some elements may take a moment to display.', 4000);
  try {
    await ensure3DDependencies();
  } catch (err) {
    showToast('3D viewer failed to load. Check your connection and try again.');
    return;
  }

  const THREE = window.THREE;
  if (!THREE) {
    showToast('3D engine is unavailable.');
    return;
  }

  const modal = $id('modal3d');
  if (!modal) return;
  modal.classList.remove('hidden');
  switchView('3d');

  // Cleanup previous
  if (animId)    cancelAnimationFrame(animId);
  if (renderer3d) { renderer3d.dispose(); renderer3d = null; }
  const container = $id('canvas3d');
  if (!container) return;
  container.innerHTML = '';

  const W = container.clientWidth, H = container.clientHeight;
  const rw = state.room.width, rh = state.room.height;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1A2030);
  scene.fog = new THREE.Fog(0x1A2030, 12, 28);

  // Camera
  const camera = new THREE.PerspectiveCamera(55, W / H, 0.01, 100);
  camera.position.set(rw / 2, rh * 0.85, rh * 1.35);
  camera.lookAt(rw / 2, 0.5, rh / 2);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);
  renderer3d = renderer;

  // Lighting
  const ambLight = new THREE.AmbientLight(0xFFF5E6, 0.45);
  scene.add(ambLight);

  const sunLight = new THREE.DirectionalLight(0xFFF0D8, 1.2);
  sunLight.position.set(rw * 0.7, 3.5, rh * 0.3);
  sunLight.castShadow = true;
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far  = 20;
  sunLight.shadow.camera.left = -rw; sunLight.shadow.camera.right = rw;
  sunLight.shadow.camera.top  =  rh; sunLight.shadow.camera.bottom = -rh;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.bias = -0.002;
  scene.add(sunLight);

  // Warm fill light
  const fillLight = new THREE.PointLight(0xC9975A, 0.5, rw * 3);
  fillLight.position.set(rw, 2.0, rh);
  scene.add(fillLight);

  // ── Floor ──
  const floorColor = hexToThree(state.room.color);
  const floorGeo   = new THREE.PlaneGeometry(rw, rh);
  const floorMat   = new THREE.MeshLambertMaterial({ color: floorColor });
  const floor       = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x  = -Math.PI / 2;
  floor.position.set(rw / 2, 0, rh / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  // ── Walls ──
  const wallH   = 2.8;
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xF0EBE3, side: THREE.FrontSide });

  const makeWall = (w, h, rx, ry, rz, px, py, pz) => {
    const geo  = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(geo, wallMat.clone());
    mesh.rotation.set(rx, ry, rz);
    mesh.position.set(px, py, pz);
    mesh.receiveShadow = true;
    scene.add(mesh);
  };

  makeWall(rw, wallH, 0,              0,            0, rw/2,  wallH/2, 0    ); // back
  makeWall(rh, wallH, 0, -Math.PI/2,  0, 0,      wallH/2, rh/2  ); // left
  // right wall slightly transparent hint
  makeWall(rw, wallH, 0,  Math.PI,    0, rw/2,  wallH/2, rh   ); // front (facing camera, transparent)

  // Ceiling (faint)
  const ceilGeo = new THREE.PlaneGeometry(rw, rh);
  const ceilMat = new THREE.MeshLambertMaterial({ color: 0xF8F5F0, transparent: true, opacity: 0.15 });
  const ceil    = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(rw / 2, wallH, rh / 2);
  scene.add(ceil);

  // ── Furniture — delegated to procedural module (GLB integration will hook here) ──
  const glb3D = window.DesignerThreeGLB;
  const procedural3D = window.DesignerThreeProcedural;
  for (const item of state.furniture) {
    let group = null;
    if (glb3D && typeof glb3D.createFurnitureGroup === "function") {
      group = await glb3D.createFurnitureGroup(THREE, item);
    }
    if (procedural3D && typeof procedural3D.buildFurnitureGroup === "function") {
      group = group || procedural3D.buildFurnitureGroup(THREE, item);
    }
    if (!group) {
      group = new THREE.Group();
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(item.w, 0.75, item.h),
        new THREE.MeshLambertMaterial({ color: parseInt((item.color || "#888888").replace("#", ""), 16) })
      );
      fallback.castShadow = fallback.receiveShadow = true;
      fallback.position.set(0, 0.375, 0);
      group.add(fallback);
    }
    group.position.set(item.x + item.w / 2, 0, item.y + item.h / 2);
    group.rotation.y = -(item.rotation || 0) * Math.PI / 180;
    scene.add(group);
  }

  // ── Orbit Controls ──
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(rw / 2, 0.5, rh / 2);
  controls.minDistance = 1;
  controls.maxDistance = rw * 3;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.update();

  // Resize handler
  const onResize3d = () => {
    const nw = container.clientWidth, nh = container.clientHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  };
  window.addEventListener('resize', onResize3d);

  // Animation loop
  function animate() {
    animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

function close3D() {
  const m = $id('modal3d'); if (m) m.classList.add('hidden');
  switchView('2d');
  if (animId)    cancelAnimationFrame(animId);
  if (renderer3d) { renderer3d.dispose(); renderer3d = null; }
  const c = $id('canvas3d'); if (c) c.innerHTML = '';
}

function hexToThree(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

/* ══════════════════════════════════════
   TOAST
══════════════════════════════════════ */
function showToast(msg, durationMs = 2500) {
  const t = $id('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), durationMs);
}
