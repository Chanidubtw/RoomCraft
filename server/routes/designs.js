const express     = require('express');
const requireAuth = require('../middleware/auth');
const db          = require('../db');

const router = express.Router();
router.use(requireAuth);

const VALID = ['draft', 'in_progress', 'finished'];

// GET /api/designs  or  /api/designs?status=draft
router.get('/', (req, res) => {
  try {
    const { status } = req.query;
    const rows = (status && VALID.includes(status))
      ? db.designs.findByStatus.all(req.user.id, status)
      : db.designs.findAllForUser.all(req.user.id);
    res.json({ designs: db.parseDesigns(rows) });
  } catch (err) { res.status(500).json({ error: 'Failed to load designs.' }); }
});

// GET /api/designs/stats
router.get('/stats', (req, res) => {
  try {
    const rows  = db.designs.countByStatus.all(req.user.id);
    const stats = { draft: 0, in_progress: 0, finished: 0, total: 0 };
    rows.forEach(r => { stats[r.status] = r.count; stats.total += r.count; });
    res.json({ stats });
  } catch (err) { res.status(500).json({ error: 'Failed to load stats.' }); }
});

// GET /api/designs/:id
router.get('/:id', (req, res) => {
  try {
    const row = db.designs.findById.get(parseInt(req.params.id), req.user.id);
    if (!row) return res.status(404).json({ error: 'Design not found.' });
    res.json({ design: db.parseDesign(row) });
  } catch (err) { res.status(500).json({ error: 'Failed to load design.' }); }
});

// POST /api/designs
router.post('/', (req, res) => {
  try {
    const { name, status, room, furniture, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Design name is required.' });
    if (status && !VALID.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    const result = db.designs.create.run({
      user_id:   req.user.id,
      name:      name.trim(),
      status:    status || 'draft',
      room:      JSON.stringify(room      || {}),
      furniture: JSON.stringify(furniture || []),
      notes:     notes || ''
    });
    res.status(201).json({ design: db.parseDesign(db.designs.findById.get(result.lastInsertRowid, req.user.id)) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create design.' }); }
});

// PUT /api/designs/:id
router.put('/:id', (req, res) => {
  try {
    const id  = parseInt(req.params.id);
    const old = db.designs.findById.get(id, req.user.id);
    if (!old) return res.status(404).json({ error: 'Design not found.' });
    const { name, status, room, furniture, notes } = req.body;
    if (status && !VALID.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    db.designs.update.run({
      id,
      user_id:   req.user.id,
      name:      (name || old.name).trim(),
      status:    status    || old.status,
      room:      JSON.stringify(room      !== undefined ? room      : JSON.parse(old.room)),
      furniture: JSON.stringify(furniture !== undefined ? furniture : JSON.parse(old.furniture)),
      notes:     notes !== undefined ? notes : old.notes
    });
    res.json({ design: db.parseDesign(db.designs.findById.get(id, req.user.id)) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save design.' }); }
});

// PATCH /api/designs/:id/status
router.patch('/:id/status', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    if (!db.designs.findById.get(id, req.user.id)) return res.status(404).json({ error: 'Design not found.' });
    db.designs.updateStatus.run({ id, user_id: req.user.id, status });
    res.json({ design: db.parseDesign(db.designs.findById.get(id, req.user.id)) });
  } catch (err) { res.status(500).json({ error: 'Failed to update status.' }); }
});

// POST /api/designs/:id/duplicate
router.post('/:id/duplicate', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!db.designs.findById.get(id, req.user.id)) return res.status(404).json({ error: 'Design not found.' });
    const result = db.designs.duplicate.run(id, req.user.id);
    res.status(201).json({ design: db.parseDesign(db.designs.findById.get(result.lastInsertRowid, req.user.id)) });
  } catch (err) { res.status(500).json({ error: 'Failed to duplicate design.' }); }
});

// DELETE /api/designs/:id
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!db.designs.findById.get(id, req.user.id)) return res.status(404).json({ error: 'Design not found.' });
    db.designs.delete.run(id, req.user.id);
    res.json({ message: 'Design deleted.' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete design.' }); }
});

module.exports = router;
