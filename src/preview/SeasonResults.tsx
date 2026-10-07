import { useState } from 'react';
import season from './data/season-2026.json';

const categories = [
  { label: 'U15 weiblich', class: 'U15-w', api: 'u15-w' },
  { label: 'U15 männlich', class: 'U15-m', api: 'u15-m' },
  { label: 'Ü15 weiblich', class: 'Ü15-w', api: 'ue15-w' },
  { label: 'Ü15 männlich', class: 'Ü15-m', api: 'ue15-m' },
  { label: 'Ü40 weiblich', class: 'Ü40-w', api: 'ue40-w' },
  { label: 'Ü40 männlich', class: 'Ü40-m', api: 'ue40-m' },
];
type Phase = 'Qualifikation' | 'Halbfinale' | 'Finale';
const number = (value: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(value);

export function SeasonResults() {
  const [phase, setPhase] = useState<Phase>('Finale');
  const [league, setLeague] = useState('lead');
  const [category, setCategory] = useState(categories[2]);
  const finalClass = season.final.find(item => item.league === league && item.class_label === category.class);
  const rows = phase === 'Finale'
    ? (finalClass?.entries ?? []).map(item => ({ name: item.name, rank: item.rank, result: item.status === 'dns' ? 'Nicht gestartet' : item.status === 'incident' ? 'Zwischenfall' : !item.has_result ? 'Ohne Ergebnis' : item.is_top ? 'Top' : `Griff ${item.grip ?? '–'}`, detail: item.has_result && item.seconds !== null ? `${number(item.seconds)} s` : '–' }))
    : phase === 'Halbfinale'
      ? season.semifinal.filter(item => item.league === league && item.class_label === category.class).map(item => ({ name: item.name, rank: item.is_out_of_competition ? null : item.rank, result: item.is_out_of_competition ? `${number(item.points)} · außer Wertung` : number(item.points), detail: `${item.completed_routes} / 5` }))
      : (season.qualification.find(item => item.league === league && item.category === category.api)?.rows ?? []).map(item => ({ name: item.display_name, rank: item.rank, result: number(Number(item.points)), detail: '' }));

  return <section className="sp-results-section sp-public-results" id="ergebnisse"><div className="sp-section">
    <div className="sp-section-heading"><div><p className="sp-eyebrow">Saison 2026 · Öffentlich einsehbar</p><h1>ERGEBNISSE <em>2026</em></h1></div><p>Qualifikation, Halbfinale und Finale – für alle, ohne Anmeldung.</p></div>
    <div className="sp-results-panel">
      <div className="sp-phase-tabs" role="group" aria-label="Wettkampfphase">{(['Qualifikation', 'Halbfinale', 'Finale'] as const).map(item => <button key={item} aria-pressed={phase === item} className={phase === item ? 'is-selected' : ''} onClick={() => setPhase(item)}>{item}</button>)}</div>
      <div className="sp-result-filters"><div role="group" aria-label="Liga">{[{ key: 'lead', label: 'Vorstieg' }, { key: 'toprope', label: 'Toprope' }].map(item => <button key={item.key} aria-pressed={league === item.key} className={league === item.key ? 'is-selected' : ''} onClick={() => setLeague(item.key)}>{item.label}</button>)}</div><div role="group" aria-label="Wertungsklasse">{categories.map(item => <button key={item.class} aria-pressed={category.class === item.class} className={category.class === item.class ? 'is-selected' : ''} onClick={() => setCategory(item)}>{item.label}</button>)}</div></div>
      <p className="sr-only" role="status">{rows.length} Einträge: {phase}, {league === 'lead' ? 'Vorstieg' : 'Toprope'}, {category.label}.</p>
      {rows.length ? <div className="sp-table-wrap" role="region" aria-label={`Ergebnistabelle ${phase}, ${category.label}`} tabIndex={0}><table className="sp-results-table"><caption>{phase} · {league === 'lead' ? 'Vorstieg' : 'Toprope'} · {category.label}</caption><thead><tr><th scope="col">Platz</th><th scope="col">Name</th><th scope="col">{phase === 'Finale' ? 'Ergebnis' : 'Punkte'}</th>{phase !== 'Qualifikation' ? <th scope="col">{phase === 'Finale' ? 'Zeit' : 'Routen'}</th> : null}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.name}-${index}`}><td>{row.rank ?? '–'}</td><th scope="row">{row.name}</th><td>{row.result}</td>{phase !== 'Qualifikation' ? <td>{row.detail}</td> : null}</tr>)}</tbody></table></div> : <div className="sp-results-empty" role="status"><h3>Keine Ergebnisse in dieser Klasse</h3><p>Für {phase} · {league === 'lead' ? 'Vorstieg' : 'Toprope'} · {category.label} liegen keine Einträge vor.</p></div>}
    </div><p className="sp-results-source">Freigegebene Ergebnisse · Stand {new Date(season.retrievedAt).toLocaleDateString('de-DE')} · Keine Anmeldung erforderlich.</p>
  </div></section>;
}
