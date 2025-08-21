import React from 'react';
import { render, screen } from '@testing-library/react';
import FloatingNotepad from './FloatingNotepad';

test('renders FloatingNotepad component', () => {
  const notepadState = {
    content: 'Test content',
    title: 'Test Title',
    isMinimized: false,
    dimensions: { width: 200, height: 200 },
    position: { bottom: 20, right: 20 },
    updateContent: jest.fn(),
    updateTitle: jest.fn(),
    toggleMinimized: jest.fn(),
    setPosition: jest.fn(),
    currentEditingSongId: null
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
    />
  );

  expect(screen.getByDisplayValue('Test content')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument();
});
