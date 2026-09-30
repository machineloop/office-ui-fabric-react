import * as React from 'react';
import { render } from '@testing-library/react';
import { DialogActions } from './DialogActions';
import { isConformant } from '../../testing/isConformant';
import type { DialogActionsProps } from './DialogActions.types';

describe('DialogActions', () => {
  isConformant<DialogActionsProps>({
    Component: DialogActions,
    displayName: 'DialogActions',
  });

  // TODO add more tests here, and create visual regression tests in /apps/vr-tests

  it('renders a default state', () => {
    const result = render(<DialogActions>Default DialogActions</DialogActions>);
    expect(result.container).toMatchSnapshot();
  });

  it('updates hidden state without retaining the hidden layout class', () => {
    const result = render(<DialogActions hidden>Actions</DialogActions>);
    const root = result.container.firstElementChild!;
    const hiddenClassName = root.className;
    expect(root).toHaveAttribute('hidden');
    result.rerender(<DialogActions>Actions</DialogActions>);
    expect(root).not.toHaveAttribute('hidden');
    expect(root.className).not.toEqual(hiddenClassName);
    result.rerender(<DialogActions hidden>Actions</DialogActions>);
    expect(root).toHaveAttribute('hidden');
    expect(root.className).toEqual(hiddenClassName);
  });
});
