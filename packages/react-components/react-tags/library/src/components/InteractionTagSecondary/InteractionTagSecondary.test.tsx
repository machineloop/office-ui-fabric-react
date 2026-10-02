import { isConformant } from '../../testing/isConformant';
import { InteractionTagSecondary } from './InteractionTagSecondary';
import * as React from 'react';
import { render } from '@testing-library/react';
import { InteractionTag } from '../InteractionTag';
import { InteractionTagPrimary } from '../InteractionTagPrimary';

describe('InteractionTagSecondary', () => {
  it.each([null, undefined])('permits a complete action label with explicit aria-labelledby=%p', ariaLabelledBy => {
    const { getByRole } = render(
      <InteractionTag>
        <InteractionTagPrimary hasSecondaryAction>Calendar</InteractionTagPrimary>
        <InteractionTagSecondary aria-label="Remove Calendar" aria-labelledby={ariaLabelledBy} />
      </InteractionTag>,
    );
    expect(getByRole('button', { name: 'Remove Calendar' }).hasAttribute('aria-labelledby')).toBe(false);
  });

  isConformant({
    Component: InteractionTagSecondary,
    displayName: 'InteractionTagSecondary',
  });
});
