import * as React from 'react';
import { resetIdsForTests } from '@fluentui/react-utilities';
import { isConformant } from '../../testing/isConformant';
import { Divider } from './Divider';
import { render } from '@testing-library/react';

describe('Divider', () => {
  afterEach(() => {
    resetIdsForTests();
  });

  isConformant({
    Component: Divider,
    displayName: 'Divider',
    testOptions: {
      'has-static-classnames': [
        {
          props: { children: 'Test Children' },
        },
      ],
    },
  });

  it('renders a default divider', () => {
    const { container } = render(<Divider />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders a divider with content', () => {
    const { container } = render(<Divider>Default Divider</Divider>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders a divider with inset', () => {
    const { container } = render(<Divider inset>Inset</Divider>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders a subtle appearance', () => {
    const { container } = render(<Divider appearance="subtle">Subtle</Divider>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders a brand appearance', () => {
    const { container } = render(<Divider appearance="brand">Brand</Divider>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders a strong appearance', () => {
    const { container } = render(<Divider appearance="strong">Strong</Divider>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders content start aligned', () => {
    const { container } = render(<Divider alignContent="start">Start</Divider>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders content center aligned', () => {
    const { container } = render(<Divider alignContent="center">Center</Divider>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders content end aligned', () => {
    const { container } = render(<Divider alignContent="end">End</Divider>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders a divider with a different color', () => {
    const { container } = render(<Divider color="#FF00FF" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders a vertical divider', () => {
    const { container } = render(<Divider vertical />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders a vertical divider with content', () => {
    const { container } = render(<Divider vertical>Vertical</Divider>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders a vertical divider with a fixed height', () => {
    const { container } = render(
      <Divider style={{ height: 100 }} vertical>
        fixed 100px height
      </Divider>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders a horizontal divider with a fixed width', () => {
    const { container } = render(<Divider style={{ width: 100 }}>fixed 100px width</Divider>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('labels the separator using the resolved wrapper id, including updates', () => {
    const { getByRole, rerender } = render(<Divider wrapper={{ id: 'custom-label' }}>Section</Divider>);
    const separator = getByRole('separator', { name: 'Section' });
    expect(separator.getAttribute('aria-labelledby')).toBe('custom-label');
    expect(separator.firstElementChild?.id).toBe('custom-label');

    rerender(<Divider wrapper={{ id: 'updated-label' }}>Updated</Divider>);
    expect(getByRole('separator', { name: 'Updated' })).toBe(separator);
    expect(separator.getAttribute('aria-labelledby')).toBe('updated-label');
    expect(separator.firstElementChild?.id).toBe('updated-label');
  });

  it('preserves an explicit external label when the wrapper has a custom id', () => {
    const { getByRole } = render(
      <>
        <span id="external-label">External</span>
        <Divider wrapper={{ id: 'custom-label' }} aria-labelledby="external-label">
          Internal
        </Divider>
      </>,
    );
    const separator = getByRole('separator', { name: 'External' });
    expect(separator.getAttribute('aria-labelledby')).toBe('external-label');
    expect(separator.firstElementChild?.id).toBe('custom-label');
  });
});
