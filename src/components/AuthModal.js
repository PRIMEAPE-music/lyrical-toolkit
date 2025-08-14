import React, { useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthModal = ({ isOpen, mode: initialMode = 'login', onClose, onSuccess }) => {
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let result;
      if (mode === 'login') {
        result = await authService.login(username, password);
      } else {
        result = await authService.signup(username, password);
      }
      if (onSuccess) {
        onSuccess(result);
      }
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-80">
        <div className="flex mb-4">
          <button
            className={`flex-1 px-3 py-2 rounded-t ${mode === 'login' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            onClick={() => switchMode('login')}
          >
            Login
          </button>
          <button
            className={`flex-1 px-3 py-2 rounded-t ${mode === 'signup' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign Up
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-300">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">
              {mode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
