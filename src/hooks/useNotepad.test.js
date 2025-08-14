import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotepad } from './useNotepad';

describe('useNotepad', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('restores dimensions from localStorage on reload', async () => {
    const { result, unmount } = renderHook(() => useNotepad());

    act(() => {
      result.current.updateDimensions({ width: 300, height: 200 });
    });

    unmount();

    const { result: result2 } = renderHook(() => useNotepad());
    await waitFor(() => {
      expect(result2.current.dimensions).toEqual({ width: 300, height: 200 });
    });
  });
});
