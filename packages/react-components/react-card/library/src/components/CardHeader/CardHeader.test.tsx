import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Card } from '../Card/Card';
import { CardHeader } from './CardHeader';
import { isConformant } from '../../testing/isConformant';

describe('CardHeader', () => {
  isConformant({
    Component: CardHeader,
    displayName: 'CardHeader',
    testOptions: {
      'has-static-classnames': [
        {
          props: { image: 'Image Test', header: 'Header Test', description: 'Description Test', action: 'Action Test' },
        },
      ],
    },
  });

  it('renders a default state', () => {
    const result = render(
      <CardHeader image={'Image slot'} header="Title slot" description="Description slot" action={'Action slot'} />,
    );
    expect(result.container).toMatchSnapshot();
  });

  it('preserves explicit header slot ID precedence over a child ID after parent context updates', async () => {
    const { getByRole } = render(
      <Card onSelectionChange={() => undefined}>
        <CardHeader header={{ id: 'header-slot-id', children: <h2 id="child-heading-id">Card title</h2> }} />
      </Card>,
    );
    await waitFor(() => expect(getByRole('checkbox').getAttribute('aria-labelledby')).toBe('header-slot-id'));
  });

  it('keeps selectable labels resolved when an identified child is added then removed', async () => {
    const card = (header: string | React.ReactElement) => (
      <Card onSelectionChange={() => undefined}>
        <CardHeader header={header} />
      </Card>
    );
    const { getByRole, rerender } = render(card('Plain title'));
    rerender(card(<h2 id="identified-title">Identified title</h2>));
    await waitFor(() => expect(getByRole('checkbox').getAttribute('aria-labelledby')).toBe('identified-title'));
    rerender(card('Updated plain title'));
    await waitFor(() => {
      const checkbox = getByRole('checkbox');
      const reference = checkbox.getAttribute('aria-labelledby');
      expect(checkbox.ownerDocument.getElementById(reference!)?.textContent).toBe('Updated plain title');
    });
  });
});
