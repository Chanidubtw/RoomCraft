require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const db      = require('./db');

const authRoutes   = require('./routes/auth');
const designRoutes = require('./routes/designs');

const app  = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: [
    'https://roomcraft-434523840513.europe-west1.run.app',
    'http://localhost:8080',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString().slice(11,19)}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth',    authRoutes);
app.use('/api/designs', designRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'RoomCraft API', time: new Date().toISOString() });
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

// Initialize database then start server
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`RoomCraft API running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
