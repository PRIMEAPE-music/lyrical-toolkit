import React, { useState } from 'react';
import { login, signup } from '../services/authService';

const AuthModal = ({ isOpen, onClose, onAuth, darkMode }) => {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = mode === 'login'
        ? await login(username, password)
        : await signup(username, password);
      onAuth(token);
      setUsername('');
      setPassword('');
      setError('');
    } catch (err) {
      setError(mode === 'login' ? 'Login failed' : 'Sign up failed');
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className={`relative p-6 rounded shadow-lg w-80 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-xl"
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-xl mb-4 text-center">{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : ''}`}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : ''}`}
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button
            type="submit"
            className={`w-full py-2 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <button onClick={toggleMode} className="mt-4 text-sm text-blue-500">
          {mode === 'login' ? 'Need an account? Sign Up' : 'Have an account? Login'}
        </button>
      </div>
    </div>
  );
};

export default AuthModal;
