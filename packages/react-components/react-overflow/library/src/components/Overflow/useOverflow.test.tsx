import * as React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useOverflow_unstable } from './useOverflow';
import { useOverflowContainer } from '../../useOverflowContainer';

jest.mock('../../useOverflowContainer', () => ({
  useOverflowContainer: jest.fn(),
  updateVisibilityAttribute: jest.fn(),
}));

describe('useOverflow option resets', () => {
  it('forces a recompute for padding/minimum resets without requiring a resize', () => {
    const forceUpdateOverflow = jest.fn();
    const mockedContainer = useOverflowContainer as jest.MockedFunction<typeof useOverflowContainer>;
    mockedContainer.mockReturnValue({
      containerRef: React.createRef<HTMLElement>(),
      getSnapshot: jest.fn(),
      subscribe: jest.fn(),
      registerItem: jest.fn(),
      updateOverflow: jest.fn(),
      forceUpdateOverflow,
      registerOverflowMenu: jest.fn(),
      registerDivider: jest.fn(),
    });
    const ref = React.createRef<HTMLElement>();
    const { rerender } = renderHook(
      ({ padding, minimumVisible }) => useOverflow_unstable({ padding, minimumVisible, children: <div /> }, ref),
      { initialProps: { padding: 10, minimumVisible: 3 } },
    );
    forceUpdateOverflow.mockClear();

    rerender({ padding: 0, minimumVisible: 0 });

    expect(forceUpdateOverflow).toHaveBeenCalledTimes(1);
  });
});
