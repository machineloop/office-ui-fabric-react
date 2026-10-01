import { renderHook } from '@testing-library/react-hooks';
import {
  dismissAllToasts as dismissAllToastsVanilla,
  dismissToast as dismissToastVanilla,
  dispatchToast as dispatchToastVanilla,
  updateToast as updateToastVanilla,
  pauseToast as pauseToastVanilla,
  playToast as playToastVanilla,
} from './vanilla';
import { useToastController } from './useToastController';

jest.mock('./vanilla');

describe('useToastController', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should set toaster id for all actions if passed as an argument', () => {
    const toasterId = 'test';
    const { result } = renderHook(() => useToastController(toasterId));
    const { dismissAllToasts, dismissToast, dispatchToast, updateToast, playToast, pauseToast } = result.current;

    dismissAllToasts();
    dismissToast('toast');
    dispatchToast('toast');
    updateToast({ toastId: 'toast' });
    playToast('toast');
    pauseToast('toast');

    expect(dismissAllToastsVanilla).toHaveBeenCalledTimes(1);
    expect(dismissToastVanilla).toHaveBeenCalledTimes(1);
    expect(dispatchToastVanilla).toHaveBeenCalledTimes(1);
    expect(updateToastVanilla).toHaveBeenCalledTimes(1);
    expect(pauseToastVanilla).toHaveBeenCalledTimes(1);
    expect(playToastVanilla).toHaveBeenCalledTimes(1);

    expect(dismissAllToastsVanilla).toHaveBeenCalledWith(toasterId, document);
    expect(dismissToastVanilla).toHaveBeenCalledWith(expect.anything(), toasterId, document);
    expect(dispatchToastVanilla).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toasterId }),
      document,
    );
    expect(updateToastVanilla).toHaveBeenCalledWith(expect.objectContaining({ toasterId }), document);
    expect(pauseToastVanilla).toHaveBeenCalledWith(expect.anything(), toasterId, document);
    expect(playToastVanilla).toHaveBeenCalledWith(expect.anything(), toasterId, document);
  });

  describe('dispatchToast', () => {
    it('should pass root to data', () => {
      const { result } = renderHook(() => useToastController());
      const { dispatchToast } = result.current;

      dispatchToast('toast', { root: { className: 'foo' } });
      expect(dispatchToastVanilla).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { root: { className: 'foo' } } }),
        document,
      );
    });
  });

  describe('updateTpast', () => {
    it('does not send undefined root data for a content-only partial update', () => {
      const { result } = renderHook(() => useToastController());
      result.current.updateToast({ toastId: 'foo', content: 'Updated' });
      expect(updateToastVanilla).toHaveBeenCalledWith(
        { toastId: 'foo', content: 'Updated', toasterId: undefined },
        document,
      );
    });

    it('preserves explicitly supplied data when root is omitted', () => {
      const { result } = renderHook(() => useToastController());
      const data = { root: { className: 'retained' }, application: 'context' };
      result.current.updateToast({ toastId: 'foo', data });
      expect(updateToastVanilla).toHaveBeenCalledWith({ toastId: 'foo', data, toasterId: undefined }, document);
    });

    it('supports explicit null root removal while retaining other supplied data', () => {
      const { result } = renderHook(() => useToastController());
      result.current.updateToast({ toastId: 'foo', root: null, data: { application: 'context' } });
      expect(updateToastVanilla).toHaveBeenCalledWith(
        expect.objectContaining({ data: { root: null, application: 'context' } }),
        document,
      );
    });

    it('should pass root to data', () => {
      const { result } = renderHook(() => useToastController());
      const { updateToast } = result.current;

      updateToast({ toastId: 'foo', root: { className: 'foo' } });
      expect(updateToastVanilla).toHaveBeenCalledWith(
        expect.objectContaining({ data: { root: { className: 'foo' } } }),
        document,
      );
    });
  });
});
