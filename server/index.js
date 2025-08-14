const express = require('express');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

// In-memory user store
const users = new Map();

function generateToken(username) {
  return Buffer.from(`${username}:${Date.now()}`).toString('base64');
}

app.post('/api/auth/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }
  if (users.has(username)) {
    return res.status(409).json({ message: 'User already exists' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    users.set(username, { passwordHash: hash });
    const token = generateToken(username);
    return res.json({ token });
  } catch (err) {
    return res.status(500).json({ message: 'Error creating user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = generateToken(username);
  return res.json({ token });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
