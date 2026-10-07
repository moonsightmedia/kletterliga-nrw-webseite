import { useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Camera, Heart, Trophy, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { SponsorBanner } from "@/components/home/SponsorBanner";
import { SeasonPreviewHeader as Header } from "./SeasonPreviewHeader";
import { SeasonPreviewFooter as Footer } from "./SeasonPreviewFooter";
import logo from '@/assets/logo.png';
import { mainSponsors, partnerSponsors } from '@/data/sponsors';
import { SeasonResults } from './SeasonResults';
import seasonData from './data/season-2026.json';
import gymStats from './data/gym-stats-2026.json';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useSeasonInterest } from './useSeasonInterest';

const photos = [
  { file: 'moment-1', alt: 'Eine Person klettert im Scheinwerferlicht vor der dunklen Hallenwand', caption: 'Alles geben. Bis zum letzten Griff.' },
  { file: 'moment-2', alt: 'Zuschauende verfolgen gespannt die Finalrouten', caption: 'Ein Tag, der verbindet.' },
  { file: 'moment-3', alt: 'Gemeinsames Gruppenbild auf dem Siegerpodest nach dem Finale', caption: 'Für diese Momente machen wir das.' },
  { file: 'moment-4', alt: 'Publikum beim Mitfiebern vor der Kletterwand', caption: 'Gemeinsam mitfiebern.' },
  { file: 'moment-5', alt: 'Zwei Männer mit Mikrofon vor dem Sponsorenbanner bei der Siegerehrung', caption: 'Zusammen möglich gemacht.' },
  { file: 'moment-6', alt: 'Teilnehmende im Gespräch in der Kletterhalle', caption: 'Eine Liga. Viele Geschichten.' },
  { file: 'moment-7', alt: 'Ein Kletterer an der weißen Wand im Halbfinale', caption: 'Jeder Griff zählt.' },
  { file: 'moment-8', alt: 'Ein junger Kletterer an der grünen Hallenwand', caption: 'Mut zum nächsten Zug.' },
  { file: 'moment-9', alt: 'Zwei Teilnehmende auf der Terrasse vor der Halle', caption: 'Auch neben der Wand zusammen.' },
  { file: 'moment-10', alt: 'Eine Kletterin zieht sich an der weißen Wand nach oben', caption: 'Den nächsten Griff im Blick.' },
  { file: 'moment-11', alt: 'Ein Kletterer an der grünen Wand im Halbfinale', caption: 'Noch ein Zug.' },
  { file: 'moment-12', alt: 'Blick von oben auf die Kletterhalle und die Zuschauenden', caption: 'Ein ganzer Tag voller Klettern.' },
  { file: 'moment-13', alt: 'Pokale und Preise vor der grünen Kletterwand', caption: 'Für eure starken Leistungen.' },
  { file: 'moment-14', alt: 'Zwei Teilnehmende sitzen gemeinsam auf dem Sofa', caption: 'Zusammen warten. Zusammen lachen.' },
  { file: 'moment-15', alt: 'Eine junge Kletterin greift nach einem gelben Griff', caption: 'Über sich hinauswachsen.' },
  { file: 'moment-16', alt: 'Ein Kletterer zwischen großen blauen Griffen', caption: 'Volle Konzentration.' },
  { file: 'moment-17', alt: 'Ein Kletterer am roten Griff im Scheinwerferlicht', caption: 'Spannung bis zum Schluss.' },
  { file: 'moment-18', alt: 'Teilnehmende stehen bei der Siegerehrung auf dem Podest', caption: 'Ein gemeinsamer Abschluss.' },
];
const galleryUrl = 'https://apps.scrappbook.de/H1uPsyZjzg';
const image = (file: string) => `/images/season-2026/${file}.webp`;
const sponsors = [...mainSponsors, ...partnerSponsors];

