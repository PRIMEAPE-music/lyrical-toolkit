// Authentication service for handling login/logout and token refresh
// Uses localStorage to persist the auth token and communicates with
// the backend at /api/auth

const AUTH_API = '/api/auth';

// Retrieve the current auth token from localStorage
export const getToken = () => {
  return localStorage.getItem('authToken');
};

// Save a token to localStorage
const setToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  }
};

// Clear the stored token
export const logout = () => {
  localStorage.removeItem('authToken');
};

// Login with username and password. On success the token is stored and returned.
export const login = async (username, password) => {
  const response = await fetch(`${AUTH_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();
  setToken(data.token);
  return data.token;
};

// Sign up with username and password. On success the token is stored and returned.
export const signup = async (username, password) => {
  const response = await fetch(`${AUTH_API}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Signup failed');
  }

  const data = await response.json();
  setToken(data.token);
  return data.token;
};

// Refresh the current token. Returns and stores the new token.
export const refreshToken = async () => {
  const token = getToken();
  if (!token) throw new Error('No token available');

  const response = await fetch(`${AUTH_API}/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  setToken(data.token);
  return data.token;
};

export default {
  login,
  signup,
  logout,
  refreshToken,
  getToken
};

