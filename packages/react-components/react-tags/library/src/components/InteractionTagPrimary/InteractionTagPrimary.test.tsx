import { isConformant } from '../../testing/isConformant';
import { InteractionTagPrimary } from './InteractionTagPrimary';
import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InteractionTag } from '../InteractionTag';
import { TagGroup } from '../TagGroup';

const requiredProps = {
  media: 'media',
  icon: 'i',
  primaryText: 'Primary text',
  secondaryText: 'Secondary text',
};

describe('InteractionTagPrimary', () => {
  it('defaults to a non-submitting action while preserving explicit submit', () => {
    const submit = jest.fn();
    const { getByRole } = render(
      <form
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <InteractionTag>
          <InteractionTagPrimary type={undefined}>Calendar</InteractionTagPrimary>
        </InteractionTag>
        <InteractionTag>
          <InteractionTagPrimary type="submit">Submit</InteractionTagPrimary>
        </InteractionTag>
      </form>,
    );
    const action = getByRole('button', { name: 'Calendar' });
    expect(action.getAttribute('type')).toBe('button');
    userEvent.click(action);
    expect(submit).not.toHaveBeenCalled();
    const explicit = getByRole('button', { name: 'Submit' });
    expect(explicit.getAttribute('type')).toBe('submit');
    userEvent.click(explicit);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('composes consumer clicks with group selection and preserves the pre-selection callback state', () => {
    const click = jest.fn();
    const select = jest.fn();
    const { getByRole } = render(
      <TagGroup onTagSelect={select}>
        <InteractionTag value="a">
          <InteractionTagPrimary onClick={event => click(event.currentTarget.getAttribute('aria-pressed'))}>
            Calendar
          </InteractionTagPrimary>
        </InteractionTag>
      </TagGroup>,
    );
    const button = getByRole('button');
    userEvent.click(button);
    expect(click).toHaveBeenLastCalledWith('false');
    expect(select).toHaveBeenCalledTimes(1);
    expect(select.mock.calls[0][1].value).toBe('a');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    userEvent.click(button);
    expect(click).toHaveBeenLastCalledWith('true');
    expect(select).toHaveBeenCalledTimes(2);
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  isConformant({
    Component: InteractionTagPrimary,
    displayName: 'InteractionTagPrimary',
    requiredProps,
  });
});
