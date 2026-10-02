import * as React from 'react';
import { render } from '@testing-library/react';
import { TableCellLayout } from './TableCellLayout';
import { isConformant } from '../../testing/isConformant';
import type { TableCellLayoutProps } from './TableCellLayout.types';

describe('TableCellLayout', () => {
  it('renders numeric zero main content instead of dropping the content wrapper', () => {
    const { getByText } = render(<TableCellLayout>{0}</TableCellLayout>);
    expect(getByText('0').className).toContain('fui-TableCellLayout__main');
  });

  it('renders an explicit main slot without root children and gives it precedence over default children', () => {
    const { getByText, queryByText, rerender } = render(<TableCellLayout main="Override" />);
    expect(getByText('Override').className).toContain('fui-TableCellLayout__main');
    rerender(<TableCellLayout main={{ children: 'Override' }}>Default</TableCellLayout>);
    expect(getByText('Override')).toBeTruthy();
    expect(queryByText('Default')).toBeNull();
  });

  it('preserves explicitly disabled content and main slots', () => {
    const { container, rerender } = render(
      <TableCellLayout content={null} description="Hidden">
        Hidden
      </TableCellLayout>,
    );
    expect(container.querySelector('.fui-TableCellLayout__content')).toBeNull();
    rerender(
      <TableCellLayout main={null} description="Details">
        Hidden
      </TableCellLayout>,
    );
    expect(container.querySelector('.fui-TableCellLayout__main')).toBeNull();
    expect(container.querySelector('.fui-TableCellLayout__description')?.textContent).toBe('Details');
  });

  isConformant<TableCellLayoutProps>({
    Component: TableCellLayout,
    displayName: 'TableCellLayout',
    testOptions: {
      'has-static-classnames': [
        {
          props: {
            media: 'Test Icon',
            main: 'Main content',
            description: 'Secondary content',
          },
        },
      ],
    },
  });

  it('renders a default state', () => {
    const result = render(<TableCellLayout>Default TableCellLayout</TableCellLayout>);
    expect(result.container).toMatchSnapshot();
  });
});
