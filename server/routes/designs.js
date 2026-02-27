const express     = require('express');
const requireAuth = require('../middleware/auth');
const db          = require('../db');

const router = express.Router();
router.use(requireAuth);

const VALID = ['draft', 'in_progress', 'finished'];

// GET /api/designs
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let rows;
    if (status && VALID.includes(status)) {
      rows = await db.all('SELECT * FROM designs WHERE user_id = ? AND status = ? ORDER BY updated_at DESC', [req.user.id, status]);
    } else {
      rows = await db.all('SELECT * FROM designs WHERE user_id = ? ORDER BY updated_at DESC', [req.user.id]);
    }
    res.json({ designs: db.parseDesigns(rows) });
  } catch (err) { res.status(500).json({ error: 'Failed to load designs.' }); }
});

// GET /api/designs/stats
router.get('/stats', async (req, res) => {
  try {
    const rows  = await db.all('SELECT status, COUNT(*) as count FROM designs WHERE user_id = ? GROUP BY status', [req.user.id]);
    const stats = { draft: 0, in_progress: 0, finished: 0, total: 0 };
    rows.forEach(r => { stats[r.status] = r.count; stats.total += r.count; });
    res.json({ stats });
  } catch (err) { res.status(500).json({ error: 'Failed to load stats.' }); }
});

// GET /api/designs/:id
router.get('/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM designs WHERE id = ? AND user_id = ?', [parseInt(req.params.id), req.user.id]);
    if (!row) return res.status(404).json({ error: 'Design not found.' });
    res.json({ design: db.parseDesign(row) });
  } catch (err) { res.status(500).json({ error: 'Failed to load design.' }); }
});

// POST /api/designs
router.post('/', async (req, res) => {
  try {
    const { name, status, room, furniture, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Design name is required.' });
    const result = await db.run(
      'INSERT INTO designs (user_id, name, status, room, furniture, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, name.trim(), status || 'draft', JSON.stringify(room || {}), JSON.stringify(furniture || []), notes || '']
    );
    const design = db.parseDesign(await db.get('SELECT * FROM designs WHERE id = ?', [result.lastInsertRowid]));
    res.status(201).json({ design });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create design.' }); }
});

// PUT /api/designs/:id
router.put('/:id', async (req, res) => {
  try {
    const id  = parseInt(req.params.id);
    const old = await db.get('SELECT * FROM designs WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!old) return res.status(404).json({ error: 'Design not found.' });
    const { name, status, room, furniture, notes } = req.body;
    await db.run(
      'UPDATE designs SET name=?, status=?, room=?, furniture=?, notes=?, updated_at=datetime("now") WHERE id=? AND user_id=?',
      [
        (name || old.name).trim(),
        status || old.status,
        JSON.stringify(room !== undefined ? room : JSON.parse(old.room)),
        JSON.stringify(furniture !== undefined ? furniture : JSON.parse(old.furniture)),
        notes !== undefined ? notes : old.notes,
        id, req.user.id
      ]
    );
    res.json({ design: db.parseDesign(await db.get('SELECT * FROM designs WHERE id = ?', [id])) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save design.' }); }
});

// PATCH /api/designs/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    const old = await db.get('SELECT * FROM designs WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!old) return res.status(404).json({ error: 'Design not found.' });
    await db.run('UPDATE designs SET status=?, updated_at=datetime("now") WHERE id=? AND user_id=?', [status, id, req.user.id]);
    res.json({ design: db.parseDesign(await db.get('SELECT * FROM designs WHERE id = ?', [id])) });
  } catch (err) { res.status(500).json({ error: 'Failed to update status.' }); }
});

// POST /api/designs/:id/duplicate
router.post('/:id/duplicate', async (req, res) => {
  try {
    const id  = parseInt(req.params.id);
    const old = await db.get('SELECT * FROM designs WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!old) return res.status(404).json({ error: 'Design not found.' });
    const result = await db.run(
      'INSERT INTO designs (user_id, name, status, room, furniture, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, old.name + ' (Copy)', 'draft', old.room, old.furniture, old.notes]
    );
    res.status(201).json({ design: db.parseDesign(await db.get('SELECT * FROM designs WHERE id = ?', [result.lastInsertRowid])) });
  } catch (err) { res.status(500).json({ error: 'Failed to duplicate design.' }); }
});

// DELETE /api/designs/:id
router.delete('/:id', async (req, res) => {
  try {
    const id  = parseInt(req.params.id);
    const old = await db.get('SELECT * FROM designs WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!old) return res.status(404).json({ error: 'Design not found.' });
    await db.run('DELETE FROM designs WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ message: 'Design deleted.' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete design.' }); }
});

module.exports = router;