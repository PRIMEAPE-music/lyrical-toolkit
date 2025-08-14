import { render, screen, fireEvent } from '@testing-library/react';
import FloatingNotepad from './FloatingNotepad';

test('removes asterisks from title input', () => {
  const updateTitle = jest.fn();
  const mockState = {
    content: '',
    title: '',
    isMinimized: false,
    dimensions: { width: 300, height: 300 },
    updateContent: jest.fn(),
    updateTitle,
    toggleMinimized: jest.fn(),
    currentEditingSongId: null
  };

  render(
    <FloatingNotepad
      notepadState={mockState}
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

  const input = screen.getByPlaceholderText('Title...');
  fireEvent.change(input, { target: { value: 'My*Song' } });

  expect(updateTitle).toHaveBeenCalledWith('MySong');
});
