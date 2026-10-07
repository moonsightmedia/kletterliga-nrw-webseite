import { act, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useSeasonInterest } from '@/preview/useSeasonInterest';

beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); });

it('keeps preview clicks local', async () => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useSeasonInterest(false));
  await act(() => result.current.submit());
  expect(result.current.interested).toBe(true);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(localStorage.length).toBe(0);
});

it('retries a failed request with the same ID and only confirms a saved answer', async () => {
  vi.stubGlobal('crypto', { randomUUID: () => '99999999-2027-4000-8000-000000000001' });
  vi.stubGlobal('AbortSignal', { timeout: () => undefined });
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, json: async () => ({ saved: true }) });
  vi.stubGlobal('fetch', fetchMock);
  const { result, unmount } = renderHook(() => useSeasonInterest(true));
  await act(() => result.current.submit());
  expect(result.current.interested).toBe(false);
  expect(result.current.error).not.toBe('');
  await act(() => result.current.submit());
  expect(result.current.interested).toBe(true);
  expect(fetchMock.mock.calls[0][1].body).toBe(fetchMock.mock.calls[1][1].body);
  unmount();
  const reload = renderHook(() => useSeasonInterest(true));
  expect(reload.result.current.interested).toBe(true);
  await act(() => reload.result.current.submit());
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
