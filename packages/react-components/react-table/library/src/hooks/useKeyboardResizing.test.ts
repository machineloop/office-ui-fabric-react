import { act, renderHook } from '@testing-library/react-hooks';
import { useKeyboardResizing } from './useKeyboardResizing';
import type { ColumnResizeState } from './types';

describe('useKeyboardResizing', () => {
  it('switches from another column to zero and disables zero on the next toggle', () => {
    const resizeState: ColumnResizeState = {
      getColumnWidth: () => 200,
      setColumnWidth: jest.fn(),
      getColumnById: () => undefined,
      getColumns: () => [],
    };
    const onChange = jest.fn();
    const { result } = renderHook(() => useKeyboardResizing(resizeState));
    act(() => result.current.toggleInteractiveMode(1, onChange));
    expect(result.current.columnId).toBe(1);
    act(() => result.current.toggleInteractiveMode(0, onChange));
    expect(result.current.columnId).toBe(0);
    expect(onChange).toHaveBeenLastCalledWith(0, true);
    act(() => result.current.toggleInteractiveMode(0, onChange));
    expect(result.current.columnId).toBeUndefined();
    expect(onChange).toHaveBeenLastCalledWith(0, false);
  });
});
