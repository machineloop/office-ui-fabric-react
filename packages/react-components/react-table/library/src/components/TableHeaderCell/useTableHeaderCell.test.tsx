import * as React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { render } from '@testing-library/react';
import { isSlot, SLOT_ELEMENT_TYPE_SYMBOL } from '@fluentui/react-utilities';
import { useTableHeaderCell_unstable } from './useTableHeaderCell';
import { TableHeaderCell } from './TableHeaderCell';
import { TableContextProvider, tableContextDefaultValue } from '../../contexts/tableContext';

describe('useTableHeaderCell local regressions', () => {
  for (const noNativeElements of [false, true]) {
    for (const as of [undefined, 'th', 'div'] as const) {
      it(`explicit as=${as} precedes noNativeElements=${noNativeElements}`, () => {
        const wrapper = ({ children }: { children?: React.ReactNode }) => (
          <TableContextProvider value={{ ...tableContextDefaultValue, noNativeElements }}>
            {children}
          </TableContextProvider>
        );
        const { result } = renderHook(() => useTableHeaderCell_unstable({ as }, React.createRef<HTMLElement>()), {
          wrapper,
        });
        const tag = as ?? (noNativeElements ? 'div' : 'th');
        const root = result.current.root;
        if (!isSlot(root)) {
          throw new Error('TableHeaderCell root must be a resolved slot');
        }
        expect(root[SLOT_ELEMENT_TYPE_SYMBOL]).toBe(tag);
        expect(result.current.root.role).toBe(tag === 'div' ? 'columnheader' : undefined);
      });
    }
  }

  it('preserves typed th abbr and headers attributes with explicit native tag and ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { getByTestId } = render(
      <table>
        <thead>
          <tr>
            <TableHeaderCell
              as="th"
              data-testid="header"
              ref={ref}
              colSpan={2}
              rowSpan={3}
              scope="col"
              abbr="Doc"
              headers="group"
            >
              Document
            </TableHeaderCell>
          </tr>
        </thead>
      </table>,
    );
    const header = getByTestId('header');
    expect(header.tagName).toBe('TH');
    expect(header.getAttribute('abbr')).toBe('Doc');
    expect(header.getAttribute('headers')).toBe('group');
    expect(header.getAttribute('colspan')).toBe('2');
    expect(header.getAttribute('rowspan')).toBe('3');
    expect(header.getAttribute('scope')).toBe('col');
    expect(ref.current).toBe(header);
  });

  it('does not leak th-only attributes to an explicit div', () => {
    const nativeProps = { abbr: 'Doc', headers: 'group' };
    const { getByTestId } = render(
      <TableHeaderCell as="div" data-testid="header" {...nativeProps}>
        Document
      </TableHeaderCell>,
    );
    expect(getByTestId('header').hasAttribute('abbr')).toBe(false);
    expect(getByTestId('header').hasAttribute('headers')).toBe(false);
  });
});
