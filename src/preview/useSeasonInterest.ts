import { useState } from 'react';
import { supabaseConfig } from '@/services/supabase';

const storageKey = 'kl-interest-2027';
type InterestState = { id: string; saved: boolean };
const readInterest = (): InterestState | null => {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    return value && typeof value.id === 'string' && /^[0-9a-f-]{36}$/i.test(value.id) ? value : null;
  } catch { return null; }
};

export function useSeasonInterest(production: boolean) {
  const [interested, setInterested] = useState(() => production && readInterest()?.saved === true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (busy || interested) return;
    if (!production) { setInterested(true); return; }
    setBusy(true);
    setError('');
    try {
      const id = readInterest()?.id ?? crypto.randomUUID();
      // Save the id before requesting so retries never produce a second vote.
      localStorage.setItem(storageKey, JSON.stringify({ id, saved: false }));
      const response = await fetch(`${supabaseConfig.url}/functions/v1/season-interest-2027`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': supabaseConfig.anonKey }, body: JSON.stringify({ browser_id: id }), signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('save failed');
      const result = await response.json();
      if (result.saved !== true) throw new Error('invalid response');
      setInterested(true);
      try { localStorage.setItem(storageKey, JSON.stringify({ id, saved: true })); } catch { /* Server already stored the answer. */ }
    } catch { setError('Dein Ja konnte gerade nicht gespeichert werden. Bitte versuche es erneut.'); }
    finally { setBusy(false); }
  };
  return { interested, busy, error, submit };
}
