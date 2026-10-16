import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { AvatarGroupItem } from './AvatarGroupItem';
import { AvatarGroupContext } from '../../contexts';
import { isConformant } from '../../testing/isConformant';

const testId = 'testId';

const ContextWrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AvatarGroupContext.Provider value={{ isOverflow: true }}>{children}</AvatarGroupContext.Provider>
);

describe('AvatarGroupItem', () => {
  isConformant({
    Component: AvatarGroupItem,
    displayName: 'AvatarGroupItem',
    disabledTests: ['make-styles-overrides-win'],
    primarySlot: 'avatar',
    renderOptions: {
      wrapper: ContextWrapper,
    },
  });

  it('renders only an avatar when context provides false for isOverflow', () => {
    render(
      <AvatarGroupContext.Provider value={{ isOverflow: false }}>
        <AvatarGroupItem data-testid={testId} name="Katri Athokas" />
      </AvatarGroupContext.Provider>,
    );

    expect(screen.getByTestId(testId).textContent).toBe('KA');
  });

  it('renders a label and an avatar when context provides true for isOverflow', () => {
    render(
      <AvatarGroupContext.Provider value={{ isOverflow: true }}>
        <AvatarGroupItem name="Katri Athokas" overflowLabel={<span data-testid={testId}>Test Label</span>} />
      </AvatarGroupContext.Provider>,
    );

    expect(screen.getByTestId(testId).textContent).toBe('Test Label');
  });

  it.each([
    [undefined, 'Slot Only'],
    ['Stale Name', 'Resolved Name'],
  ])('defaults the overflow label to the resolved avatar name (%s -> %s)', (name, slotName) => {
    render(
      <ContextWrapper>
        <AvatarGroupItem name={name} avatar={{ name: slotName }} />
      </ContextWrapper>,
    );

    expect(screen.getByRole('img', { name: slotName })).toBeTruthy();
    expect(screen.getByText(slotName).getAttribute('aria-hidden')).toBe('true');
  });

  it('preserves an explicit overflow label when the avatar slot overrides the name', () => {
    render(
      <ContextWrapper>
        <AvatarGroupItem name="Default Name" avatar={{ name: 'Avatar Name' }} overflowLabel="Custom Label" />
      </ContextWrapper>,
    );

    expect(screen.getByRole('img', { name: 'Avatar Name' })).toBeTruthy();
    expect(screen.getByText('Custom Label').getAttribute('aria-hidden')).toBe('true');
  });
});
