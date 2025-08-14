import React from 'react';
import { render } from '@testing-library/react';
import FloatingNotepad from './FloatingNotepad';

test('renders FloatingNotepad component', () => {
  const notepadState = {
    content: '',
    title: '',
    isMinimized: false,
    dimensions: { width: 200, height: 200 },
    position: { bottom: 0, right: 0 },
    updateContent: jest.fn(),
    updateTitle: jest.fn(),
    toggleMinimized: jest.fn(),
    setPosition: jest.fn(),
    currentEditingSongId: null,
  };

  render(
    <FloatingNotepad
      notepadState={notepadState}
      darkMode={false}
      onExportTxt={() => {}}
      onUploadToSongs={() => {}}
      onSaveChanges={() => {}}
      onRevertChanges={() => {}}
      onStartNewContent={() => {}}
      hasUnsavedChanges={false}
      originalSongContent=""
    />
  );
});
