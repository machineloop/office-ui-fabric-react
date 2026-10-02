import * as React from 'react';
import { render } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { useTableBody_unstable } from './useTableBody';
import { TableBody } from './TableBody';
import { isConformant } from '../../testing/isConformant';
import type { TableBodyProps } from './TableBody.types';
import { tableContextDefaultValue, TableContextProvider } from '../../contexts/tableContext';

const table = document.createElement('table');
describe('TableBody', () => {
  it.each([
    [false, undefined, 'tbody', undefined],
    [true, undefined, 'div', 'rowgroup'],
    [false, 'tbody', 'tbody', undefined],
    [true, 'tbody', 'tbody', undefined],
    [false, 'div', 'div', 'rowgroup'],
    [true, 'div', 'div', 'rowgroup'],
  ] as const)(
    'preserves context %p and explicit root %p as %p with role %p',
    (noNativeElements, as, expected, role) => {
      const { result } = renderHook(() => useTableBody_unstable({ as }, React.createRef()), {
        wrapper: ({ children }) => (
          <TableContextProvider value={{ ...tableContextDefaultValue, noNativeElements }}>
            {children}
          </TableContextProvider>
        ),
      });
      expect(result.current.components.root).toBe(expected);
      expect(result.current.root.role).toBe(role);
    },
  );

  beforeEach(() => {
    document.body.appendChild(table);
  });
  isConformant({
    Component: TableBody as React.FC<TableBodyProps>,
    displayName: 'TableBody',
    renderOptions: {
      container: table,
    },
  });

  it('renders a default state', () => {
    const result = render(
      <TableBody>
        <tr>
          <td>cell</td>
        </tr>
      </TableBody>,
      { container: table },
    );
    expect(result.container).toMatchSnapshot();
  });

  it('renders as div if `noNativeElements` is set', () => {
    const { container } = render(
      <TableContextProvider value={{ ...tableContextDefaultValue, noNativeElements: true }}>
        <TableBody>
          <div>
            <div>Cell</div>
          </div>
        </TableBody>
      </TableContextProvider>,
    );
    expect(container.firstElementChild?.tagName).toEqual('DIV');
    expect(container.firstElementChild?.getAttribute('role')).toEqual('rowgroup');
  });
});
