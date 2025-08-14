import React, { useState, useEffect } from 'react';
import { Search, Upload, BarChart3, Book, Shuffle, Music, Moon, Sun } from 'lucide-react';

const Header = ({
  activeTab,
  setActiveTab,
  showManual,
  setShowManual,
  darkMode,
  setDarkMode,
  isAuthenticated,
  onLoginClick,
  onSignupClick

}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (isMobile) {
    // Mobile layout
    return (
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-50 transition-colors duration-300`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* Mobile header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              style={darkMode ? { color: 'white' } : {}}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
              Lyrical-Toolkit
            </h1>
            
            <div className="flex items-center gap-2">
              {!isAuthenticated && (
                <>
                  <button
                    onClick={onLoginClick}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={onSignupClick}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Sign Up
                  </button>
                </>
              )}
              <button
                onClick={() => setShowManual(!showManual)}
                className={`p-2 rounded-lg transition-colors ${
                  showManual
                    ? 'bg-blue-600 text-white'

                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Show Manual"
              >
                <Book className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Mobile tabs */}
          <div className="space-y-2">
            {/* First row: Dictionary, Synonyms, Rhymes */}
            <div className="flex justify-center gap-2">
              {['dictionary', 'synonyms', 'rhymes'].map((tab) => {
                const icons = {
                  dictionary: Book,
                  synonyms: Shuffle,
                  rhymes: Music
                };
                const Icon = icons[tab];
                
                const displayName = tab.charAt(0).toUpperCase() + tab.slice(1);

                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setShowManual(false);
                    }}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors text-xs ${
                      activeTab === tab && !showManual
                        ? darkMode 
                          ? 'bg-black text-white'
                          : 'bg-gray-900 text-white'
                        : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-3 h-3 inline mr-1" />
                    {displayName}
                  </button>
                );
              })}
            </div>

            {/* Second row: Upload (centered) */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setActiveTab('upload');
                  setShowManual(false);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-xs ${
                  activeTab === 'upload' && !showManual
                    ? darkMode 
                      ? 'bg-black text-white'
                      : 'bg-gray-900 text-white'
                    : darkMode
                      ? 'bg-blue-700 text-blue-200 hover:bg-blue-600 hover:text-white border-2 border-blue-500'
                      : 'bg-blue-200 text-blue-800 hover:bg-blue-300 border-2 border-blue-400'
                }`}
              >
                <Upload className="w-3 h-3 inline mr-1" />
                Upload
              </button>
            </div>

            {/* Third row: Search, Analysis, Stats */}
            <div className="flex justify-center gap-2">
              {['search', 'analysis', 'stats'].map((tab) => {
                const icons = {
                  search: Search,
                  analysis: BarChart3,
                  stats: BarChart3
                };
                const Icon = icons[tab];
                
                const displayName = tab.charAt(0).toUpperCase() + tab.slice(1);

                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setShowManual(false);
                    }}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors text-xs ${
                      activeTab === tab && !showManual
                        ? darkMode 
                          ? 'bg-black text-white'
                          : 'bg-gray-900 text-white'
                        : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-3 h-3 inline mr-1" />
                    {displayName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-50 transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Desktop header */}
        <div style={{ display: 'table', width: '100%', marginBottom: '1rem' }}>
          <div style={{ display: 'table-cell', width: '33.33%', verticalAlign: 'middle' }}>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors dark-mode-toggle ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              style={darkMode ? { color: 'white' } : {}}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          
          <div style={{ display: 'table-cell', width: '33.33%', verticalAlign: 'middle', textAlign: 'center' }}>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
              Lyrical-Toolkit
            </h1>
          </div>
          
          <div style={{ display: 'table-cell', width: '33.33%', verticalAlign: 'middle', textAlign: 'right' }}>
            <div className="flex justify-end gap-2">
              {!isAuthenticated && (
                <>
                  <button
                    onClick={onLoginClick}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={onSignupClick}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Sign Up
                  </button>
                </>
              )}

              <button
                onClick={() => setShowManual(!showManual)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  showManual
                    ? darkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-600 text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Book className="w-4 h-4 inline mr-2" />
                Show Manual
              </button>
            </div>
          </div>
        </div>
        
        {/* Desktop tabs */}
        <div style={{ 
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ 
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            {['dictionary', 'synonyms', 'rhymes','upload','search', 'analysis', 'stats'].map((tab) => {
              const icons = {
                search: Search,
                dictionary: Book,
                synonyms: Shuffle,
                rhymes: Music,
                analysis: BarChart3,
                upload: Upload,
                stats: BarChart3
              };
              const Icon = icons[tab];
              
              const displayName = tab.charAt(0).toUpperCase() + tab.slice(1);
              const isUploadTab = tab === 'upload';

              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setShowManual(false);
                  }}
                  style={{
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    border: isUploadTab ? '2px solid' : '1px solid',
                    borderColor: isUploadTab 
                      ? (darkMode ? '#3b82f6' : '#60a5fa')
                      : (darkMode ? '#4b5563' : '#d1d5db'),
                    backgroundColor: activeTab === tab && !showManual
                      ? (darkMode ? '#000000' : '#1f2937')
                      : isUploadTab
                        ? (darkMode ? '#1e3a8a' : '#dbeafe')
                        : (darkMode ? '#374151' : '#f3f4f6'),
                    color: activeTab === tab && !showManual
                      ? '#ffffff'
                      : isUploadTab
                        ? (darkMode ? '#93c5fd' : '#1e40af')
                        : (darkMode ? '#d1d5db' : '#374151'),
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '120px'
                  }}
                >
                  <Icon style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                  {displayName}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;