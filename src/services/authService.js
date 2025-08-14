
const API_BASE = '/api';

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/login`, {

    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (!res.ok) {
    throw new Error('Login failed');
  }
  return res.json();
}

export async function signup(username, password) {
  const res = await fetch(`${API_BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    throw new Error('Signup failed');
  }
  return res.json();
}

export default { login, signup };