function ScrollPosition({ production }: { production: boolean }) {
  const { pathname, hash } = useLocation();
  const previousPath = useRef(pathname);
  const titles: Record<string, string> = { '/': 'Saisonrückblick', '/saison/2026': 'Saison 2026', '/ergebnisse/2026': 'Ergebnisse 2026', '/saison/2027': 'Ausblick 2027', '/archiv': 'Saisonarchiv' };
  usePageMeta({ title: titles[pathname] ?? 'Seite nicht gefunden', canonicalPath: pathname, noindex: !production, description: pathname === '/saison/2027' ? 'Könntest du dir vorstellen, 2027 dabei zu sein? Zeige unverbindlich dein Interesse an der Kletterliga NRW.' : 'Saison 2026 der Kletterliga NRW: Rückblick, öffentliche Ergebnisse, Finalbilder und unsere Partnerhallen.' });
  useEffect(() => {
    const titles: Record<string, string> = { '/': 'Saisonrückblick', '/saison/2026': 'Saison 2026', '/ergebnisse/2026': 'Ergebnisse 2026', '/saison/2027': 'Ausblick 2027', '/archiv': 'Saisonarchiv' };
    document.title = `${titles[pathname] ?? 'Seite nicht gefunden'} · Kletterliga NRW`;
    const changedPage = previousPath.current !== pathname;
    previousPath.current = pathname;
    const frame = requestAnimationFrame(() => {
      const target = hash ? document.getElementById(hash.slice(1)) : document.querySelector<HTMLElement>('main h1');
      if (hash) target?.scrollIntoView();
      else window.scrollTo(0, 0);
      if (target && (hash || changedPage)) {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}

function StartHero() {
  return <section className="sp-start-hero"><div className="sp-hero-texture" aria-hidden="true" /><div className="sp-hero-stripe sp-hero-stripe-one" aria-hidden="true" /><div className="container-kl sp-start-layout"><div className="sp-start-copy"><p className="sp-eyebrow">Kletterliga NRW · Saison 2026</p><h1>WAS FÜR<br />EINE <em>SAISON.</em></h1><p className="sp-start-lead">Gemeinsam geklettert.<br />Gemeinsam mitgefiebert.</p><p>Acht Hallen, unzählige gemeinsame Momente und ein Finale in Altena. Danke, dass ihr dabei wart!</p><div className="sp-actions"><Link className="sp-button" to="/ergebnisse/2026"><span>Ergebnisse 2026</span><ArrowRight size={20} /></Link><Link className="sp-text-link" to="/saison/2026"><span>Der Rückblick</span><ArrowRight size={18} /></Link></div><div className="sp-start-facts"><span><strong>8</strong> Hallen</span><span><strong>2</strong> Ligen</span><span><strong>1</strong> gemeinsames Finale</span></div></div><figure className="sp-start-image"><img src={image('start-climb')} alt="Ein Kletterer in der Finalroute vor der grünen Hallenwand" width="1067" height="1600" /><div className="sp-start-photo-label"><img src={logo} alt="" width="54" height="54" /><span>Eine Liga.<br /><strong>Viele Geschichten.</strong></span></div><figcaption>Finale 2026 · Foto: Justus Hoehn</figcaption></figure></div></section>;
}

function Hero({ season = false }: { season?: boolean }) {
  if (!season) return <StartHero />;
  return <section className="sp-hero"><div className="sp-hero-texture" aria-hidden="true" /><div className="sp-hero-stripe sp-hero-stripe-one" aria-hidden="true" /><div className="sp-hero-stripe sp-hero-stripe-two" aria-hidden="true" /><div className="container-kl sp-hero-inner">
    <div className="sp-hero-copy">
      <p className="sp-eyebrow"><span /> Saison 2026 · Abgeschlossen</p>
      <h1>{season ? <>SAISON <em>2026</em></> : <>KLETTERLIGA <em>NRW</em></>}</h1>
      <p className="sp-hero-description">Die Saison 2026 ist abgeschlossen. Acht Hallen, zwei Ligen und ein gemeinsamer Finaltag in der Kletterwelt Sauerland – danke an alle, die dabei waren!</p>
      <p className="sp-hero-tagline">MEHRERE HALLEN. EINE LIGA. EIN FINALE.</p>
      <div className="sp-actions"><Link className="sp-button" to="/ergebnisse/2026"><span>Ergebnisse 2026</span> <ArrowRight size={20} /></Link><Link className="sp-button sp-button-outline" to="/saison/2026#bilder"><span>Bilder ansehen</span></Link></div>
      <p className="sp-hero-footnote">Kletterliga NRW · Finale am 3. Oktober 2026</p>
    </div>
    <div className="sp-hero-brand"><img src={logo} alt="Kletterliga NRW Logo" width="300" height="300" /><div className="sp-hero-stats"><div><strong>8</strong><span>Hallen</span></div><div><strong>2</strong><span>Ligen</span></div><div><strong>6</strong><span>Klassen je Liga</span></div></div></div>
    </div><Link to="/saison/2026#rueckblick" className="sp-hero-scroll" aria-label="Zum Saisonrückblick"><ArrowRight size={24} /></Link>
  </section>;
}

function Story({ full = false, production = false }: { full?: boolean; production?: boolean }) {
  return <section className="sp-section sp-story" id="rueckblick">
    <div className="sp-story-heading"><p className="sp-eyebrow">Saison 2026 · Der Rückblick</p><h2>DANKE FÜR DIESE <em>SAISON!</em></h2></div>
    <div className="sp-story-content"><figure className="sp-story-photo"><img src={image(full ? 'recap-community' : 'hero')} alt={full ? 'Teilnehmende bei der Siegerehrung auf dem Podest im Finale 2026' : 'Kletterer in der beleuchteten Finalroute am 3. Oktober 2026'} loading="lazy" /><figcaption>Finale 2026 · Foto: Justus Hoehn</figcaption></figure>
    <div className="sp-story-body"><p className="sp-lead">Vom ersten Hallenbesuch bis zum letzten Griff im Finale: Diese Saison habt ihr mit Leben gefüllt.</p><p>Die Kletterliga NRW hat 2026 acht Hallen miteinander verbunden. In Toprope und Vorstieg wurden Routen ausprobiert, Punkte gesammelt und neue Hallen entdeckt. Am 3. Oktober kamen wir in der Kletterwelt Sauerland in Altena zum Halbfinale und Finale zusammen.</p>
      {full ? <><p>Was bleibt, sind die gemeinsamen Momente: miteinander klettern, anfeuern, mitfiebern und sich über Fortschritte freuen. Danke an alle, die Teil dieser Saison waren – auf der Wand, hinter den Kulissen und im Publikum.</p>{!production && <p className="sp-editor-note">Nachbericht-Entwurf · Persönliche Highlights und bestätigte Saisonstatistiken ergänzen wir noch.</p>}</> : <Link className="sp-text-link" to="/saison/2026#rueckblick">Zum Saisonrückblick <ArrowRight size={18} /></Link>}
    </div></div>
    {!full ? <div className="sp-feature-cards">{[{ title: 'Ergebnisse 2026', text: 'Qualifikation, Halbfinale und Finale im Überblick.', icon: Trophy, target: 'ergebnisse' }, { title: 'Die Finalbilder', text: 'Die schönsten Momente vom Finaltag in Altena.', icon: Camera, target: 'bilder' }, { title: 'Gemeinsam möglich', text: 'Danke an unsere Community, Hallen und Partner.', icon: Heart, target: 'danke' }].map(item => <Link className="card-kl sp-feature-card" key={item.target} to={item.target === "ergebnisse" ? "/ergebnisse/2026" : `/saison/2026#${item.target}`}><span className="sp-feature-icon"><item.icon size={27} /></span><h3>{item.title}</h3><p>{item.text}</p></Link>)}</div> : null}
  </section>;
}

function SeasonGyms() {
  const logos: Record<string, string> = { '2T': '2t-lindlar.png', 'Canyon Chorweiler': 'canyon-chorweiler.jpg', 'Chimpanzodrome': 'chimpanzodrome-frechen.png', 'Kletterbar Münster': 'kletterbar-muenster.png', 'Kletterfabrik Köln': 'kletterfabrik-koeln.png', 'Kletterhalle Bielefeld': 'dav-bielefeld.svg', 'Kletterwelt Sauerland': 'kletterwelt-sauerland.jpg', 'Kletterzentrum OWL': 'owl.jpg' };
  return <section className="sp-section sp-season-gyms" id="hallen">
    <div className="sp-section-heading"><div><p className="sp-eyebrow">Unsere Stationen 2026</p><h2>ACHT HALLEN. <em>EINE LIGA.</em></h2></div><p>Acht Orte zum Klettern, Entdecken und Wiederkommen. So habt ihr die Liga-Routen bewertet.</p></div>
    <div className="sp-gym-grid">{seasonData.gyms.map(gym => {
      const stats = gymStats.gyms.find(item => item.name === gym.name);
      return <a className="sp-gym-card" key={gym.name} href={gym.website.startsWith('http') ? gym.website : `https://${gym.website}`} target="_blank" rel="noreferrer">
        <div className="sp-gym-identity"><div className={`sp-gym-logo ${gym.name === '2T' ? 'sp-gym-logo-dark' : ''}`}><img src={`/gym-logos-real/${logos[gym.name]}`} alt={`Logo ${gym.name}`} loading="lazy" /></div><div><span className="sp-eyebrow">{gym.city}</span><h3>{gym.name}</h3></div><ArrowUpRight className="sp-gym-arrow" size={20} aria-hidden="true" /></div>
        <div className="sp-gym-rating"><div><span>Euer Routenschnitt</span><strong>{stats?.averageRating != null ? stats.averageRating.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '–'}</strong><span>von 5</span></div><span>{stats?.ratingCount ?? 0} Routenbewertungen</span></div>
      </a>;
    })}</div>
    <p className="sp-gym-method">Routenschnitt: Durchschnitt eurer Bewertungen zur Routenqualität in der Qualifikation 2026, auf einer Skala von 1 bis 5.</p>
  </section>;
}

function ResultsLink() {
  return <section className="sp-section sp-season-results-link"><p className="sp-eyebrow">Qualifikation · Halbfinale · Finale</p><h2>ERGEBNISSE <em>2026</em></h2><p>Alle Platzierungen unserer Saison – öffentlich und ohne Anmeldung.</p><Link className="sp-button" to="/ergebnisse/2026"><span>Zu den Ergebnissen</span><ArrowRight size={20} /></Link></section>;
}

function Gallery() {
  const [selected, setSelected] = useState<number | null>(null);
  const [firstPhoto, setFirstPhoto] = useState(0);
  const [visiblePhotos, setVisiblePhotos] = useState(6);
  const rail = useRef<HTMLDivElement | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const readRail = () => {
    const track = rail.current;
    if (!track || track.children.length < 2) return;
    const first = track.children[0] as HTMLElement;
    const stride = (track.children[1] as HTMLElement).offsetLeft - first.offsetLeft;
    const visible = Math.max(1, Math.round(track.clientWidth / stride));
    setVisiblePhotos(visible);
    setFirstPhoto(Math.min(photos.length - visible, Math.max(0, Math.round(track.scrollLeft / stride))));
  };
  useEffect(() => {
    const observer = new ResizeObserver(readRail);
    if (rail.current) observer.observe(rail.current);
    return () => observer.disconnect();
  }, []);
  const moveGroup = (direction: number, focusPhoto = false) => {
    const target = Math.max(0, Math.min(photos.length - visiblePhotos, firstPhoto + direction * visiblePhotos));
    const button = rail.current?.children[target] as HTMLElement | undefined;
    if (button) {
      if (focusPhoto) button.focus({ preventScroll: true });
      rail.current?.scrollTo({ left: button.offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  };
  const movePhoto = (direction: number) => setSelected(current => current === null ? null : (current + direction + photos.length) % photos.length);
  return <section className="sp-section sp-gallery" id="bilder">
    <div className="sp-section-heading"><div><p className="sp-eyebrow">Kletterwelt Sauerland · 3. Oktober 2026</p><h2>DIE BILDER VOM <em>FINALE</em></h2></div><div className="sp-gallery-note"><p>Ein kleiner Ausschnitt aus einem großen Tag.</p><a className="sp-text-link" href={galleryUrl} target="_blank" rel="noreferrer">Zur vollständigen Galerie <ArrowUpRight size={17} /></a><small>Alle Bilder ansehen · Scrappbook</small></div></div>
    <div className="sp-gallery-carousel" role="region" aria-label="Finalbilder zum Durchblättern" aria-roledescription="Karussell">
      <div id="finale-photo-rail" className="sp-photo-rail" ref={rail} onScroll={readRail} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); moveGroup(event.key === 'ArrowLeft' ? -1 : 1, true); } }}>
        {photos.map((photo, i) => <button key={photo.file} className="sp-photo" aria-label={`Bild ${i+1} vergrößern: ${photo.caption}`} onClick={event => { opener.current = event.currentTarget; setSelected(i); }}><img src={image(photo.file)} alt={photo.alt} loading="lazy" width="1000" height="750" /><span><span>{String(i+1).padStart(2,'0')}</span><ArrowUpRight size={21} /></span></button>)}
      </div>
      <div className="sp-gallery-controls"><button className="sp-gallery-arrow" aria-label="Vorherige Bilder" aria-controls="finale-photo-rail" disabled={firstPhoto === 0} onClick={() => moveGroup(-1)}><ChevronLeft size={23} /></button><p aria-live="polite" aria-atomic="true">Bilder {firstPhoto + 1}–{Math.min(firstPhoto + visiblePhotos, photos.length)} <span>von {photos.length}</span></p><button className="sp-gallery-arrow" aria-label="Nächste Bilder" aria-controls="finale-photo-rail" disabled={firstPhoto + visiblePhotos >= photos.length} onClick={() => moveGroup(1)}><ChevronRight size={23} /></button></div>
    </div>
    <p className="sp-photo-credit">Fotos: Justus Hoehn · <a href="https://www.instagram.com/justus.films/" target="_blank" rel="noreferrer">@justus.films</a></p>
    <Dialog.Root open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}><Dialog.Portal><Dialog.Overlay className="sp-lightbox-overlay" /><Dialog.Content className="sp-lightbox" onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus({ preventScroll: true }); }} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); movePhoto(event.key === 'ArrowLeft' ? -1 : 1); } }}><Dialog.Title className="sr-only">{selected !== null ? photos[selected].caption : 'Finalfoto'}</Dialog.Title><Dialog.Description className="sr-only">Finale der Kletterliga NRW 2026. Foto von Justus Hoehn. Mit den Pfeiltasten kannst du die Bilder wechseln.</Dialog.Description>{selected !== null ? <><img src={image(photos[selected].file)} alt={photos[selected].alt} /><div className="sp-lightbox-controls"><button onClick={() => movePhoto(-1)} aria-label="Vorheriges Bild"><ChevronLeft /></button><p aria-live="polite">{selected + 1} / {photos.length}<span>{photos[selected].caption}</span><small>Foto: Justus Hoehn</small></p><button onClick={() => movePhoto(1)} aria-label="Nächstes Bild"><ChevronRight /></button></div></> : null}<Dialog.Close className="sp-lightbox-close" aria-label="Bild schließen"><X /></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
  </section>;
}

