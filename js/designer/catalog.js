(function () {
  const FURNITURE_LIB = [
    { type:'sofa',         label:'Sofa',             emoji:'🛋️', w:2.0, h:0.9,  color:'#8B7355', height3d:0.85 },
    { type:'sofa1',        label:'Sofa 1',           emoji:'🛋️', w:2.2, h:1.0,  color:'#7D6A58', height3d:0.9 },
    { type:'sofa_round',   label:'Round Sofa',       emoji:'🛋️', w:2.0, h:2.0,  color:'#9A7B62', height3d:0.82 },
    { type:'sofa_koltuk',  label:'Koltuk Sofa',      emoji:'🛋️', w:2.1, h:0.95, color:'#8B7355', height3d:0.86 },
    { type:'armchair',     label:'Armchair',         emoji:'🪑', w:0.8, h:0.8,  color:'#A0785A', height3d:0.85 },
    { type:'chair',        label:'Dining Chair',     emoji:'🪑', w:0.5, h:0.5,  color:'#C8A882', height3d:0.90 },
    { type:'chair_oben',   label:'Oben Chair',       emoji:'🪑', w:0.55, h:0.55, color:'#C8A882', height3d:0.90 },
    { type:'dining_table', label:'Dining Table',     emoji:'🍽️', w:1.8, h:0.9,  color:'#DEB887', height3d:0.75 },
    { type:'coffee_table', label:'Coffee Table',     emoji:'☕', w:1.1, h:0.6,  color:'#BC8F5F', height3d:0.45 },
    { type:'coffee_table_table', label:'Table Coffee', emoji:'☕', w:1.2, h:0.75, color:'#BC8F5F', height3d:0.45 },
    { type:'side_table',   label:'Side Table',       emoji:'📦', w:0.5, h:0.5,  color:'#D2B48C', height3d:0.55 },
    { type:'bed',          label:'Standard Bed',     emoji:'🛏️', w:2.0, h:1.6,  color:'#4A90D9', height3d:0.55 },
    { type:'bed_platform', label:'Platform Bed',     emoji:'🛏️', w:2.0, h:1.6,  color:'#8B6A4D', height3d:0.5 },
    { type:'bed_upholstered', label:'Upholstered Bed', emoji:'🛏️', w:2.1, h:1.7, color:'#8D939E', height3d:0.62 },
    { type:'bed_canopy',   label:'Canopy Bed',       emoji:'🛏️', w:2.1, h:1.8,  color:'#6B5A47', height3d:2.1 },
    { type:'bed_bunk',     label:'Bunk Bed',         emoji:'🛏️', w:2.1, h:1.0,  color:'#7A634F', height3d:1.9 },
    { type:'bed_daybed',   label:'Daybed',           emoji:'🛏️', w:2.0, h:0.95, color:'#A1856D', height3d:0.75 },
    { type:'wardrobe',     label:'Wardrobe',         emoji:'🚪', w:1.8, h:0.6,  color:'#7B5E42', height3d:2.00 },
    { type:'wardrobe_4door', label:'Wardrobe 4 Door', emoji:'🚪', w:2.6, h:0.8, color:'#7B5E42', height3d:2.2 },
    { type:'bookshelf',    label:'Bookshelf',        emoji:'📚', w:1.2, h:0.3,  color:'#5C4033', height3d:1.80 },
    { type:'tv_unit',      label:'TV Unit',          emoji:'📺', w:1.6, h:0.4,  color:'#333333', height3d:0.50 },
    { type:'desk',         label:'Desk',             emoji:'🖥️', w:1.4, h:0.7,  color:'#B8966E', height3d:0.76 },
    { type:'plant',        label:'Plant',            emoji:'🌿', w:0.4, h:0.4,  color:'#5A8A5A', height3d:0.80 },
    { type:'refrigerator', label:'Refrigerator',     emoji:'🧊', w:0.9, h:0.8,  color:'#D9DEE5', height3d:1.95 },
    { type:'kitchen_counter', label:'Kitchen Counter', emoji:'🍳', w:1.8, h:0.65, color:'#8F7A63', height3d:0.92 },
    { type:'washing_machine', label:'Washing Machine', emoji:'🧺', w:0.75, h:0.7, color:'#C7CED9', height3d:0.9 },
    { type:'floor_lamp',   label:'Floor Lamp',       emoji:'💡', w:0.45, h:0.45, color:'#D7B988', height3d:1.65 },
    { type:'rug',          label:'Rug',              emoji:'🧶', w:1.6, h:1.0,  color:'#B85C4A', height3d:0.03 },
  ];

  const LIBRARY_GROUPS = [
    {
      label: 'Living',
      families: [
        {
          label: 'Sofas',
          emoji: '🛋️',
          types: ['sofa', 'sofa1', 'sofa_round', 'sofa_koltuk']
        },
        {
          label: 'Coffee Tables',
          emoji: '☕',
          types: ['coffee_table', 'coffee_table_table']
        }
      ],
      items: ['armchair', 'side_table', 'tv_unit', 'floor_lamp', 'rug', 'plant']
    },
    {
      label: 'Bedroom',
      families: [
        {
          label: 'Beds',
          emoji: '🛏️',
          types: ['bed', 'bed_platform', 'bed_upholstered', 'bed_canopy', 'bed_bunk', 'bed_daybed']
        },
        {
          label: 'Wardrobes',
          emoji: '🚪',
          types: ['wardrobe', 'wardrobe_4door']
        }
      ],
      items: ['bookshelf']
    },
    {
      label: 'Dining / Work',
      families: [
        {
          label: 'Chairs',
          emoji: '🪑',
          types: ['chair', 'chair_oben']
        }
      ],
      items: ['dining_table', 'desk']
    },
    {
      label: 'Kitchen / Utility',
      items: ['kitchen_counter', 'refrigerator', 'washing_machine']
    }
  ];

  window.DesignerCatalog = { FURNITURE_LIB, LIBRARY_GROUPS };
})();
