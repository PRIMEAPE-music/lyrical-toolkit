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
let users = [{ 
  id: 1, 
  username: 'user', 
  email: 'user@example.com', 
  password: 'password', 
  email_verified: true 
}];

// Middleware to verify JWT token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.user = decoded;
    next();
  });
}

// Auth routes DISABLED - Now using Netlify functions for authentication only
// This prevents conflicts between Express and Netlify auth systems

// NOTE: Authentication is now handled exclusively by Netlify functions
// All auth endpoints (/api/auth/*) are disabled to prevent conflicts
// Users should use Netlify functions for signup/login/logout/profile

/* DISABLED AUTH ROUTES - USING NETLIFY FUNCTIONS INSTEAD
app.post('/api/auth/signup', (req, res) => { ... });
app.post('/api/auth/login', (req, res) => { ... });
app.post('/api/auth/refresh', (req, res) => { ... });
app.get('/api/auth/profile', authenticate, (req, res) => { ... });
app.post('/api/auth/logout', (req, res) => { ... });
app.post('/api/auth/verify-email', (req, res) => { ... });
app.post('/api/auth/request-reset', (req, res) => { ... });
app.post('/api/auth/reset-password', (req, res) => { ... });
*/

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

