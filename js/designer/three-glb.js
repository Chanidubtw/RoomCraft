(function () {
  const modelCache = new Map();
  const failedKeys = new Set();

  function getLoaderCtor(THREE, name) {
    if (THREE && typeof THREE[name] === 'function') return THREE[name];
    if (typeof window !== 'undefined' && typeof window[name] === 'function') return window[name];
    return null;
  }

  function loadGLTFModel(THREE, url) {
    if (modelCache.has(url)) return modelCache.get(url);
    const GLTF = getLoaderCtor(THREE, 'GLTFLoader');
    if (!GLTF) return Promise.resolve(null);
    const loader = new GLTF();

    const p = new Promise((resolve, reject) => {
      loader.load(
        safeUrl(url),
        gltf => resolve(gltf.scene || null),
        undefined,
        err => reject(err)
      );
    });

    modelCache.set(url, p);
    return p;
  }

  function dirname(url) {
    const idx = url.lastIndexOf('/');
    return idx >= 0 ? url.slice(0, idx + 1) : '';
  }

  function safeUrl(url) {
    return encodeURI(url || '');
  }

  function loadObjWithOptionalMtl(THREE, cfg) {
    const key = `obj:${cfg.objUrl}|mtl:${cfg.mtlUrl || ''}`;
    if (modelCache.has(key)) return modelCache.get(key);

    const p = (async () => {
      const OBJ = getLoaderCtor(THREE, 'OBJLoader');
      if (!OBJ) return null;
      const objLoader = new OBJ();

      const MTL = getLoaderCtor(THREE, 'MTLLoader');
      if (cfg.mtlUrl && MTL) {
        try {
          const mtlLoader = new MTL();
          mtlLoader.setResourcePath(safeUrl(dirname(cfg.mtlUrl)));
          const materials = await new Promise((resolve, reject) => {
            mtlLoader.load(safeUrl(cfg.mtlUrl), resolve, undefined, reject);
          });
          if (materials && typeof materials.preload === 'function') materials.preload();
          objLoader.setMaterials(materials);
        } catch (err) {
          console.warn('MTL load failed, continuing without materials for', cfg.objUrl, err && err.message ? err.message : err);
        }
      }

      return new Promise((resolve, reject) => {
        objLoader.load(safeUrl(cfg.objUrl), resolve, undefined, reject);
      });
    })();

    modelCache.set(key, p);
    return p;
  }

  function parseColorHex(THREE, value) {
    if (!value || !THREE || !THREE.Color) return null;
    try {
      return new THREE.Color(value);
    } catch (_) {
      return null;
    }
  }

  function setShadowAndMaterial(THREE, scene, cfg, item) {
    const tint = parseColorHex(THREE, (cfg && cfg.tintColor) || (item && item.color));
    scene.traverse(node => {
      if (!node || !node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of materials) {
        if (!mat || typeof mat !== 'object') continue;
        if ('metalness' in mat && mat.metalness < 0.02) mat.metalness = 0.02;
        if ('roughness' in mat && mat.roughness > 0.96) mat.roughness = 0.96;
        // Some OBJ/MTL assets load with flat white materials; apply catalog tint where requested.
        if (tint && mat.color && !mat.map && !mat.emissiveMap) {
          mat.color.copy(tint);
        }
      }
    });
  }

  function fitModelToFootprint(THREE, scene, item, cfg) {
    if (cfg.rotateX) scene.rotation.x += cfg.rotateX;
    if (cfg.rotateY) scene.rotation.y += cfg.rotateY;
    if (cfg.rotateZ) scene.rotation.z += cfg.rotateZ;

    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());

    if (!size.x || !size.y || !size.z) return;

    const fit = cfg.fit || { x: 0.95, z: 0.95 };
    const targetX = Math.max(0.05, item.w * (fit.x || 1));
    const targetZ = Math.max(0.05, item.h * (fit.z || 1));

    const sx = targetX / size.x;
    const sz = targetZ / size.z;
    const uniform = Math.min(sx, sz) * (cfg.scale || 1);

    scene.scale.setScalar(uniform);
    scene.updateMatrixWorld(true);

    const box2 = new THREE.Box3().setFromObject(scene);
    const center = box2.getCenter(new THREE.Vector3());
    const min = box2.min;

    scene.position.x -= center.x;
    scene.position.z -= center.z;
    scene.position.y -= min.y;

    if (cfg.yOffset) scene.position.y += cfg.yOffset;
  }

  async function createFurnitureGroup(THREE, item) {
    const registry = window.DesignerModelRegistry;
    if (!registry || !(registry.useModels || registry.useGLB)) return null;

    const cfg = registry.modelsByType && registry.modelsByType[item.type];
    if (!cfg || !cfg.enabled) return null;

    const hasGLTF = !!cfg.url;
    const hasOBJ = !!cfg.objUrl;
    if (!hasGLTF && !hasOBJ) return null;

    if (hasGLTF && !getLoaderCtor(THREE, 'GLTFLoader')) return null;
    if (hasOBJ && !getLoaderCtor(THREE, 'OBJLoader')) return null;

    const key = hasOBJ ? `obj:${cfg.objUrl}|mtl:${cfg.mtlUrl || ''}` : `gltf:${cfg.url}`;
    if (failedKeys.has(key)) return null;

    try {
      const template = hasOBJ ? await loadObjWithOptionalMtl(THREE, cfg) : await loadGLTFModel(THREE, cfg.url);
      if (!template) return null;

      const model = template.clone(true);
      setShadowAndMaterial(THREE, model, cfg, item);

      // Keep model-local alignment separate from world placement done in designer.js.
      // designer.js sets returnedGroup.position(...), so local offsets must live on a child.
      const wrapper = new THREE.Group();
      wrapper.add(model);
      fitModelToFootprint(THREE, model, item, cfg);
      return wrapper;
    } catch (err) {
      failedKeys.add(key);
      console.warn('Model load failed for', key, err && err.message ? err.message : err);
      return null;
    }
  }

  window.DesignerThreeGLB = { createFurnitureGroup };
})();
