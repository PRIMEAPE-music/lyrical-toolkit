import { useState, useEffect, createContext, useContext } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already authenticated on app startup
    const initAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser();
        if (currentUser && authService.isAuthenticated()) {
          // Verify token is still valid by fetching profile
          const profile = await authService.getUserProfile();
          setUser(profile);
        }
      } catch (error) {
        console.warn('Failed to restore authentication:', error);
        // Clear invalid tokens
        await authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (loginValue, password) => {
    try {
      setError(null);
      setLoading(true);
      const result = await authService.login(loginValue, password);
      setUser(result.user);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (username, email, password) => {
    try {
      setError(null);
      setLoading(true);
      const result = await authService.signup(username, email, password);
      setUser(result.user);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setError(null);
    } catch (error) {
      console.warn('Logout error:', error);
      // Force clear state even if server request fails
      setUser(null);
      setError(null);
    }
  };

  const verifyEmail = async (token) => {
    try {
      setError(null);
      const result = await authService.verifyEmail(token);
      // Update user verification status
      if (user) {
        setUser({ ...user, emailVerified: true });
      }
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      setError(null);
      return await authService.requestPasswordReset(email);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      setError(null);
      return await authService.resetPassword(token, newPassword);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const refreshProfile = async () => {
    try {
      if (authService.isAuthenticated()) {
        const profile = await authService.getUserProfile();
        setUser(profile);
        return profile;
      }
    } catch (error) {
      console.warn('Failed to refresh profile:', error);
      // If profile refresh fails, user might need to login again
      if (error.message.includes('expired')) {
        await logout();
      }
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    refreshProfile,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;