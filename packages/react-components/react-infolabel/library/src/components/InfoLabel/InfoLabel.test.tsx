import * as React from 'react';

import { fireEvent, render } from '@testing-library/react';
import { isConformant } from '../../testing/isConformant';
import { InfoLabel } from './InfoLabel';

describe('InfoLabel', () => {
  it('resets ownership when an open optional button is removed and reinserted closed', () => {
    const result = render(
      <InfoLabel className="wrapper" info="Details" infoButton={{ popover: { defaultOpen: true } }}>
        Name
      </InfoLabel>,
    );
    result.rerender(<InfoLabel className="wrapper">Name</InfoLabel>);
    result.rerender(
      <InfoLabel className="wrapper" info="Details">
        Name
      </InfoLabel>,
    );

    expect(result.container.querySelector('.wrapper')?.hasAttribute('aria-owns')).toBe(false);
  });

  it('uses an overridden info ID for the default self-referencing popup name', () => {
    const result = render(<InfoLabel info={{ id: 'custom-note', children: 'Details' }}>Name</InfoLabel>);
    fireEvent.click(result.getByRole('button'));

    expect(result.getByRole('note').getAttribute('aria-labelledby')).toBe('custom-note');
  });

  it('owns the info surface when the popup is initially open', () => {
    const result = render(
      <InfoLabel
        className="wrapper"
        info={{ id: 'initial-note', children: 'Details' }}
        infoButton={{ popover: { defaultOpen: true } }}
      >
        Name
      </InfoLabel>,
    );

    expect(result.container.querySelector('.wrapper')?.getAttribute('aria-owns')).toBe('initial-note');
  });

  it('does not claim ownership for a controlled closed popup opening request', () => {
    const result = render(
      <InfoLabel
        className="wrapper"
        info={{ id: 'frozen-note', children: 'Details' }}
        infoButton={{ popover: { open: false } }}
      >
        Name
      </InfoLabel>,
    );
    fireEvent.click(result.getByRole('button'));

    expect(result.container.querySelector('.wrapper')?.hasAttribute('aria-owns')).toBe(false);
  });

  it('removes ownership when focus leaves the button and popup', () => {
    const result = render(
      <>
        <InfoLabel className="wrapper" info={{ id: 'blur-note', children: 'Details' }}>
          Name
        </InfoLabel>
        <button>Outside</button>
      </>,
    );
    fireEvent.click(result.getByRole('button', { name: /information/ }));
    fireEvent.blur(result.getByRole('note'), { relatedTarget: result.getByRole('button', { name: 'Outside' }) });

    expect(result.container.querySelector('.wrapper')?.hasAttribute('aria-owns')).toBe(false);
  });
  isConformant({
    Component: InfoLabel,
    displayName: 'InfoLabel',
    primarySlot: 'label',
    testOptions: {
      'has-static-classnames': [
        {
          props: {
            info: 'Test',
          },
        },
      ],
    },
  });

  it('renders an InfoButton when info is set', () => {
    const result = render(<InfoLabel info="Test">Test label</InfoLabel>);
    expect(result.getByRole('button')).toBeTruthy();
  });

  it("renders an InfoButton when the infoButton's info slot is set", () => {
    const result = render(<InfoLabel infoButton={{ info: 'Test' }}>Test label</InfoLabel>);
    expect(result.getByRole('button')).toBeTruthy();
  });

  it('does not render an InfoButton when info is not set', () => {
    const result = render(<InfoLabel>Test label</InfoLabel>);
    expect(result.queryByRole('button')).toBeNull();
  });

  it('sets the infoButton aria-labelledby to the label and infoButton', () => {
    const result = render(<InfoLabel info="Test">Test label</InfoLabel>);

    const infoButton = result.getByRole('button');
    const label = result.getByText('Test label') as HTMLLabelElement;

    expect(infoButton.getAttribute('aria-labelledby')).toBe(`${label.id} ${infoButton.id}`);
  });

  it("applies InfoButton's info slot id to aria-owns on the InfoLabel's wrapper when open", () => {
    const { container } = render(<InfoLabel className="info-label-wrapper" info={{ id: 'test-id' }} />);
    expect(container.getElementsByClassName('info-label-wrapper')[0].getAttribute('aria-owns')).toBeNull();

    fireEvent.click(container.getElementsByTagName('button')[0]);

    expect(container.getElementsByClassName('info-label-wrapper')[0].getAttribute('aria-owns')).toBe('test-id');
  });

  it("applies InfoButton's correct id to aria-owns on the InfoLabel's wrapper when id is provided to the infoButton slot", () => {
    const { container } = render(<InfoLabel className="info-label-wrapper" infoButton={{ info: { id: 'test-id' } }} />);
    expect(container.getElementsByClassName('info-label-wrapper')[0].getAttribute('aria-owns')).toBeNull();

    fireEvent.click(container.getElementsByTagName('button')[0]);

    expect(container.getElementsByClassName('info-label-wrapper')[0].getAttribute('aria-owns')).toBe('test-id');
  });
});
