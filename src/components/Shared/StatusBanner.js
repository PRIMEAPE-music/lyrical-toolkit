import React, { useEffect } from 'react';

const StatusBanner = ({ message, onClose, darkMode }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-green-100 text-green-800'}`}
    >
      {message}
    </div>
  );
};

export default StatusBanner;
