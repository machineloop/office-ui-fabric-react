import * as React from 'react';
import { render } from '@testing-library/react';
import { TableCell } from './TableCell';
import { isConformant } from '../../testing/isConformant';
import type { TableCellProps } from './TableCell.types';
import { TableContextProvider, tableContextDefaultValue } from '../../contexts/tableContext';

describe('TableCell', () => {
  isConformant<TableCellProps>({
    Component: TableCell,
    // The shared Griffel conformance helper renders directly into a generic body container.
    requiredProps: { as: 'div' },
    displayName: 'TableCell',
  });

  it('renders a default state', () => {
    const result = render(
      <table>
        <tbody>
          <tr>
            <TableCell>Default TableCell</TableCell>
          </tr>
        </tbody>
      </table>,
    );
    expect(result.container.querySelector('tr')).toMatchSnapshot();
  });

  it('renders as div if `noNativeElements` is set', () => {
    const { container } = render(
      <TableContextProvider value={{ ...tableContextDefaultValue, noNativeElements: true }}>
        <TableCell>Table cell</TableCell>
      </TableContextProvider>,
    );
    expect(container.firstElementChild?.tagName).toEqual('DIV');
    expect(container.firstElementChild?.getAttribute('role')).toEqual('cell');
  });

  it('honors explicit td over non-native context in valid native markup', () => {
    const { getByText } = render(
      <TableContextProvider value={{ ...tableContextDefaultValue, noNativeElements: true }}>
        <table>
          <tbody>
            <tr>
              <TableCell as="td">Explicit native cell</TableCell>
            </tr>
          </tbody>
        </table>
      </TableContextProvider>,
    );
    const cell = getByText('Explicit native cell');
    expect(cell.tagName).toBe('TD');
    expect(cell.hasAttribute('role')).toBe(false);
  });

  it('preserves native cell attributes, content, classes and forwarded ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { getByText } = render(
      <table>
        <tbody>
          <tr>
            <TableCell ref={ref} colSpan={2} rowSpan={3} headers="file owner" className="custom-cell">
              <strong>Native content</strong>
            </TableCell>
          </tr>
        </tbody>
      </table>,
    );
    const cell = getByText('Native content').closest('td');
    expect(ref.current).toBe(cell);
    expect(cell?.getAttribute('colspan')).toBe('2');
    expect(cell?.getAttribute('rowspan')).toBe('3');
    expect(cell?.getAttribute('headers')).toBe('file owner');
    expect(cell?.classList.contains('fui-TableCell')).toBe(true);
    expect(cell?.classList.contains('custom-cell')).toBe(true);
  });
});
