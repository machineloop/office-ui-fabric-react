import * as React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { isSlot, SLOT_ELEMENT_TYPE_SYMBOL } from '@fluentui/react-utilities';
import { useTableCell_unstable } from './useTableCell';
import type { TableCellProps, TableCellState } from './TableCell.types';
import { TableContextProvider, tableContextDefaultValue } from '../../contexts/tableContext';

function rootElementType(state: TableCellState) {
  const root = state.root;
  if (!isSlot(root)) {
    throw new Error('TableCell root must be a resolved slot');
  }
  return root[SLOT_ELEMENT_TYPE_SYMBOL];
}

describe('useTableCell', () => {
  it('defaults to a medium native cell without an explicit role', () => {
    const { result } = renderHook(() => useTableCell_unstable({}, React.createRef<HTMLElement>()));
    expect(rootElementType(result.current)).toBe('td');
    expect(result.current.size).toBe('medium');
    expect(result.current.noNativeElements).toBe(false);
    expect(result.current.root.role).toBeUndefined();
  });

  for (const noNativeElements of [false, true]) {
    for (const as of [undefined, 'td', 'div'] as const) {
      it(`resolves as=${as} with noNativeElements=${noNativeElements}`, () => {
        const wrapper = ({ children }: { children?: React.ReactNode }) => (
          <TableContextProvider value={{ ...tableContextDefaultValue, size: 'small', noNativeElements }}>
            {children}
          </TableContextProvider>
        );
        const { result } = renderHook(() => useTableCell_unstable({ as }, React.createRef<HTMLElement>()), { wrapper });
        const element = as ?? (noNativeElements ? 'div' : 'td');
        expect(rootElementType(result.current)).toBe(element);
        expect(result.current.root.as).toBe(as);
        expect(result.current.root.role).toBe(element === 'div' ? 'cell' : undefined);
        expect(result.current.noNativeElements).toBe(noNativeElements);
        expect(result.current.size).toBe('small');
      });
    }
  }

  it('preserves native props, references, children and event handler identity', () => {
    const ref = React.createRef<HTMLElement>();
    const onClick = jest.fn();
    const onKeyDown = jest.fn();
    const props: TableCellProps = {
      as: 'td',
      id: 'report',
      role: 'gridcell',
      colSpan: 2,
      rowSpan: 3,
      headers: 'file owner',
      'aria-describedby': 'help',
      tabIndex: -1,
      children: <strong>Report</strong>,
      onClick,
      onKeyDown,
    };
    const { result } = renderHook(() => useTableCell_unstable(props, ref));
    expect(result.current.root).toMatchObject(props);
    expect(result.current.root.ref).toBe(ref);
    expect(result.current.root.children).toBe(props.children);
    expect(result.current.root.onClick).toBe(onClick);
    expect(result.current.root.onKeyDown).toBe(onKeyDown);
  });
});
