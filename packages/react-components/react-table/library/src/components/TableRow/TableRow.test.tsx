import * as React from 'react';
import { render } from '@testing-library/react';
import { TableRow } from './TableRow';
import { isConformant } from '../../testing/isConformant';
import type { TableRowProps } from './TableRow.types';
import { TableContextProvider, tableContextDefaultValue } from '../../contexts/tableContext';

const tbody = document.createElement('tbody');
describe('TableRow', () => {
  beforeEach(() => {
    tbody.remove();
    document.body.appendChild(tbody);
  });

  isConformant({
    Component: TableRow as React.FunctionComponent<TableRowProps>,
    renderOptions: {
      container: tbody,
    },
    displayName: 'TableRow',
  });

  it.each([false, true])('honors explicit tr with noNativeElements=%s', noNativeElements => {
    const ref = React.createRef<HTMLDivElement>();
    const { getByTestId } = render(
      <TableContextProvider value={{ ...tableContextDefaultValue, noNativeElements }}>
        <table>
          <tbody>
            <TableRow as="tr" ref={ref} data-testid="row" title="Native row" aria-selected className="consumer">
              <td>Native cell</td>
            </TableRow>
          </tbody>
        </table>
      </TableContextProvider>,
    );
    const row = getByTestId('row');
    expect(row.tagName).toBe('TR');
    expect(row.hasAttribute('role')).toBe(false);
    expect(row.getAttribute('title')).toBe('Native row');
    expect(row.getAttribute('aria-selected')).toBe('true');
    expect(row.classList.contains('consumer')).toBe(true);
    expect(ref.current).toBe(row);
  });

  it('renders a default state', () => {
    const result = render(
      <TableRow>
        <td>Table Cell</td>
      </TableRow>,
      { container: tbody },
    );
    expect(result.container).toMatchSnapshot();
  });

  it('renders as div if `noNativeElements` is set', () => {
    const { container } = render(
      <TableContextProvider value={{ ...tableContextDefaultValue, noNativeElements: true }}>
        <TableRow>
          <div>Table cell</div>
        </TableRow>
      </TableContextProvider>,
    );
    expect(container.firstElementChild?.tagName).toEqual('DIV');
    expect(container.firstElementChild?.getAttribute('role')).toEqual('row');
  });
});
