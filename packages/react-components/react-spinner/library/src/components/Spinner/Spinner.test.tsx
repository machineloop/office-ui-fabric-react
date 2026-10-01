import * as React from 'react';
import { act, render } from '@testing-library/react';
import { Spinner } from './Spinner';
import { isConformant } from '../../testing/isConformant';

describe('Spinner', () => {
  isConformant({
    Component: Spinner,
    displayName: 'Spinner',
    testOptions: {
      'has-static-classnames': [
        {
          props: {
            label: 'Test Label',
          },
        },
      ],
    },
  });

  it('has role progressbar', () => {
    const result = render(<Spinner label="Default Spinner" />);
    expect(result.getByRole('progressbar', { name: 'Default Spinner' })).toBeTruthy();
  });

  it('renders Spinner with a label', () => {
    const result = render(<Spinner label="Loading" />);
    expect(result.getByText('Loading')).toBeDefined();
    expect(result.getByRole('progressbar')).toBeDefined();
  });

  it('does not render the ring or tail when the spinner slot is null', () => {
    const result = render(<Spinner spinner={null} />);
    expect(result.container.querySelector('.fui-Spinner__spinner')).toBeNull();
    expect(result.container.querySelector('.fui-Spinner__spinnerTail')).toBeNull();
    expect(result.getByRole('progressbar')).toBeTruthy();
  });

  it('preserves the root and ring when spinner visibility is overridden', () => {
    const testId = 'test-id';
    const result = render(<Spinner id={testId} spinner={{ style: { visibility: 'hidden' } }} />);
    expect(result.getByRole('progressbar').getAttribute('id')).toEqual('test-id');
    expect(result.container.querySelector<HTMLElement>('.fui-Spinner__spinner')!.style.visibility).toBe('hidden');
  });

  it('doesnt render Spinner or its label instantaneously when delay is added', () => {
    jest.useFakeTimers();
    try {
      const result = render(<Spinner delay={1000} label="Loading" />);
      expect(result.getByRole('progressbar')).toBeTruthy();
      expect(result.container.querySelector('.fui-Spinner__spinner')).toBeNull();
      expect(result.container.querySelector('.fui-Spinner__label')).toBeNull();
      act(() => jest.advanceTimersByTime(999));
      expect(result.container.querySelector('.fui-Spinner__spinner')).toBeNull();
      act(() => jest.advanceTimersByTime(1));
      expect(result.container.querySelector('.fui-Spinner__spinner')).not.toBeNull();
      expect(result.getByRole('progressbar', { name: 'Loading' })).toBeTruthy();
      result.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('cancels the exact pending visibility timer when unmounted', () => {
    jest.useFakeTimers();
    const timeout = jest.spyOn(global, 'setTimeout');
    const clear = jest.spyOn(global, 'clearTimeout');
    try {
      const result = render(<Spinner delay={1000} label="Loading" />);
      const index = timeout.mock.calls.findIndex(call => call[1] === 1000);
      expect(index).toBeGreaterThanOrEqual(0);
      const handle = timeout.mock.results[index].value;
      expect(clear).not.toHaveBeenCalledWith(handle);
      result.unmount();
      expect(clear).toHaveBeenCalledWith(handle);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      timeout.mockRestore();
      clear.mockRestore();
      jest.useRealTimers();
    }
  });

  it('retains zero label content and omits a null label and its relationship', () => {
    const result = render(<Spinner label={0} />);
    expect(result.getByRole('progressbar', { name: '0' })).toBeTruthy();
    result.rerender(<Spinner label={null} />);
    expect(result.container.querySelector('.fui-Spinner__label')).toBeNull();
    expect(result.getByRole('progressbar').hasAttribute('aria-labelledby')).toBe(false);
  });

  it('renders span as a root slot tag', () => {
    const result = render(<Spinner as="span" />);
    expect(result.getByRole('progressbar').tagName).toBe('SPAN');
  });
});
