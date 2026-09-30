import * as React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { render } from '@testing-library/react';
import { FluentProvider } from '@fluentui/react-provider';
import { useDisableBodyScroll } from './useDisableBodyScroll';

describe('useDisableBodyScroll', () => {
  const setup = () => {
    const { container } = render(<div />);
    const targetDocument = container.ownerDocument;
    const rect = targetDocument.body.getBoundingClientRect();
    const measurement = jest.spyOn(targetDocument.body, 'getBoundingClientRect').mockReturnValue({
      ...rect,
      height: (targetDocument.defaultView?.innerHeight ?? 0) + 100,
    });
    const wrapper = ({ children }: { children?: React.ReactNode }) => (
      <FluentProvider targetDocument={targetDocument}>{children}</FluentProvider>
    );
    return { targetDocument, measurement, wrapper };
  };

  afterEach(() => jest.restoreAllMocks());

  it('does not release another instance lock when an inactive nested dialog closes', () => {
    const { targetDocument, wrapper } = setup();
    const outer = renderHook(() => useDisableBodyScroll(), { wrapper });
    const inner = renderHook(() => useDisableBodyScroll(), { wrapper });
    const originalHTML = targetDocument.documentElement.className;
    const originalBody = targetDocument.body.className;
    act(() => outer.result.current.disableBodyScroll());
    const lockedHTML = targetDocument.documentElement.className;
    const lockedBody = targetDocument.body.className;
    expect(lockedHTML).not.toEqual(originalHTML);
    expect(lockedBody).not.toEqual(originalBody);
    act(() => inner.result.current.enableBodyScroll());
    expect(targetDocument.documentElement.className).toEqual(lockedHTML);
    expect(targetDocument.body.className).toEqual(lockedBody);
    act(() => outer.result.current.enableBodyScroll());
    expect(targetDocument.documentElement.className).toEqual(originalHTML);
    expect(targetDocument.body.className).toEqual(originalBody);
  });

  it('releases shared locks only after the last owner and tolerates repeated calls', () => {
    const { targetDocument, wrapper } = setup();
    const first = renderHook(() => useDisableBodyScroll(), { wrapper });
    const second = renderHook(() => useDisableBodyScroll(), { wrapper });
    const originalHTML = targetDocument.documentElement.className;
    const originalBody = targetDocument.body.className;
    act(() => {
      first.result.current.disableBodyScroll();
      first.result.current.disableBodyScroll();
      second.result.current.disableBodyScroll();
    });
    const lockedHTML = targetDocument.documentElement.className;
    act(() => {
      first.result.current.enableBodyScroll();
      first.result.current.enableBodyScroll();
    });
    expect(targetDocument.documentElement.className).toEqual(lockedHTML);
    act(() => second.result.current.enableBodyScroll());
    expect(targetDocument.documentElement.className).toEqual(originalHTML);
    expect(targetDocument.body.className).toEqual(originalBody);
  });

  it('does not acquire or release a lock when the page fits the viewport', () => {
    const { targetDocument, measurement, wrapper } = setup();
    measurement.mockReturnValue({ ...targetDocument.body.getBoundingClientRect(), height: 0 });
    const hook = renderHook(() => useDisableBodyScroll(), { wrapper });
    const originalHTML = targetDocument.documentElement.className;
    act(() => {
      hook.result.current.disableBodyScroll();
      hook.result.current.enableBodyScroll();
    });
    expect(targetDocument.documentElement.className).toEqual(originalHTML);
  });
});
