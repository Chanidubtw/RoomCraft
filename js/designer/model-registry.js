(function () {
  // GLB registry. Keep entries disabled until the file exists locally.
  // Path convention suggestion: assets/models/<category>/<name>.glb
  const MODELS_BY_TYPE = {
    bed:             {
      enabled: true,
      objUrl: 'assets/models/beds/Full_Size_Bed_with_White_Sheets_Black_V1.obj',
      mtlUrl: 'assets/models/beds/Full_Size_Bed_with_White_Sheets_Black_V1.mtl',
      fit: { x: 0.95, z: 0.95 },
      rotateX: -Math.PI / 2,
      rotateZ: Math.PI / 2,
      yOffset: 0
    },
    bed_platform:    {
      enabled: true,
      objUrl: 'assets/models/beds/California_King_Size_Bed_With_Thyme_Sheets_Pine_V1_NEW.obj',
      mtlUrl: 'assets/models/beds/California_King_Size_Bed_With_Thyme_Sheets_Pine_V1_NEW.mtl',
      fit: { x: 0.96, z: 0.96 },
      rotateX: -Math.PI / 2,
      rotateZ: Math.PI / 2,
      yOffset: 0
    },
    bed_upholstered: { enabled: false, url: 'assets/models/beds/upholstered-bed.glb', fit: { x: 0.96, z: 0.96 }, yOffset: 0 },
    bed_canopy:      { enabled: false, url: 'assets/models/beds/canopy-bed.glb', fit: { x: 0.98, z: 0.98 }, yOffset: 0 },
    bed_bunk:        { enabled: false, url: 'assets/models/beds/bunk-bed.glb', fit: { x: 0.96, z: 0.96 }, yOffset: 0 },
    bed_daybed:      { enabled: false, url: 'assets/models/beds/daybed.glb', fit: { x: 0.95, z: 0.95 }, yOffset: 0 },

    sofa_round:      {
      enabled: true,
      objUrl: 'assets/models/sofa/ROUND SOFA.obj',
      fit: { x: 0.95, z: 0.95 },
      tintColor: '#9A7B62',
      yOffset: 0
    },
    sofa1:           {
      enabled: true,
      objUrl: 'assets/models/sofa/sofa1.obj',
      mtlUrl: 'assets/models/sofa/sofa1.mtl',
      fit: { x: 0.95, z: 0.95 },
      tintColor: '#7D6A58',
      yOffset: 0
    },
    sofa_koltuk:     {
      enabled: true,
      objUrl: 'assets/models/sofa/Koltuk.obj',
      fit: { x: 0.95, z: 0.95 },
      yOffset: 0
    },
    sofa:            {
      enabled: true,
      objUrl: 'assets/models/sofa/sofa.obj',
      fit: { x: 0.95, z: 0.95 },
      yOffset: 0
    },
    armchair:        { enabled: false, url: 'assets/models/living/armchair.glb', fit: { x: 0.92, z: 0.92 }, yOffset: 0 },
    dining_table:    { enabled: false, url: 'assets/models/dining/dining-table.glb', fit: { x: 0.95, z: 0.95 }, yOffset: 0 },
    chair:           { enabled: false, url: 'assets/models/dining/chair.glb', fit: { x: 0.9, z: 0.9 }, yOffset: 0 },
    chair_oben:      {
      enabled: true,
      objUrl: 'assets/models/chair/oben sandalye.obj',
      mtlUrl: 'assets/models/chair/oben sandalye.mtl',
      fit: { x: 0.92, z: 0.92 },
      yOffset: 0
    },
    coffee_table_table: {
      enabled: true,
      objUrl: 'assets/models/coffee_table/Table.obj',
      mtlUrl: 'assets/models/coffee_table/Table.mtl',
      fit: { x: 0.94, z: 0.94 },
      yOffset: 0
    },

    wardrobe:        { enabled: false, url: 'assets/models/storage/wardrobe.glb', fit: { x: 0.94, z: 0.94 }, yOffset: 0 },
    wardrobe_4door:  {
      enabled: true,
      objUrl: 'assets/models/wardrobe/Wardrobe  4 door.obj',
      mtlUrl: 'assets/models/wardrobe/Wardrobe  4 door.mtl',
      fit: { x: 0.95, z: 0.95 },
      scale: 1.2,
      yOffset: 0
    },
    desk:            { enabled: false, url: 'assets/models/work/desk.glb', fit: { x: 0.95, z: 0.95 }, yOffset: 0 },
    bookshelf:       { enabled: false, url: 'assets/models/storage/bookshelf.glb', fit: { x: 0.94, z: 0.94 }, yOffset: 0 },

    refrigerator:    { enabled: false, url: 'assets/models/kitchen/refrigerator.glb', fit: { x: 0.9, z: 0.9 }, yOffset: 0 },
    kitchen_counter: { enabled: false, url: 'assets/models/kitchen/counter.glb', fit: { x: 0.98, z: 0.98 }, yOffset: 0 },
    washing_machine: { enabled: false, url: 'assets/models/utility/washing-machine.glb', fit: { x: 0.9, z: 0.9 }, yOffset: 0 },

    floor_lamp:      { enabled: false, url: 'assets/models/decor/floor-lamp.glb', fit: { x: 0.7, z: 0.7 }, yOffset: 0 },
    plant:           { enabled: false, url: 'assets/models/decor/plant.glb', fit: { x: 0.8, z: 0.8 }, yOffset: 0 },
    tv_unit:         { enabled: false, url: 'assets/models/living/tv-unit.glb', fit: { x: 0.95, z: 0.95 }, yOffset: 0 },
    rug:             { enabled: false, url: 'assets/models/decor/rug.glb', fit: { x: 0.98, z: 0.98 }, yOffset: 0 },
  };

  window.DesignerModelRegistry = {
    modelsByType: MODELS_BY_TYPE,
    // Supports GLB/GLTF and OBJ/MTL based models.
    useModels: true,
    useGLB: true,
  };
})();
