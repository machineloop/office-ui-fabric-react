import * as React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { assertSlots, SLOT_ELEMENT_TYPE_SYMBOL } from '@fluentui/react-utilities';
import { useTable_unstable } from './useTable';
import type { TableProps } from './Table.types';

describe('useTable root selection', () => {
  it.each<[TableProps, 'table' | 'div', string | undefined]>([
    [{}, 'table', undefined],
    [{ noNativeElements: true }, 'div', 'table'],
    [{ as: 'table' }, 'table', undefined],
    [{ as: 'table', noNativeElements: true }, 'table', undefined],
    [{ as: 'div' }, 'div', 'table'],
    [{ as: 'div', role: 'grid' }, 'div', 'grid'],
  ])('selects the explicit root before the native-element default for %p', (props, component, role) => {
    const ref = React.createRef<HTMLElement>();
    const { result } = renderHook(() => useTable_unstable(props, ref));
    assertSlots(result.current);
    expect(result.current.root[SLOT_ELEMENT_TYPE_SYMBOL]).toBe(component);
    expect(result.current.root.as).toBe(props.as);
    expect(result.current.root.role).toBe(role);
    expect(result.current.root.ref).toBe(ref);
    expect(result.current.noNativeElements).toBe(props.noNativeElements ?? false);
  });
});
