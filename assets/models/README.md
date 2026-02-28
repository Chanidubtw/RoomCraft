# RoomCraft GLB Models

Drop your `.glb` files in this folder structure:

- `assets/models/beds/`
- `assets/models/living/`
- `assets/models/dining/`
- `assets/models/storage/`
- `assets/models/work/`
- `assets/models/kitchen/`
- `assets/models/utility/`
- `assets/models/decor/`

Then edit `js/designer/model-registry.js`:
1. Set `enabled: true` for each model you added.
2. Keep `fit.x` and `fit.z` to control footprint fitting.
3. Set `window.DesignerModelRegistry.useGLB = true`.

Fallback behavior:
- If model loading fails, RoomCraft automatically falls back to procedural 3D furniture.