function Thanks() {
  return <section className="sp-thanks" id="danke"><div className="sp-section"><p className="sp-eyebrow">An alle, die dabei waren</p><h2>GEMEINSAM <em>MÖGLICH GEMACHT</em></h2><p className="sp-thanks-copy">Danke an unsere Klettercommunity, die acht Partnerhallen, die Helfer:innen, die Routenschrauber:innen und unsere Sponsoren. Ihr habt diese Saison möglich gemacht.</p>
    <div className="sp-main-sponsor"><div className="sp-main-sponsor-brand"><span className="sp-eyebrow">Hauptsponsor · Saison 2026</span><img src="/sponsors/kletterladen-nrw-www.svg" alt="kletterladen.nrw" loading="lazy" /><p>Unser Partner aus Düsseldorf</p></div><div className="sp-main-sponsor-copy"><h3>VIELEN DANK,<br /><em>KLETTERLADEN.NRW!</em></h3><p>Für eure Unterstützung über die Saison und am Finaltag. Gemeinsam habt ihr mit uns die Kletterliga NRW möglich gemacht.</p><a className="sp-button" href="https://kletterladen.nrw" target="_blank" rel="noreferrer"><span>Zum Kletterladen</span><ArrowUpRight size={18} /></a></div><div className="sp-community-benefit"><div><p className="sp-eyebrow">Für unsere Klettercommunity</p><h3>DEIN NÄCHSTER <em>KLETTERTAG.</em></h3><p>Mit unserem Community-Code bekommt ihr 5 % Rabatt beim Kletterladen NRW.</p></div><div className="sp-benefit-code"><span>5 % Community-Rabatt</span><strong>KletterligaNRW</strong><small>Dein Rabattcode für den Kletterladen NRW.</small></div></div></div>
    <p className="sp-partner-heading">Danke auch an unsere weiteren Partner</p><div className="sp-logo-partners" aria-label="Weitere Sponsoren der Saison 2026">{sponsors.slice(1).map(sponsor => <a className="sp-logo-partner" key={sponsor.name} href={sponsor.website} target="_blank" rel="noreferrer"><div className={`sp-partner-logo ${['Goodgrip', 'Proviant'].includes(sponsor.name) ? 'sp-partner-logo-dark' : ''}`}><img src={sponsor.logoSrc} alt={sponsor.name} loading="lazy" /></div><span>{sponsor.name}<ArrowUpRight size={15} /></span></a>)}</div>
  </div></section>;
}

