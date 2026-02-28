(function () {
  function mat3d(THREE, hexColor, shade, lighten) {
    shade = shade || 0;
    lighten = lighten || 0;
    const n = parseInt((hexColor || '#888').replace('#', ''), 16);
    let r = ((n >> 16) & 0xff) / 255;
    let g = ((n >> 8) & 0xff) / 255;
    let b = (n & 0xff) / 255;
    r = Math.min(1, r + (1 - r) * lighten);
    g = Math.min(1, g + (1 - g) * lighten);
    b = Math.min(1, b + (1 - b) * lighten);
    r *= (1 - shade * 0.6);
    g *= (1 - shade * 0.6);
    b *= (1 - shade * 0.6);
    const mat = new THREE.MeshLambertMaterial();
    mat.color.setRGB(Math.max(0, r), Math.max(0, g), Math.max(0, b));
    return mat;
  }

  function tintHex(hexColor, factor) {
    const n = parseInt((hexColor || '#888888').replace('#', ''), 16);
    let r = (n >> 16) & 0xff;
    let g = (n >> 8) & 0xff;
    let b = n & 0xff;
    if (factor >= 0) {
      r = Math.round(r + (255 - r) * factor);
      g = Math.round(g + (255 - g) * factor);
      b = Math.round(b + (255 - b) * factor);
    } else {
      const f = 1 + factor;
      r = Math.round(r * f);
      g = Math.round(g * f);
      b = Math.round(b * f);
    }
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  }

  function makeShapeHelpers(THREE) {
    function box(w, h, d, col, shade, lit) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat3d(THREE, col, shade, lit));
      m.castShadow = m.receiveShadow = true;
      return m;
    }
    function cyl(rt, rb, h, seg, col, shade, lit) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 8), mat3d(THREE, col, shade, lit));
      m.castShadow = m.receiveShadow = true;
      return m;
    }
    function sph(r, seg, col, shade, lit) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg || 10, 8), mat3d(THREE, col, shade, lit));
      m.castShadow = m.receiveShadow = true;
      return m;
    }
    function pos(mesh, x, y, z) {
      mesh.position.set(x, y, z);
      return mesh;
    }
    return { box, cyl, sph, pos };
  }

  function buildFurnitureGroup(THREE, item) {
    const { box, cyl, sph, pos } = makeShapeHelpers(THREE);
    const g = new THREE.Group();
    const w = item.w;
    const d = item.h;
    const s = item.shading || 0;
    const c = item.color;

    function buildSofa() {
      g.add(pos(box(w * 0.9, 0.12, d * 0.9, c, s, -0.12), 0, 0.06, 0));
      g.add(pos(box(w * 0.36, 0.2, d * 0.55, c, s, 0.06), -w * 0.2, 0.28, d * 0.1));
      g.add(pos(box(w * 0.36, 0.2, d * 0.55, c, s, 0.06), w * 0.2, 0.28, d * 0.1));
      g.add(pos(box(w * 0.88, 0.48, d * 0.14, c, s, -0.08), 0, 0.52, -d * 0.38));
      g.add(pos(box(w * 0.36, 0.36, d * 0.12, c, s, 0.1), -w * 0.2, 0.55, -d * 0.3));
      g.add(pos(box(w * 0.36, 0.36, d * 0.12, c, s, 0.1), w * 0.2, 0.55, -d * 0.3));
      g.add(pos(box(w * 0.1, 0.52, d * 0.9, c, s, -0.06), -w * 0.44, 0.32, 0));
      g.add(pos(box(w * 0.1, 0.52, d * 0.9, c, s, -0.06), w * 0.44, 0.32, 0));
      const legC = '#5C4033';
      [[-w * 0.38, d * 0.38], [w * 0.38, d * 0.38], [-w * 0.38, -d * 0.38], [w * 0.38, -d * 0.38]].forEach(([lx, lz]) => {
        g.add(pos(box(0.06, 0.08, 0.06, legC, s, 0), lx, 0.04, lz));
      });
    }

    function buildArmchair() {
      g.add(pos(box(w * 0.88, 0.1, d * 0.88, c, s, -0.12), 0, 0.05, 0));
      g.add(pos(box(w * 0.7, 0.2, d * 0.56, c, s, 0.08), 0, 0.25, d * 0.1));
      g.add(pos(box(w * 0.7, 0.46, d * 0.13, c, s, -0.08), 0, 0.47, -d * 0.36));
      g.add(pos(box(w * 0.7, 0.34, d * 0.12, c, s, 0.1), 0, 0.55, -d * 0.29));
      g.add(pos(box(w * 0.12, 0.4, d * 0.88, c, s, -0.06), -w * 0.42, 0.3, 0));
      g.add(pos(box(w * 0.12, 0.4, d * 0.88, c, s, -0.06), w * 0.42, 0.3, 0));
      const legC = '#5C4033';
      [[-w * 0.34, d * 0.34], [w * 0.34, d * 0.34], [-w * 0.34, -d * 0.34], [w * 0.34, -d * 0.34]].forEach(([lx, lz]) => {
        g.add(pos(box(0.05, 0.08, 0.05, legC, s, 0), lx, 0.04, lz));
      });
    }

    function buildChair() {
      g.add(pos(box(w * 0.85, 0.06, d * 0.85, c, s, 0.05), 0, 0.46, 0));
      g.add(pos(box(w * 0.82, 0.06, 0.05, c, s, -0.05), 0, 0.78, -d * 0.41));
      g.add(pos(box(w * 0.82, 0.06, 0.05, c, s, -0.05), 0, 0.95, -d * 0.41));
      g.add(pos(box(0.04, 0.55, 0.04, c, s, -0.15), -w * 0.36, 0.72, -d * 0.41));
      g.add(pos(box(0.04, 0.55, 0.04, c, s, -0.15), w * 0.36, 0.72, -d * 0.41));
      const legH = 0.44, lr = 0.025;
      [[-w * 0.36, d * 0.36], [w * 0.36, d * 0.36], [-w * 0.36, -d * 0.41], [w * 0.36, -d * 0.41]].forEach(([lx, lz]) => {
        g.add(pos(cyl(lr, lr, legH, 6, c, s, -0.2), lx, legH / 2, lz));
      });
    }

    function buildDiningTable() {
      g.add(pos(box(w, 0.05, d, c, s, 0.18), 0, 0.76, 0));
      [[-w * 0.42, d * 0.38], [w * 0.42, d * 0.38], [-w * 0.42, -d * 0.38], [w * 0.42, -d * 0.38]].forEach(([lx, lz]) => {
        g.add(pos(cyl(0.035, 0.045, 0.72, 8, c, s, -0.1), lx, 0.36, lz));
      });
    }

    function buildCoffeeTable() {
      g.add(pos(box(w, 0.05, d, c, s, 0.18), 0, 0.44, 0));
      g.add(pos(box(w * 0.7, 0.04, d * 0.7, c, s, -0.05), 0, 0.2, 0));
      const legH = 0.38, ls = 0.04;
      [[-w * 0.42, d * 0.36], [w * 0.42, d * 0.36], [-w * 0.42, -d * 0.36], [w * 0.42, -d * 0.36]].forEach(([lx, lz]) => {
        g.add(pos(box(ls, legH, ls, c, s, -0.18), lx, legH / 2, lz));
      });
    }

    function buildSideTable() {
      const r = Math.min(w, d) * 0.42;
      g.add(pos(cyl(r, r, 0.05, 16, c, s, 0.2), 0, 0.55, 0));
      g.add(pos(cyl(0.04, 0.04, 0.5, 8, c, s, -0.1), 0, 0.25, 0));
      g.add(pos(cyl(r * 0.55, r * 0.55, 0.04, 16, c, s, -0.05), 0, 0.02, 0));
    }

    function buildBedStandard() {
      g.add(pos(box(w, 0.18, d, '#7B5E42', s, -0.08), 0, 0.09, 0));
      g.add(pos(box(w * 0.92, 0.22, d * 0.82, '#E0D8CC', s * 0.3, 0.12), 0, 0.31, d * 0.04));
      g.add(pos(box(w, 0.62, 0.1, '#7B5E42', s, -0.04), 0, 0.4, -d * 0.46));
      g.add(pos(box(w, 0.28, 0.08, '#7B5E42', s, -0.08), 0, 0.27, d * 0.46));
      g.add(pos(box(w * 0.34, 0.1, d * 0.19, '#F5F0EB', s * 0.2, 0.2), -w * 0.22, 0.47, -d * 0.24));
      g.add(pos(box(w * 0.34, 0.1, d * 0.19, '#F5F0EB', s * 0.2, 0.2), w * 0.22, 0.47, -d * 0.24));
      g.add(pos(box(w * 0.9, 0.07, d * 0.52, c, s, 0.08), 0, 0.46, d * 0.14));
    }

    function buildBedPlatform() {
      g.add(pos(box(w, 0.12, d, tintHex(c, -0.18), s, -0.06), 0, 0.06, 0));
      g.add(pos(box(w * 0.96, 0.22, d * 0.84, '#E2DBCF', s * 0.2, 0.14), 0, 0.23, d * 0.03));
      g.add(pos(box(w, 0.44, d * 0.09, tintHex(c, -0.2), s, -0.04), 0, 0.34, -d * 0.455));
      g.add(pos(box(w * 0.34, 0.08, d * 0.18, '#F5F0EB', s * 0.1, 0.22), -w * 0.22, 0.38, -d * 0.24));
      g.add(pos(box(w * 0.34, 0.08, d * 0.18, '#F5F0EB', s * 0.1, 0.22), w * 0.22, 0.38, -d * 0.24));
      g.add(pos(box(w * 0.88, 0.06, d * 0.45, tintHex(c, 0.1), s, 0.08), 0, 0.36, d * 0.12));
    }

    function buildBedUpholstered() {
      g.add(pos(box(w, 0.2, d, '#786250', s, -0.08), 0, 0.1, 0));
      g.add(pos(box(w * 0.94, 0.24, d * 0.84, '#E3DCCF', s * 0.2, 0.16), 0, 0.33, d * 0.03));
      g.add(pos(box(w * 1.02, 0.72, d * 0.11, c, s, 0.12), 0, 0.56, -d * 0.47));
      g.add(pos(box(w * 0.94, 0.56, d * 0.06, tintHex(c, 0.18), s, 0.2), 0, 0.58, -d * 0.5));
      [-0.3, -0.1, 0.1, 0.3].forEach(x => {
        g.add(pos(sph(0.018, 10, tintHex(c, -0.2), s, 0), w * x, 0.58, -d * 0.47));
      });
      g.add(pos(box(w * 0.36, 0.1, d * 0.18, '#F5F0EB', s * 0.1, 0.2), -w * 0.22, 0.45, -d * 0.24));
      g.add(pos(box(w * 0.36, 0.1, d * 0.18, '#F5F0EB', s * 0.1, 0.2), w * 0.22, 0.45, -d * 0.24));
      g.add(pos(box(w * 0.9, 0.08, d * 0.56, tintHex(c, 0.08), s, 0.1), 0, 0.44, d * 0.12));
    }

    function buildBedCanopy() {
      buildBedPlatform();
      const postC = tintHex(c, -0.28);
      const postH = 1.95;
      const px = w * 0.46, pz = d * 0.43;
      [[-px, -pz], [px, -pz], [-px, pz], [px, pz]].forEach(([x, z]) => {
        g.add(pos(box(0.06, postH, 0.06, postC, s, -0.1), x, postH / 2, z));
      });
      g.add(pos(box(w * 0.98, 0.05, 0.06, postC, s, -0.06), 0, postH, pz));
      g.add(pos(box(w * 0.98, 0.05, 0.06, postC, s, -0.06), 0, postH, -pz));
      g.add(pos(box(0.06, 0.05, d * 0.92, postC, s, -0.06), px, postH, 0));
      g.add(pos(box(0.06, 0.05, d * 0.92, postC, s, -0.06), -px, postH, 0));
    }

    function buildBedBunk() {
      g.add(pos(box(w, 0.12, d, tintHex(c, -0.2), s, -0.08), 0, 0.06, 0));
      g.add(pos(box(w * 0.92, 0.16, d * 0.84, '#E2DBCF', s * 0.2, 0.15), 0, 0.2, 0));
      g.add(pos(box(w, 0.12, d, tintHex(c, -0.18), s, -0.08), 0, 1.08, 0));
      g.add(pos(box(w * 0.92, 0.16, d * 0.84, '#DDD5C8', s * 0.2, 0.1), 0, 1.22, 0));
      const postH = 1.85;
      [[-w * 0.46, -d * 0.43], [w * 0.46, -d * 0.43], [-w * 0.46, d * 0.43], [w * 0.46, d * 0.43]].forEach(([x, z]) => {
        g.add(pos(box(0.06, postH, 0.06, tintHex(c, -0.3), s, -0.1), x, postH / 2, z));
      });
      g.add(pos(box(w * 0.9, 0.12, 0.04, tintHex(c, -0.32), s, -0.1), 0, 1.45, d * 0.42));
      g.add(pos(box(0.04, 1.45, 0.04, tintHex(c, -0.35), s, -0.1), w * 0.48, 0.72, d * 0.22));
      g.add(pos(box(0.04, 1.45, 0.04, tintHex(c, -0.35), s, -0.1), w * 0.48, 0.72, -d * 0.05));
      [0.2, 0.45, 0.7, 0.95, 1.2].forEach(y => {
        g.add(pos(box(0.04, 0.03, d * 0.3, tintHex(c, -0.32), s, -0.08), w * 0.48, y, d * 0.08));
      });
    }

    function buildBedDaybed() {
      g.add(pos(box(w, 0.18, d, tintHex(c, -0.16), s, -0.08), 0, 0.09, 0));
      g.add(pos(box(w * 0.9, 0.18, d * 0.78, '#E3DBCE', s * 0.2, 0.16), 0, 0.27, d * 0.02));
      g.add(pos(box(w * 0.92, 0.42, d * 0.08, c, s, 0.08), 0, 0.45, -d * 0.44));
      g.add(pos(box(w * 0.08, 0.42, d * 0.9, c, s, 0.08), -w * 0.46, 0.45, 0));
      g.add(pos(box(w * 0.08, 0.42, d * 0.9, c, s, 0.08), w * 0.46, 0.45, 0));
      g.add(pos(box(w * 0.34, 0.12, d * 0.15, '#F5F1EA', s * 0.1, 0.2), -w * 0.22, 0.42, -d * 0.24));
      g.add(pos(box(w * 0.34, 0.12, d * 0.15, '#F5F1EA', s * 0.1, 0.2), w * 0.22, 0.42, -d * 0.24));
      g.add(pos(box(w * 0.82, 0.06, d * 0.42, tintHex(c, 0.12), s, 0.08), 0, 0.38, d * 0.12));
    }

    function buildWardrobe() {
      g.add(pos(box(w, 2.0, d, c, s, 0), 0, 1.0, 0));
      g.add(pos(box(w * 1.02, 0.05, d * 1.02, c, s, -0.12), 0, 2.03, 0));
      g.add(pos(box(0.03, 1.96, 0.02, '#2A1F14', s, 0), 0, 1.0, d * 0.5 + 0.01));
      g.add(pos(box(0.03, 0.14, 0.04, '#C0A882', 0, 0.2), -w * 0.24, 1.0, d * 0.5 + 0.06));
      g.add(pos(box(0.03, 0.14, 0.04, '#C0A882', 0, 0.2), w * 0.24, 1.0, d * 0.5 + 0.06));
      [[-w * 0.42], [w * 0.42]].forEach(([lx]) => {
        g.add(pos(box(0.08, 0.06, d * 0.8, '#2A1F14', s, 0), lx, 0.03, 0));
      });
    }

    function buildBookshelf() {
      g.add(pos(box(w, 1.8, d, c, s, 0), 0, 0.9, 0));
      [0.45, 0.85, 1.25, 1.62].forEach(sy => g.add(pos(box(w * 0.94, 0.03, d * 0.88, c, s, 0.08), 0, sy, 0)));
      const bkCols = ['#C0392B', '#2980B9', '#27AE60', '#F39C12', '#8E44AD', '#E67E22', '#1ABC9C', '#E74C3C'];
      [0.25, 0.65, 1.05, 1.44].forEach(sy => {
        let bx = -w * 0.44;
        bkCols.forEach((bc, i) => {
          const bw = w * 0.07 + i * 0.01;
          const bh = 0.26 + i * 0.02;
          if (bx + bw > w * 0.44) return;
          const bk = box(bw * 0.85, bh, d * 0.72, bc, 0, 0);
          bk.position.set(bx + bw / 2, sy + bh / 2, 0);
          g.add(bk);
          bx += bw + 0.01;
        });
      });
    }

    function buildTVUnit() {
      g.add(pos(box(w, 0.5, d, c, s, 0), 0, 0.25, 0));
      [[-w * 0.4], [w * 0.4]].forEach(([lx]) => g.add(pos(box(0.07, 0.1, d * 0.5, c, s, -0.2), lx, -0.05, 0)));
      g.add(pos(box(w * 0.88, 0.62, 0.06, '#111111', 0, 0), 0, 0.81, 0));
      g.add(pos(box(w * 0.82, 0.54, 0.03, '#1a1a2e', 0, 0.04), 0, 0.81, 0.04));
      g.add(pos(box(0.06, 0.18, 0.06, '#333333', 0, 0), 0, 0.59, 0));
      g.add(pos(box(0.24, 0.03, 0.14, '#333333', 0, 0), 0, 0.51, 0));
    }

    function buildDesk() {
      g.add(pos(box(w, 0.05, d, c, s, 0.1), 0, 0.76, 0));
      const legH = 0.73;
      [[-w * 0.45, d * 0.42], [w * 0.45, d * 0.42], [-w * 0.45, -d * 0.42], [w * 0.45, -d * 0.42]].forEach(([lx, lz]) => {
        g.add(pos(box(0.04, legH, 0.04, c, s, -0.18), lx, legH / 2, lz));
      });
      g.add(pos(box(w * 0.44, 0.36, 0.05, '#1a1a2e', 0, 0.02), 0, 0.97, -d * 0.35));
      g.add(pos(box(0.04, 0.18, 0.04, '#333', 0, 0), 0, 0.87, -d * 0.35));
      g.add(pos(box(0.18, 0.025, 0.12, '#333', 0, 0), 0, 0.785, -d * 0.35));
      g.add(pos(box(w * 0.38, 0.02, d * 0.2, '#AAAAAA', 0, 0.05), 0, 0.79, d * 0.05));
    }

    function buildPlant() {
      const potR = Math.min(w, d) * 0.3;
      g.add(pos(cyl(potR * 0.75, potR, 0.28, 14, '#C1440E', s, -0.05), 0, 0.14, 0));
      g.add(pos(cyl(potR * 0.74, potR * 0.74, 0.03, 14, '#3D2B1F', s * 0.3, 0), 0, 0.295, 0));
      const leafC = c || '#5A8A5A';
      const lh = Math.min(w, d) * 0.52;
      const mainSph = sph(lh, 12, leafC, s * 0.5, 0);
      mainSph.position.set(0, 0.3 + lh, 0);
      mainSph.scale.set(1, 1.15, 1);
      g.add(mainSph);
      [[lh * 0.62, 0], [-lh * 0.62, 0], [0, lh * 0.62], [0, -lh * 0.62]].forEach(([lx, lz]) => {
        const sl = sph(lh * 0.62, 10, leafC, s * 0.5, -0.08);
        sl.position.set(lx, 0.3 + lh * 0.72, lz);
        g.add(sl);
      });
      g.add(pos(cyl(0.02, 0.02, lh * 0.85, 6, '#5C4033', s, 0), 0, 0.3 + lh * 0.42, 0));
    }

    function buildRefrigerator() {
      g.add(pos(box(w, 1.95, d, c, s, 0.08), 0, 0.975, 0));
      g.add(pos(box(w * 1.02, 0.04, d * 1.02, '#B7BEC8', s, 0.1), 0, 1.97, 0));
      g.add(pos(box(w * 0.03, 0.58, d * 0.03, '#808994', 0, 0), w * 0.34, 1.54, d * 0.49));
      g.add(pos(box(w * 0.03, 0.72, d * 0.03, '#808994', 0, 0), w * 0.34, 0.72, d * 0.49));
      g.add(pos(box(w * 0.98, 0.01, d * 0.02, '#9098A3', 0, 0), 0, 1.38, d * 0.5 + 0.01));
    }

    function buildKitchenCounter() {
      g.add(pos(box(w, 0.9, d, c, s, -0.05), 0, 0.45, 0));
      g.add(pos(box(w * 1.02, 0.05, d * 1.02, '#D8D2C8', s, 0.18), 0, 0.93, 0));
      g.add(pos(box(w * 0.28, 0.12, d * 0.35, '#9EAAB8', 0, 0.1), -w * 0.29, 0.89, 0));
      g.add(pos(cyl(0.012, 0.012, 0.18, 8, '#C7CDD5', 0, 0.2), -w * 0.37, 1.03, d * 0.08));
      g.add(pos(box(0.07, 0.02, 0.02, '#C7CDD5', 0, 0.2), -w * 0.33, 1.1, d * 0.08));
      const hobColor = '#2A2A2A';
      [[w * 0.13, -d * 0.12], [w * 0.28, -d * 0.12], [w * 0.13, d * 0.08], [w * 0.28, d * 0.08]].forEach(([lx, lz]) => {
        g.add(pos(cyl(0.05, 0.05, 0.01, 18, hobColor, 0, 0), lx, 0.955, lz));
      });
      g.add(pos(box(w * 0.96, 0.07, d * 0.08, '#6F5C48', s, -0.12), 0, 0.035, d * 0.46));
    }

    function buildWashingMachine() {
      g.add(pos(box(w, 0.9, d, c, s, 0.08), 0, 0.45, 0));
      g.add(pos(box(w * 0.9, 0.04, d * 0.22, '#8F99A5', 0, 0.2), 0, 0.86, -d * 0.34));
      const r = Math.min(w, d) * 0.27;
      g.add(pos(cyl(r, r, 0.045, 26, '#7E95AF', 0, 0.1), 0, 0.47, d * 0.5 + 0.02));
      g.add(pos(cyl(r * 0.78, r * 0.78, 0.02, 24, '#AFC3D9', 0, 0.18), 0, 0.47, d * 0.525));
      [[-w * 0.4, d * 0.38], [w * 0.4, d * 0.38], [-w * 0.4, -d * 0.38], [w * 0.4, -d * 0.38]].forEach(([lx, lz]) => {
        g.add(pos(box(0.03, 0.05, 0.03, '#6B747E', 0, 0), lx, 0.025, lz));
      });
    }

    function buildFloorLamp() {
      const r = Math.min(w, d);
      g.add(pos(cyl(r * 0.2, r * 0.24, 0.03, 16, '#645242', s, -0.1), 0, 0.015, 0));
      g.add(pos(cyl(0.015, 0.015, 1.34, 10, '#988469', s, 0.05), 0, 0.67, 0));
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.1, r * 0.24, 0.26, 18, 1, true), mat3d(THREE, c, s, 0.12));
      shade.castShadow = shade.receiveShadow = true;
      shade.position.set(0, 1.48, 0);
      g.add(shade);
      g.add(pos(cyl(r * 0.11, r * 0.11, 0.018, 16, '#EEE5D4', 0, 0.25), 0, 1.36, 0));
      g.add(pos(sph(0.028, 10, '#F4D57E', 0, 0.2), 0, 1.58, 0));
    }

    function buildRug() {
      g.add(pos(box(w, 0.02, d, c, s, 0.08), 0, 0.01, 0));
      g.add(pos(box(w * 0.96, 0.006, d * 0.96, '#D6B39F', s * 0.4, 0.1), 0, 0.024, 0));
      g.add(pos(box(w * 0.98, 0.008, d * 0.03, '#8B4A3D', s * 0.4, 0), 0, 0.024, d * 0.485));
      g.add(pos(box(w * 0.98, 0.008, d * 0.03, '#8B4A3D', s * 0.4, 0), 0, 0.024, -d * 0.485));
    }

    switch (item.type) {
      case 'sofa': buildSofa(); break;
      case 'armchair': buildArmchair(); break;
      case 'chair': buildChair(); break;
      case 'dining_table': buildDiningTable(); break;
      case 'coffee_table': buildCoffeeTable(); break;
      case 'side_table': buildSideTable(); break;
      case 'bed': buildBedStandard(); break;
      case 'bed_platform': buildBedPlatform(); break;
      case 'bed_upholstered': buildBedUpholstered(); break;
      case 'bed_canopy': buildBedCanopy(); break;
      case 'bed_bunk': buildBedBunk(); break;
      case 'bed_daybed': buildBedDaybed(); break;
      case 'wardrobe': buildWardrobe(); break;
      case 'bookshelf': buildBookshelf(); break;
      case 'tv_unit': buildTVUnit(); break;
      case 'desk': buildDesk(); break;
      case 'plant': buildPlant(); break;
      case 'refrigerator': buildRefrigerator(); break;
      case 'kitchen_counter': buildKitchenCounter(); break;
      case 'washing_machine': buildWashingMachine(); break;
      case 'floor_lamp': buildFloorLamp(); break;
      case 'rug': buildRug(); break;
      default:
        g.add(pos(box(w, 0.75, d, c, s, 0), 0, 0.375, 0));
        break;
    }

    return g;
  }

  window.DesignerThreeProcedural = {
    buildFurnitureGroup
  };
})();
