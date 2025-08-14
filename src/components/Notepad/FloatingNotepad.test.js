import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import FloatingNotepad from './FloatingNotepad';

test('updates position with arrow keys', () => {
  const setPosition = jest.fn();
  const notepadState = {
    content: '',
    title: '',
    isMinimized: false,
    dimensions: { width: 200, height: 200 },
    position: { bottom: 0, right: 0 },
    updateContent: jest.fn(),
    updateTitle: jest.fn(),
    toggleMinimized: jest.fn(),
    setPosition,
    currentEditingSongId: null,
  };

  const { container } = render(
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

  const root = container.firstChild;
  root.focus();
  fireEvent.keyDown(root, { key: 'ArrowUp' });
  expect(setPosition).toHaveBeenCalledWith({ bottom: 10, right: 0 });
});
