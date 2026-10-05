import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { IdPrefixProvider, resetIdsForTests, useId } from '../../../useId';
import { SSRProvider } from '../../../../ssr';

// Unit-only compatibility branch; this is not native browser evidence.
jest.mock('react', () => ({ ...jest.requireActual('react'), useId: undefined }));

describe('IdPrefixProvider legacy fallback compatibility', () => {
  afterEach(resetIdsForTests);

  it('uses context plus local prefix with a memoized counter ID', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <IdPrefixProvider value="scope-">{children}</IdPrefixProvider>
    );
    const { result, rerender } = renderHook(() => useId('local-'), { wrapper });
    expect(result.current).toMatch(/^scope-local-\d+$/);
    const before = result.current;
    rerender();
    expect(result.current).toBe(before);
  });

  it('provided IDs bypass the counter and empty IDs fall back', () => {
    const explicit = renderHook(() => useId('local-', 'provided'));
    expect(explicit.result.current).toBe('provided');
    const generated = renderHook(() => useId('local-', ''));
    expect(generated.result.current).toBe('local-1');
  });

  it('recomputes when the local prefix changes', () => {
    const { result, rerender } = renderHook(({ prefix }) => useId(prefix), { initialProps: { prefix: 'a-' } });
    const before = result.current;
    rerender({ prefix: 'b-' });
    expect(result.current).toMatch(/^b-\d+$/);
    expect(result.current).not.toBe(before.replace('a-', 'b-'));
  });

  it('recomputes when a provided ID is removed without disrupting later hooks', () => {
    const initialProps: { provided?: string } = { provided: 'explicit' };
    const { result, rerender } = renderHook(
      ({ provided }: { provided?: string }) => [useId('a-', provided), useId('b-')],
      { initialProps },
    );
    const second = result.current[1];
    rerender({ provided: undefined });
    expect(result.current[0]).toMatch(/^a-\d+$/);
    expect(result.current[1]).toBe(second);
  });

  it('recomputes when the context value changes', () => {
    let value = 'a-';
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <IdPrefixProvider value={value}>{children}</IdPrefixProvider>
    );
    const { result, rerender } = renderHook(() => useId(), { wrapper });
    const before = result.current;
    value = 'b-';
    rerender();
    expect(result.current).toMatch(/^b-fui-\d+$/);
    expect(result.current).not.toBe(before.replace('a-', 'b-'));
  });

  for (const value of ['', undefined]) {
    it(`nearest ${JSON.stringify(value)} provider resets inherited prefix`, () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IdPrefixProvider value="outer-">
          <IdPrefixProvider value={value}>{children}</IdPrefixProvider>
        </IdPrefixProvider>
      );
      const { result } = renderHook(() => useId(), { wrapper });
      expect(result.current).toMatch(/^fui-\d+$/);
    });
  }

  it('independent SSRProvider instances own independent fallback counters', () => {
    const first = renderHook(() => useId(), { wrapper: SSRProvider });
    const second = renderHook(() => useId(), { wrapper: SSRProvider });
    expect(first.result.current).toBe('fui-1');
    expect(second.result.current).toBe('fui-1');
  });

  it('resetIdsForTests resets only the default fallback counter', () => {
    const isolated = renderHook(() => [useId(), useId()], { wrapper: SSRProvider });
    renderHook(() => useId());
    resetIdsForTests();
    const next = renderHook(() => useId());
    expect(next.result.current).toBe('fui-1');
    expect(isolated.result.current).toEqual(['fui-1', 'fui-2']);
  });
});
