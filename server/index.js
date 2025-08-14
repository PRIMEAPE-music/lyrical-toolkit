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

// Auth routes - Updated to match new frontend format
app.post('/api/auth/signup', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  const existing = users.find(u => u.username === username || u.email === email);
  if (existing) {
    return res.status(400).json({ error: 'User with this username or email already exists' });
  }

  const newUser = { 
    id: Date.now(), 
    username, 
    email,
    password, // Add password to user object
    email_verified: true // Skip verification in development
  };
  users.push(newUser);
  
  const accessToken = jwt.sign({ userId: newUser.id, username, email }, SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: newUser.id }, SECRET, { expiresIn: '7d' });
  
  const responseData = {
    message: 'Account created successfully',
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      emailVerified: newUser.email_verified
    },
    tokens: {
      accessToken,
      refreshToken
    }
  };
  
  res.status(201).json(responseData);
});

app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;
  console.log('Login attempt:', { login, password });
  console.log('Current users:', users.map(u => ({ id: u.id, username: u.username, email: u.email, password: u.password })));
  
  const user = users.find(u => 
    (u.username === login || u.email === login) && u.password === password
  );
  
  console.log('Found user:', user);
  
  if (user) {
    const accessToken = jwt.sign({ userId: user.id, username: user.username, email: user.email }, SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '7d' });
    
    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: user.email_verified
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  jwt.verify(refreshToken, SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    
    const user = users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const newAccessToken = jwt.sign({ userId: user.id, username: user.username, email: user.email }, SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '7d' });
    
    res.json({
      message: 'Tokens refreshed successfully',
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  });
});

// Additional auth endpoints for development
app.get('/api/auth/profile', authenticate, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      emailVerified: user.email_verified
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Mock endpoints for development
app.post('/api/auth/verify-email', (req, res) => {
  res.json({ message: 'Email verified successfully' });
});

app.post('/api/auth/request-reset', (req, res) => {
  res.json({ message: 'Password reset instructions sent to your email' });
});

app.post('/api/auth/reset-password', (req, res) => {
  res.json({ message: 'Password reset successfully' });
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