function NextSeason() {
  return <section className="sp-next"><div><p className="sp-eyebrow">Und jetzt? Nach vorne schauen.</p><h2>SAISON 2027 – <em>MIT DIR?</em></h2></div><div><p>Die Saison ist vorbei. Die Lust aufs Klettern bleibt.<br />Könntest du dir vorstellen, wieder dabei zu sein?</p><Link className="sp-button sp-button-light" to="/saison/2027"><span>Zum Ausblick 2027</span> <ArrowRight size={19} /></Link><small>Ganz unverbindlich. Einfach Interesse zeigen.</small></div></section>;
}

function Interest({ interested, onInterest, busy, error, production }: { interested: boolean; onInterest: () => void; busy: boolean; error: string; production: boolean }) {
  return <section className="sp-interest sp-interest-photo"><div className="sp-hero-texture" aria-hidden="true" /><div className="container-kl sp-interest-layout"><div className="sp-interest-copy"><p className="sp-eyebrow">Kletterliga NRW · Ausblick 2027</p><p className="sp-interest-kicker">Noch eine Runde?</p><h1>KÖNNTEST DU DIR VORSTELLEN,<br /><em>DABEI ZU SEIN?</em></h1><p className="sp-interest-description">Neue Routen. Neue Begegnungen.<br />Und vielleicht bist du wieder mit dabei.</p><button className="sp-button sp-yes" onClick={onInterest} disabled={interested || busy} aria-busy={busy}><span>{interested ? <><Check size={23} /> Danke für dein Ja!</> : busy ? <>Wird gespeichert …</> : <>Ja. <ArrowUpRight size={24} /></>}</span></button><p className="sp-nonbinding"><strong>Ganz unverbindlich.</strong><br />Du meldest dich damit nicht an und gehst keine Verpflichtung ein.</p><div className="sp-interest-feedback" role="status">{interested ? <p>Danke für dein Interesse! Schön, dass du dir vorstellen kannst, dabei zu sein.</p> : null}</div>{error && <p role="alert">{error}</p>}{production ? <p className="sp-demo-note">Wir zählen dein Interesse einmal pro Browser. Keine Anmeldung nötig.</p> : <p className="sp-demo-note">Lokale Vorschau · Noch keine öffentliche Zählung.</p>}</div><figure className="sp-interest-picture"><img src={image('next-climb')} alt="Eine junge Kletterin am Seil im Finale der Saison 2026" width="1280" height="1920" /><span className="sp-interest-photo-year" aria-hidden="true">2027</span><figcaption>Die Lust aufs Klettern bleibt.<small>Foto aus Saison 2026 · Justus Hoehn</small></figcaption></figure></div></section>;
}

