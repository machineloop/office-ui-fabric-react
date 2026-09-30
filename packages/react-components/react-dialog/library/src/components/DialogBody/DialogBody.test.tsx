import * as React from 'react';
import { render } from '@testing-library/react';
import { DialogBody } from './DialogBody';
import { isConformant } from '../../testing/isConformant';
import type { DialogBodyProps } from './DialogBody.types';

describe('DialogBody', () => {
  isConformant<DialogBodyProps>({
    Component: DialogBody,
    displayName: 'DialogBody',
  });

  // TODO add more tests here, and create visual regression tests in /apps/vr-tests

  it('renders a default state', () => {
    const result = render(<DialogBody>Default DialogBody</DialogBody>);
    expect(result.container).toMatchSnapshot();
  });

  it('updates hidden state without retaining the hidden layout class', () => {
    const result = render(<DialogBody hidden>Details</DialogBody>);
    const body = result.container.firstElementChild!;
    const hiddenClassName = body.className;
    expect(body).toHaveAttribute('hidden');
    result.rerender(<DialogBody>Details</DialogBody>);
    expect(body).not.toHaveAttribute('hidden');
    expect(body.className).not.toEqual(hiddenClassName);
    result.rerender(<DialogBody hidden>Details</DialogBody>);
    expect(body).toHaveAttribute('hidden');
    expect(body.className).toEqual(hiddenClassName);
  });
});
