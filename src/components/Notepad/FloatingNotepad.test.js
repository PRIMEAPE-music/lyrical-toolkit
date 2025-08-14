import React from 'react';
import { render } from '@testing-library/react';
import FloatingNotepad from './FloatingNotepad';

test('updates dimensions when resized', () => {
  let resizeCb;
  global.ResizeObserver = class {
    constructor(cb) {
      resizeCb = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  const updateDimensions = jest.fn();
  const notepadState = {
    content: '',
    title: '',
    isMinimized: false,
    dimensions: { width: 200, height: 200 },
    updateContent: jest.fn(),
    updateTitle: jest.fn(),
    toggleMinimized: jest.fn(),
    updateDimensions,
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
      originalSongContent=""
    />
  );

  resizeCb([{ contentRect: { width: 350, height: 260 } }]);
  expect(updateDimensions).toHaveBeenCalledWith({ width: 350, height: 260 });
});
