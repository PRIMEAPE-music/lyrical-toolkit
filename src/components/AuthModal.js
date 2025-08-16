import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const AuthModal = ({ isOpen, onClose, darkMode }) => {
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const { login, signup, requestPasswordReset, error: authError } = useAuth();

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setLocalError('');
  };

  const validateForm = () => {
    if (mode === 'signup') {
      if (!formData.username || formData.username.length < 3) {
        return 'Username must be at least 3 characters';
      }
      if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
        return 'Please enter a valid email address';
      }
      if (!formData.password || formData.password.length < 8) {
        return 'Password must be at least 8 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        return 'Passwords do not match';
      }
    } else {
      if (!formData.username || !formData.password) {
        return 'Please fill in all fields';
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLoading(true);
    setLocalError('');

    try {
      if (mode === 'login') {
        await login(formData.username, formData.password);
      } else {
        await signup(formData.username, formData.email, formData.password);
      }
      
      // Success - close modal and reset form
      setFormData({ username: '', email: '', password: '', confirmPassword: '' });
      onClose();
    } catch (err) {
      setLocalError(err.message || (mode === 'login' ? 'Login failed' : 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setLocalError('');

    try {
      await requestPasswordReset(resetEmail);
      setResetMessage('Password reset instructions sent to your email');
      setResetEmail('');
    } catch (err) {
      setLocalError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setLocalError('');
    setShowPasswordReset(false);
    setResetMessage('');
    setFormData({ username: '', email: '', password: '', confirmPassword: '' });
  };

  const togglePasswordReset = () => {
    setShowPasswordReset(!showPasswordReset);
    setLocalError('');
    setResetMessage('');
    setResetEmail('');
  };

  const displayError = localError || authError;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className={`relative p-6 rounded-lg shadow-xl w-96 max-w-md mx-4 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-lg w-6 h-6 flex items-center justify-center hover:opacity-70 transition-opacity"
          aria-label="Close"
        >
          &times;
        </button>
        
        {showPasswordReset ? (
          <div>
            <h2 className="text-xl mb-4 text-center">Reset Password</h2>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <input
                type="email"
                placeholder="Enter your email address"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              
              {displayError && <div className="text-red-500 text-sm">{displayError}</div>}
              {resetMessage && <div className="text-green-500 text-sm">{resetMessage}</div>}
              
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 rounded-md font-medium transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-black' 
                    : 'bg-blue-500 hover:bg-blue-600 text-black'
                }`}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            
            <button 
              onClick={togglePasswordReset} 
              className="mt-4 text-sm text-blue-500 hover:text-blue-600"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl mb-4 text-center">{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="username"
                placeholder={mode === 'login' ? 'Username or Email' : 'Username'}
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`}
                disabled={loading}
                required
              />
              
              {mode === 'signup' && (
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                  }`}
                  disabled={loading}
                  required
                />
              )}
              
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`}
                disabled={loading}
                required
              />
              
              {mode === 'signup' && (
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                  }`}
                  disabled={loading}
                  required
                />
              )}
              
              {displayError && <div className="text-red-500 text-sm">{displayError}</div>}
              
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 rounded-md font-medium transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-black' 
                    : 'bg-blue-500 hover:bg-blue-600 text-black'
                }`}
              >
                {loading ? (mode === 'login' ? 'Logging in...' : 'Creating Account...') : (mode === 'login' ? 'Login' : 'Sign Up')}
              </button>
            </form>
            
            <div className="mt-4 text-center space-y-2">
              <button 
                onClick={toggleMode} 
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                {mode === 'login' ? 'Need an account? Sign Up' : 'Have an account? Login'}
              </button>
              
              {mode === 'login' && (
                <div>
                  <button 
                    onClick={togglePasswordReset} 
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