function Archive() {
  return <section className="sp-section sp-archive"><p className="sp-eyebrow">Ergebnisse · Rückblicke · Bilder</p><h1>UNSER <em>SAISONARCHIV</em></h1><p>Ergebnisse, Erinnerungen und die Menschen dahinter.</p><Link to="/saison/2026" className="sp-archive-entry"><img src={image('hero')} alt="Finaltag 2026" /><div><span className="sp-eyebrow">Abgeschlossen</span><h2>2026</h2><p>Rückblick · Ergebnisse · Bilder</p></div><ArrowUpRight size={32} /></Link><p className="sp-small">Weitere abgeschlossene Saisons finden hier später ihren Platz.</p></section>;
}

export default function SeasonPreview({ production = false }: { production?: boolean }) {
  const { interested, busy, error, submit } = useSeasonInterest(production);
  return <div className="season-preview"><ScrollPosition production={production} /><a className="sp-skip-link" href="#inhalt">Zum Inhalt</a><SponsorBanner /><Header /><main id="inhalt" tabIndex={-1}><Routes>
    <Route path="/" element={<><Hero /><Story production={production} /><Gallery /><NextSeason /></>} />
    <Route path="/saison/2026" element={<><Hero season /><Story full production={production} /><SeasonGyms /><ResultsLink /><Gallery /><Thanks /><NextSeason /></>} />
    <Route path="/ergebnisse/2026" element={<SeasonResults />} />
    <Route path="/saison/2027" element={<Interest interested={interested} onInterest={submit} busy={busy} error={error} production={production} />} />
    <Route path="/archiv" element={<Archive />} />
    <Route path="*" element={<section className="sp-section"><h1>HIER GEHT’S ZUR LIGA.</h1><Link className="sp-text-link" to="/"><ChevronLeft size={18} /> Zur Startseite</Link></section>} />
  </Routes></main>{!production && <div className="sp-preview-label">Gestaltungsentwurf · Vorschau zur Abstimmung</div>}<Footer /></div>;
}
