// Simple Express server providing authentication and song CRUD endpoints
// Songs are stored in-memory for demonstration purposes

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = 'super-secret-key';
let songs = [];

// Middleware to verify JWT token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  // For demo purposes accept a single hard-coded user
  if (username === 'user' && password === 'password') {
    const token = jwt.sign({ username }, SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/auth/refresh', authenticate, (req, res) => {
  const token = jwt.sign({ username: req.user.username }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Song CRUD endpoints
app.get('/api/songs', authenticate, (req, res) => {
  res.json(songs);
});

app.post('/api/songs', authenticate, (req, res) => {
  const song = { id: Date.now().toString(), ...req.body };
  songs.push(song);
  res.status(201).json(song);
});

app.put('/api/songs/:id', authenticate, (req, res) => {
  const idx = songs.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.sendStatus(404);
  songs[idx] = { ...songs[idx], ...req.body };
  res.json(songs[idx]);
});

app.delete('/api/songs/:id', authenticate, (req, res) => {
  songs = songs.filter(s => s.id !== req.params.id);
  res.sendStatus(204);
});

// Bulk update/clear helpers used by the frontend
app.put('/api/songs', authenticate, (req, res) => {
  songs = Array.isArray(req.body) ? req.body : [];
  res.json(songs);
});

app.delete('/api/songs', authenticate, (req, res) => {
  songs = [];
  res.sendStatus(204);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

