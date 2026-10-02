import { resetIdsForTests } from '@fluentui/react-utilities';
import * as React from 'react';
import { AccordionHeader } from './AccordionHeader';
import type { AccordionHeaderProps } from './AccordionHeader.types';
import { render, fireEvent, screen } from '@testing-library/react';
import { isConformant } from '../../testing/isConformant';
import { Accordion } from '../Accordion/Accordion';
import { AccordionItem } from '../AccordionItem';
import { AccordionPanel } from '../AccordionPanel';

describe('AccordionHeader', () => {
  isConformant<AccordionHeaderProps>({
    Component: AccordionHeader,
    displayName: 'AccordionHeader',
    testOptions: {
      'has-static-classnames': [
        {
          props: {
            icon: 'Test Icon',
          },
        },
      ],
    },
  });

  afterEach(() => {
    resetIdsForTests();
  });

  /**
   * Note: see more visual regression tests for AccordionHeader in /apps/vr-tests.
   */
  it('renders a default state', () => {
    const { container } = render(<AccordionHeader>Default AccordionHeader</AccordionHeader>);
    expect(container.firstChild).toMatchSnapshot();
  });

  /**
   * Note: see more visual regression tests for AccordionHeader in /apps/vr-tests.
   */
  it('renders when expandIcon is null', () => {
    const { container } = render(<AccordionHeader expandIcon={null}>Default AccordionHeader</AccordionHeader>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should invoke click and toggle', () => {
    const mockClick = jest.fn();
    render(
      <Accordion collapsible openItems={0} onToggle={mockClick}>
        <AccordionItem value={0}>
          <AccordionHeader button={{ onClick: mockClick }}>Header</AccordionHeader>
          <AccordionPanel>Panel</AccordionPanel>
        </AccordionItem>
      </Accordion>,
    );
    const button = screen.getByRole('button');
    fireEvent.click(button, { defaultPrevented: false });
    expect(mockClick).toHaveBeenCalledTimes(2);
  });

  it('should invoke click and prevent toggle', () => {
    const mockClick = jest.fn();
    render(
      <Accordion collapsible openItems={0} onToggle={mockClick}>
        <AccordionItem value={0}>
          <AccordionHeader button={{ onClick: mockClick }}>Header</AccordionHeader>
          <AccordionPanel>Panel</AccordionPanel>
        </AccordionItem>
      </Accordion>,
    );
    const button = screen.getByRole('button');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'defaultPrevented', { value: true });
    button.dispatchEvent(event);
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it.each([false, undefined])('retains item disability when button.disabled is %s', disabled => {
    const toggle = jest.fn();
    render(
      <Accordion collapsible onToggle={toggle}>
        <AccordionItem value="a" disabled>
          <AccordionHeader button={{ disabled }}>Blocked</AccordionHeader>
          <AccordionPanel>Blocked content</AccordionPanel>
        </AccordionItem>
      </Accordion>,
    );
    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(toggle).not.toHaveBeenCalled();
  });

  it('retains local button disabling on an enabled item', () => {
    const toggle = jest.fn();
    render(
      <Accordion collapsible onToggle={toggle}>
        <AccordionItem value="a">
          <AccordionHeader button={{ disabled: true }}>Locally disabled</AccordionHeader>
        </AccordionItem>
      </Accordion>,
    );
    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(toggle).not.toHaveBeenCalled();
  });

  it('recovers from live inherited disability with unchanged slot props', () => {
    const button = { id: 'stable-slot' };
    const Fixture = ({ disabled }: { disabled: boolean }) => (
      <Accordion collapsible>
        <AccordionItem value="a" disabled={disabled}>
          <AccordionHeader button={button}>Header</AccordionHeader>
        </AccordionItem>
      </Accordion>
    );
    const { getByRole, rerender } = render(<Fixture disabled={false} />);
    expect((getByRole('button') as HTMLButtonElement).disabled).toBe(false);
    rerender(<Fixture disabled />);
    expect((getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    rerender(<Fixture disabled={false} />);
    expect((getByRole('button') as HTMLButtonElement).disabled).toBe(false);
  });
});
