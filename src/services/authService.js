// Enhanced authentication service with full feature support
// Supports access tokens, refresh tokens, email verification, and password reset

// Always use Netlify functions for authentication (unified system)
const AUTH_API = '/.netlify/functions';

// Token management
export const getAccessToken = () => {
  return localStorage.getItem('accessToken');
};

export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
};

const setTokens = (accessToken, refreshToken) => {
  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
  }
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

const setCurrentUser = (user) => {
  localStorage.setItem('currentUser', JSON.stringify(user));
};

// Clear all stored auth data
export const logout = async () => {
  const refreshToken = getRefreshToken();
  
  // Notify server about logout
  if (refreshToken) {
    try {
      await fetch(`${AUTH_API}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
    } catch (error) {
      console.warn('Failed to notify server about logout:', error);
    }
  }
  
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('currentUser');
};

// Login with username/email and password
export const login = async (login, password) => {
  const response = await fetch(`${AUTH_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();
  setTokens(data.tokens.accessToken, data.tokens.refreshToken);
  setCurrentUser(data.user);
  return data;
};

// Sign up with username, email, and password
export const signup = async (username, email, password) => {
  const response = await fetch(`${AUTH_API}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Signup failed');
  }

  const data = await response.json();
  setTokens(data.tokens.accessToken, data.tokens.refreshToken);
  setCurrentUser(data.user);
  return data;
};

// Refresh the current token pair
export const refreshTokens = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const response = await fetch(`${AUTH_API}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    // If refresh fails, clear stored tokens
    await logout();
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  setTokens(data.tokens.accessToken, data.tokens.refreshToken);
  return data.tokens;
};

// Get user profile
export const getUserProfile = async () => {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error('No access token available');

  const response = await fetch(`${AUTH_API}/profile`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Try to refresh token
      try {
        await refreshTokens();
        return getUserProfile(); // Retry with new token
      } catch (refreshError) {
        throw new Error('Authentication expired');
      }
    }
    throw new Error('Failed to get user profile');
  }

  const data = await response.json();
  setCurrentUser(data.user);
  return data.user;
};

// Verify email address
export const verifyEmail = async (token) => {
  const response = await fetch(`${AUTH_API}/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Email verification failed');
  }

  return await response.json();
};

// Request password reset
export const requestPasswordReset = async (email) => {
  const response = await fetch(`${AUTH_API}/request-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Password reset request failed');
  }

  return await response.json();
};

// Reset password with token
export const resetPassword = async (token, newPassword) => {
  const response = await fetch(`${AUTH_API}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Password reset failed');
  }

  return await response.json();
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getAccessToken() && !!getCurrentUser();
};

// Check if token needs refresh (within 2 minutes of expiration)
const shouldRefreshToken = () => {
  const token = getAccessToken();
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    const timeUntilExpiry = payload.exp - now;
    
    // Refresh if token expires within 2 minutes (120 seconds)
    return timeUntilExpiry < 120;
  } catch (error) {
    return true; // If we can't parse, assume we need refresh
  }
};

// Get authorization header for API requests with automatic refresh
export const getAuthHeader = async () => {
  try {
    // Check if we need to refresh the token
    if (shouldRefreshToken()) {
      console.log('🔄 Auto-refreshing token before request...');
      await refreshTokens();
    }
    
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (error) {
    console.error('Failed to refresh token:', error);
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};

const authService = {
  login,
  signup,
  logout,
  refreshTokens,
  getUserProfile,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  isAuthenticated,
  getAccessToken,
  getRefreshToken,
  getCurrentUser,
  getAuthHeader
};

export default authService;

