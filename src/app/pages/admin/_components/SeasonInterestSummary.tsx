import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';

export function SeasonInterestSummary() {
  const [count, setCount] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    supabase.rpc('admin_season_interest_2027_count').then(({ data, error }) => {
      if (!active) return;
      if (error || typeof data !== 'number') setFailed(true);
      else setCount(data);
    });
    return () => { active = false; };
  }, []);
  return <section className="border-t border-[#003d55]/15 pt-6" aria-label="Interesse Saison 2027">
    <h2 className="font-semibold">Unverbindliches Interesse an 2027</h2>
    <p className="mt-2 text-3xl font-bold" role="status">{failed ? 'Zahl derzeit nicht verfügbar' : count === null ? 'Wird geladen …' : `${count} Ja-Antworten`}</p>
    <p className="mt-2 text-sm text-[#003d55]/65">Einmal pro Browser gezählt. Keine Anmeldungen und keine verbindlichen Zusagen. Verschiedene Geräte können mehrfach zählen.</p>
  </section>;
}
