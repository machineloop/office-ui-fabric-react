import type { Toast } from '../types';
import { createToaster } from './createToaster';

describe('createToaster', () => {
  function assertToast(toast: Toast | undefined): asserts toast is Toast {
    if (toast === undefined) {
      throw new Error('Toast is undefined');
    }
  }

  it('should have defaults without user config', () => {
    const toaster = createToaster({});

    toaster.buildToast({ content: 'foo', toastId: 'foo' }, () => null);
    const toast = toaster.toasts.get('foo');
    assertToast(toast);
    expect(toast).toEqual({
      close: expect.any(Function),
      content: 'foo',
      data: {},
      order: expect.any(Number),
      onStatusChange: undefined,
      pauseOnHover: false,
      pauseOnWindowBlur: false,
      position: 'bottom-end',
      priority: 0,
      remove: expect.any(Function),
      timeout: 3000,
      toastId: 'foo',
      toasterId: undefined,
      updateId: 0,
      imperativeRef: { current: null },
    });
  });

  it('should make a toast visible', () => {
    const toaster = createToaster({});

    toaster.buildToast({ content: 'foo', toastId: 'foo' }, () => null);

    expect(toaster.toasts.size).toBe(1);
    expect(toaster.visibleToasts.size).toBe(1);
    expect(toaster.visibleToasts.has('foo')).toBe(true);
  });

  it('should make a toast visible', () => {
    const toaster = createToaster({});

    toaster.buildToast({ content: 'foo', toastId: 'foo' }, () => null);

    expect(toaster.toasts.size).toBe(1);
    expect(toaster.visibleToasts.size).toBe(1);
    expect(toaster.visibleToasts.has('foo')).toBe(true);
  });

  it('should close a toast', () => {
    const toaster = createToaster({});

    toaster.buildToast({ content: 'foo', toastId: 'foo' }, () => null);
    const toast = toaster.toasts.get('foo');
    assertToast(toast);
    toast.close();

    expect(toaster.visibleToasts.size).toBe(0);
  });

  it('should remove a toast', () => {
    const toaster = createToaster({});

    toaster.buildToast({ content: 'foo', toastId: 'foo' }, () => null);
    const toast = toaster.toasts.get('foo');
    assertToast(toast);
    toast.close();
    toast.remove();

    expect(toaster.visibleToasts.size).toBe(0);
    expect(toaster.toasts.size).toBe(0);
  });

  it('should dismiss a toast', () => {
    const toaster = createToaster({});

    toaster.buildToast({ content: 'foo', toastId: 'foo' }, () => null);
    toaster.dismissToast('foo');

    expect(toaster.visibleToasts.size).toBe(0);
  });

  it('should dismiss all toasts', () => {
    const toaster = createToaster({});

    toaster.buildToast({ content: 'foo', toastId: 'foo' }, () => null);
    toaster.buildToast({ content: 'foo', toastId: 'bar' }, () => null);
    toaster.buildToast({ content: 'foo', toastId: 'baz' }, () => null);
    toaster.dismissAllToasts();

    expect(toaster.visibleToasts.size).toBe(0);
  });

  it('should update a toasts', () => {
    const toaster = createToaster({});

    toaster.buildToast({ content: 'foo', toastId: 'foo' }, () => null);
    toaster.updateToast({ content: 'bar', toastId: 'foo' });

    const toast = toaster.toasts.get('foo');
    assertToast(toast);

    expect(toast.content).toBe('bar');
    expect(toast.updateId).toBe(1);
  });

  it('should not have more visible toasts than the limit', () => {
    const toaster = createToaster({ limit: 1 });

    toaster.buildToast({ content: 'foo', toastId: 'foo' }, () => null);
    toaster.buildToast({ content: 'foo', toastId: 'bar' }, () => null);

    expect(toaster.visibleToasts.has('bar')).toBe(false);
  });

  it('should dequeue new toast from queue after toast is removed', () => {
    const toaster = createToaster({ limit: 1 });

    toaster.buildToast({ content: 'foo', toastId: 'foo' }, () => null);
    toaster.buildToast({ content: 'foo', toastId: 'bar' }, () => null);

    const toast = toaster.toasts.get('foo');
    assertToast(toast);
    toast.remove();

    expect(toaster.visibleToasts.size).toBe(1);
    expect(toaster.toasts.get('bar')).not.toBeUndefined();
  });

  it('should set default toast options', () => {
    const toaster = createToaster({ position: 'top-end' });

    toaster.buildToast({ content: 'foo', toastId: 'foo' }, () => null);

    const toast = toaster.toasts.get('foo');
    assertToast(toast);
    expect(toast.position).toBe('top-end');
  });

  it('should let toast options win over defaults', () => {
    const toaster = createToaster({ position: 'top-end' });

    toaster.buildToast({ content: 'foo', toastId: 'foo', position: 'bottom-start' }, () => null);

    const toast = toaster.toasts.get('foo');
    assertToast(toast);
    expect(toast.position).toBe('bottom-start');
  });

  it('should dequeue toasts in priority', () => {
    const toaster = createToaster({ limit: 1 });

    toaster.buildToast({ content: 'foo', toastId: 'one', priority: 1 }, () => null);
    toaster.buildToast({ content: 'foo', toastId: 'two', priority: 2 }, () => null);
    toaster.buildToast({ content: 'foo', toastId: 'four', priority: 4 }, () => null);

    expect(toaster.visibleToasts.has('one')).toBe(true);
    const one = toaster.toasts.get('one');
    assertToast(one);
    one.close();
    one.remove();

    expect(toaster.visibleToasts.has('one')).toBe(false);
    expect(toaster.visibleToasts.has('four')).toBe(false);
    const four = toaster.toasts.get('four');
    assertToast(four);
    four.close();
    four.remove();

    expect(toaster.visibleToasts.has('two')).toBe(true);
  });

  it('reports dismissal once through controller, repeated close and dismiss-all paths', () => {
    const onStatusChange = jest.fn();
    const toaster = createToaster({});
    toaster.buildToast({ toastId: 'one', onStatusChange }, jest.fn());
    const toast = toaster.toasts.get('one');
    assertToast(toast);

    toaster.dismissToast('one');
    toaster.dismissToast('one');
    toast.close();
    toaster.dismissAllToasts();

    expect(onStatusChange.mock.calls.map(([, data]) => data.status)).toEqual(['queued', 'dismissed']);
    expect(toaster.visibleToasts.size).toBe(0);
    expect(toaster.toasts.get('one')).toBe(toast);
    toast.remove();
    expect(toaster.toasts.size).toBe(0);
  });

  it('removes a dismissed queued record without promoting it or disturbing remaining priority', () => {
    const toaster = createToaster({ limit: 1 });
    const onStatusChange = jest.fn();
    const onUpdate = jest.fn();
    toaster.buildToast({ toastId: 'visible' }, onUpdate);
    toaster.buildToast({ toastId: 'cancelled', priority: 2, onStatusChange }, onUpdate);
    toaster.buildToast({ toastId: 'later', priority: 3 }, onUpdate);
    toaster.buildToast({ toastId: 'first', priority: 1 }, onUpdate);

    toaster.dismissToast('cancelled');
    expect(toaster.toasts.has('cancelled')).toBe(false);
    expect(onStatusChange.mock.calls.map(([, data]) => data.status)).toEqual(['queued', 'dismissed']);
    expect(toaster.visibleToasts.has('visible')).toBe(true);
    const visible = toaster.toasts.get('visible');
    assertToast(visible);
    visible.close();
    visible.remove();
    expect(Array.from(toaster.visibleToasts)).toEqual(['first']);
    const first = toaster.toasts.get('first');
    assertToast(first);
    first.close();
    first.remove();
    expect(Array.from(toaster.visibleToasts)).toEqual(['later']);
    expect(onUpdate).toHaveBeenCalled();
  });

  it('clears queued records on dismiss-all and does not resurrect them when exit finishes', () => {
    const toaster = createToaster({ limit: 1 });
    const changed = jest.fn();
    toaster.buildToast({ toastId: 'visible', onStatusChange: changed }, jest.fn());
    toaster.buildToast({ toastId: 'queued', onStatusChange: changed }, jest.fn());
    const visible = toaster.toasts.get('visible');
    assertToast(visible);

    toaster.dismissAllToasts();
    expect(toaster.visibleToasts.size).toBe(0);
    expect(toaster.toasts.has('queued')).toBe(false);
    expect(
      changed.mock.calls.filter(([, data]) => data.status === 'dismissed').map(([, data]) => data.toastId),
    ).toEqual(['visible', 'queued']);
    visible.remove();
    expect(toaster.toasts.size).toBe(0);
    toaster.buildToast({ toastId: 'queued' }, jest.fn());
    expect(Array.from(toaster.visibleToasts)).toEqual(['queued']);
  });

  it('reserves the id during exit and permits reuse after the old toast is removed', () => {
    const toaster = createToaster({});
    toaster.buildToast({ toastId: 'one', content: 'Original' }, jest.fn());
    const old = toaster.toasts.get('one');
    assertToast(old);
    toaster.dismissToast('one');
    toaster.buildToast({ toastId: 'one', content: 'During exit' }, jest.fn());
    expect(toaster.toasts.get('one')).toBe(old);
    expect(old.content).toBe('Original');
    old.remove();
    toaster.buildToast({ toastId: 'one', content: 'After exit' }, jest.fn());
    expect(toaster.toasts.get('one')?.content).toBe('After exit');
    expect(toaster.visibleToasts.has('one')).toBe(true);
  });

  it('merges independent root and application data updates without mutating supplied data', () => {
    const initial = Object.freeze({ application: 'initial', root: { className: 'original' } });
    const toaster = createToaster({});
    toaster.buildToast({ toastId: 'one', data: initial }, jest.fn());
    toaster.updateToast({ toastId: 'one', data: Object.freeze({ root: { className: 'updated' } }) });
    expect(toaster.toasts.get('one')?.data).toEqual({ application: 'initial', root: { className: 'updated' } });
    toaster.updateToast({ toastId: 'one', data: Object.freeze({ application: 'updated' }) });
    expect(toaster.toasts.get('one')?.data).toEqual({ application: 'updated', root: { className: 'updated' } });
    toaster.updateToast({ toastId: 'one', content: 'Only content' });
    expect(toaster.toasts.get('one')?.data).toEqual({ application: 'updated', root: { className: 'updated' } });
    toaster.updateToast({ toastId: 'one', data: { root: null } });
    expect(toaster.toasts.get('one')?.data).toEqual({ application: 'updated', root: null });
    expect(initial).toEqual({ application: 'initial', root: { className: 'original' } });
  });

  it('refills available capacity after multiple visible dismissals and retains the remaining queue', () => {
    const toaster = createToaster({ limit: 2 });
    for (const toastId of ['first', 'second', 'third', 'fourth', 'fifth']) {
      toaster.buildToast({ toastId }, jest.fn());
    }
    const first = toaster.toasts.get('first');
    const second = toaster.toasts.get('second');
    assertToast(first);
    assertToast(second);
    first.close();
    second.close();
    first.remove();
    expect(Array.from(toaster.visibleToasts)).toEqual(['third', 'fourth']);
    second.remove();
    expect(Array.from(toaster.visibleToasts)).toEqual(['third', 'fourth']);
    const third = toaster.toasts.get('third');
    assertToast(third);
    third.close();
    third.remove();
    expect(Array.from(toaster.visibleToasts)).toEqual(['fourth', 'fifth']);
  });
});
