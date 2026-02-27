require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes   = require('./routes/auth');
const designRoutes = require('./routes/designs');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: [
    'http://localhost:5500','http://127.0.0.1:5500',
    'http://localhost:8080','http://127.0.0.1:8080',
    'http://localhost:3000','http://127.0.0.1:3000',
    'null'
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

app.listen(PORT, () => {
  console.log('\n  🛋️  RoomCraft API running on http://localhost:' + PORT + '\n');
});
