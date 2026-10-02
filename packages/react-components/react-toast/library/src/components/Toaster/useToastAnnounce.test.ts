import { renderHook } from '@testing-library/react-hooks';
import { useToastAnnounce } from './useToastAnnounce';

describe('useToastAnnounce', () => {
  const toaster = document.createElement('div');
  const button = document.createElement('button');
  const outside = document.createElement('button');
  toaster.append(button);
  document.body.append(outside);
  document.body.append(toaster);

  it('should not announce when focus is in the toaster', () => {
    const announce = jest.fn();
    const { result } = renderHook(() => useToastAnnounce(announce));
    result.current.toasterRef(toaster);
    button.focus();

    result.current.announceToast('foo', { politeness: 'assertive' });
    expect(announce).toHaveBeenCalledTimes(0);
  });

  it('should announce when focus is not in the toaster', () => {
    const announce = jest.fn();
    const { result } = renderHook(() => useToastAnnounce(announce));
    result.current.toasterRef(toaster);
    outside.focus();

    result.current.announceToast('foo', { politeness: 'assertive' });
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('foo', { politeness: 'assertive' });
  });

  it('should announce when focus leaves the toaster', () => {
    const announce = jest.fn();
    const { result } = renderHook(() => useToastAnnounce(announce));
    result.current.toasterRef(toaster);
    button.focus();
    outside.focus();

    result.current.announceToast('foo', { politeness: 'assertive' });
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('foo', { politeness: 'assertive' });
  });

  it('suppresses every position in the same focus scope without suppressing another instance', () => {
    const otherPosition = document.createElement('div');
    const otherButton = document.createElement('button');
    otherPosition.append(otherButton);
    document.body.append(otherPosition);
    toaster.setAttribute('data-toaster-focus-scope', 'one');
    otherPosition.setAttribute('data-toaster-focus-scope', 'one');
    const announce = jest.fn();
    const { result, unmount } = renderHook(() => useToastAnnounce(announce, 'one'));
    result.current.toasterRef(toaster);
    otherButton.focus();
    result.current.announceToast('suppressed', { politeness: 'assertive' });
    expect(announce).not.toHaveBeenCalled();
    otherPosition.setAttribute('data-toaster-focus-scope', 'two');
    result.current.announceToast('another instance', { politeness: 'assertive' });
    expect(announce).toHaveBeenCalledWith('another instance', { politeness: 'assertive' });
    outside.focus();
    result.current.announceToast('outside', { politeness: 'polite' });
    expect(announce).toHaveBeenCalledTimes(2);
    unmount();
    otherPosition.remove();
    toaster.removeAttribute('data-toaster-focus-scope');
  });

  it('retains focus suppression when a custom mount node belongs to a shadow tree', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const position = document.createElement('div');
    const action = document.createElement('button');
    position.setAttribute('data-toaster-focus-scope', 'shadow');
    position.append(action);
    shadow.append(position);
    document.body.append(host);
    const announce = jest.fn();
    const { result, unmount } = renderHook(() => useToastAnnounce(announce, 'shadow'));
    result.current.toasterRef(position);
    action.focus();
    expect(document.activeElement).toBe(host);
    expect(shadow.activeElement).toBe(action);
    result.current.announceToast('suppressed', { politeness: 'assertive' });
    expect(announce).not.toHaveBeenCalled();
    outside.focus();
    result.current.announceToast('outside', { politeness: 'polite' });
    expect(announce).toHaveBeenCalledWith('outside', { politeness: 'polite' });
    unmount();
    host.remove();
  });
});
