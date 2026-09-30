import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ClipboardList } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/services/supabase";

type Answers = {
  participation: string;
  non_participation_reasons: string[];
  non_participation_detail: string;
  registration_detail: string;
  season_positive: string;
  season_difficult: string;
  finale_attendance: string;
  finale_reasons: string[];
  finale_detail: string;
  route_quantity: string;
  route_ideas: string;
  hall_quantity: string;
  hall_choice: string;
  hall_ideas: string;
  season_distribution: string;
  distribution_ideas: string;
  drop_stations: string;
  drop_stations_ideas: string;
  top_wish: string;
  next_year: string;
};

const initialAnswers: Answers = {
  participation: "", non_participation_reasons: [], non_participation_detail: "", registration_detail: "",
  season_positive: "", season_difficult: "", finale_attendance: "", finale_reasons: [], finale_detail: "",
  route_quantity: "", route_ideas: "",
  hall_quantity: "", hall_choice: "", hall_ideas: "", season_distribution: "",
  distribution_ideas: "", drop_stations: "", drop_stations_ideas: "",
  top_wish: "", next_year: "",
};

const participationOptions = [
  { value: "active", label: "Ich habe mitgeklettert" },
  { value: "followed", label: "Ich habe die Liga verfolgt, aber nicht mitgeklettert" },
  { value: "not_participated", label: "Ich habe nicht mitgeklettert und die Liga kaum verfolgt" },
];
const reasonOptions = [
  { value: "time", label: "Zu wenig Zeit" }, { value: "travel", label: "Wege oder Hallen zu weit" },
  { value: "format", label: "Ablauf oder Regeln passten nicht" }, { value: "routes", label: "Routen passten nicht zu mir" },
  { value: "cost", label: "Kosten waren eine Hürde" }, { value: "awareness", label: "Zu spät von der Teilnahme erfahren" },
  { value: "unaware", label: "Ich kannte die Liga noch nicht" }, { value: "registration", label: "Saisonanmeldung oder App haben nicht funktioniert" },
  { value: "motivation", label: "Andere Interessen oder Prioritäten" }, { value: "other", label: "Ein anderer Grund" },
];
const finaleOptions = [
  { value: "yes", label: "Ja, ich nehme teil" }, { value: "no", label: "Nein, ich nehme nicht teil" },
  { value: "unsure", label: "Das ist noch offen" },
];
const finaleReasonOptions = [
  { value: "date", label: "Der Termin passt nicht" }, { value: "travel", label: "Anreise oder Entfernung" },
  { value: "cost", label: "Kosten" }, { value: "format", label: "Ablauf oder Format" },
  { value: "registration", label: "Die Finalanmeldung hat nicht funktioniert" },
  { value: "cancelled", label: "Ich musste meine Teilnahme wieder absagen" },
  { value: "other", label: "Ein anderer Grund" },
];
const routeOptions = [
  { value: "more", label: "Mehr Routen" }, { value: "same", label: "Die Anzahl passt" },
  { value: "fewer", label: "Weniger Routen" }, { value: "unsure", label: "Kann ich nicht beurteilen" },
];
const hallOptions = [
  { value: "more", label: "Mehr Hallen" }, { value: "same", label: "Die Anzahl passt" },
  { value: "fewer", label: "Weniger Hallen" }, { value: "unsure", label: "Kann ich nicht beurteilen" },
];
const hallChoiceOptions = [
  { value: "more_choice", label: "Mehr Auswahl der Hallen" }, { value: "same", label: "So lassen" },
  { value: "fixed_halls", label: "Mehr feste Vorgaben" }, { value: "unsure", label: "Kann ich nicht beurteilen" },
];
const distributionOptions = [
  { value: "spread", label: "Mehr Zeit zwischen den Hallen" }, { value: "same", label: "Verteilung passt" },
  { value: "compact", label: "Kompaktere Saison" }, { value: "unsure", label: "Kann ich nicht beurteilen" },
];
const dropStationOptions = [
  { value: "yes", label: "Ja, Streichstationen wären gut" },
  { value: "no", label: "Nein, alle Hallen sollten zählen" },
  { value: "unsure", label: "Ich bin noch unsicher" },
];
const nextYearOptions = [
  { value: "yes", label: "Ja" }, { value: "maybe", label: "Vielleicht" }, { value: "no", label: "Eher nicht" },
];
const choiceClass = "flex min-h-12 items-center border-2 border-primary/20 bg-white px-4 py-3 text-sm font-semibold leading-snug text-primary transition-colors hover:border-secondary peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-2";

function ChoiceField({ legend, name, options, value, onChange }: {
  legend: string; name: string; options: { value: string; label: string }[];
  value: string; onChange: (value: string) => void;
}) {
  return <fieldset className="space-y-3">
    <legend className="text-base font-bold leading-snug text-primary sm:text-lg">{legend}</legend>
    <div className="grid gap-2 sm:grid-cols-2">{options.map((option) =>
      <label key={option.value} className="block cursor-pointer">
        <input className="peer sr-only" type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
        <span className={choiceClass}>{option.label}</span>
      </label>)}</div>
  </fieldset>;
}

function ReasonsField({ legend, name, options, values, onToggle }: {
  legend: string; name: string; options: { value: string; label: string }[];
  values: string[]; onToggle: (value: string) => void;
}) {
  return <fieldset className="space-y-3">
    <legend className="text-base font-bold leading-snug text-primary sm:text-lg">{legend}</legend>
    <p className="text-sm text-muted-foreground">Du kannst mehrere Gründe auswählen und unten genauer erklären.</p>
    <div className="grid gap-2 sm:grid-cols-2">{options.map((option) =>
      <label key={option.value} className="block cursor-pointer">
        <input className="peer sr-only" type="checkbox" name={name} value={option.value} checked={values.includes(option.value)} onChange={() => onToggle(option.value)} />
        <span className={choiceClass}>{option.label}</span>
      </label>)}</div>
  </fieldset>;
}

function WrittenField({ id, label, hint, value, onChange, maxLength = 800, placeholder }: {
  id: string; label: string; hint?: string; value: string; onChange: (value: string) => void;
  maxLength?: number; placeholder: string;
}) {
  return <div>
    <label htmlFor={id} className="block text-base font-bold leading-snug text-primary sm:text-lg">{label}</label>
    {hint && <p className="mt-1 text-sm leading-6 text-muted-foreground">{hint}</p>}
    <Textarea id={id} className="mt-3 min-h-28 resize-y rounded-none border-2 border-primary/20 bg-white text-base focus-visible:ring-secondary" maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    <p className="mt-1 text-right text-xs text-muted-foreground">{value.length}/{maxLength} Zeichen</p>
  </div>;
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return <section className="border-t-4 border-primary bg-white px-5 py-6 shadow-[0_10px_35px_rgba(0,61,85,0.06)] sm:px-9 sm:py-9">
    <div className="mb-5 flex gap-4 border-b border-primary/15 pb-4 sm:mb-7 sm:pb-6">
      <span className="font-headline text-2xl text-secondary" aria-hidden="true">{number}</span>
      <div><h2 className="font-headline text-xl leading-tight text-primary sm:text-2xl">{title}</h2>
        <p className={`mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base ${number === "01" ? "hidden sm:block" : ""}`}>{description}</p></div>
    </div>
    <div className="space-y-7">{children}</div>
  </section>;
}

const Saisonfeedback = () => {
  usePageMeta({ title: "Saisonfeedback 2026", description: "Gestalte die Kletterliga NRW 2027 mit: ehrliches Feedback zu Teilnahme, Routen, Hallen und Saisonmodus.", canonicalPath: "/feedback-2026" });
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [website, setWebsite] = useState("");
  const [openedAt] = useState(() => Date.now());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const errorClass = "border-l-4 border-destructive bg-destructive/5 p-4 text-sm text-form-error";

  const setAnswer = (name: keyof Answers, value: string) => {
    setAnswers((current) => {
      if (name === "participation") return {
        ...current, participation: value,
        non_participation_reasons: [], non_participation_detail: "", registration_detail: "",
        season_positive: "", season_difficult: "", finale_attendance: "", finale_reasons: [], finale_detail: "",
      };
      if (name === "finale_attendance") return { ...current, finale_attendance: value, finale_reasons: [], finale_detail: "" };
      return { ...current, [name]: value };
    });
    setError("");
  };
  const toggleReason = (field: "non_participation_reasons" | "finale_reasons", value: string) => {
    setAnswers((current) => {
      const selected = current[field].includes(value)
        ? current[field].filter((reason) => reason !== value)
        : [...current[field], value];
      return { ...current, [field]: selected,
        ...(field === "non_participation_reasons" && value === "registration" && !selected.includes("registration")
          ? { registration_detail: "" } : {}) };
    });
    setError("");
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!answers.participation) {
      setError("Bitte wähle zuerst aus, wie du die Saison 2026 erlebt hast.");
      document.getElementById("feedback-participation")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      return;
    }
    if (answers.participation !== "active" && !answers.non_participation_reasons.length && !answers.non_participation_detail.trim()) {
      setError("Bitte nenne mindestens einen Grund, warum du 2026 nicht mitgeklettert bist.");
      document.getElementById("feedback-reasons")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      return;
    }
    if (answers.participation !== "not_participated" && !answers.top_wish.trim()) {
      setError("Bitte schreibe uns deinen wichtigsten Wunsch für 2027.");
      document.getElementById("feedback-top-wish")?.focus();
      return;
    }
    setSending(true);
    try {
      const { data, error: requestError } = await supabase.functions.invoke("submit-season-feedback", { body: { survey_version: 3, ...answers, website, fill_time_ms: Date.now() - openedAt } });
      if (requestError || !data?.ok) { setError("Das Speichern hat gerade nicht geklappt. Bitte versuche es später erneut."); return; }
      setSent(true);
    } catch { setError("Das Speichern hat gerade nicht geklappt. Bitte versuche es später erneut."); }
    finally { setSending(false); }
  };

  return <PageLayout>
    <section className="relative overflow-hidden bg-primary pb-12 pt-20 text-accent sm:pb-16 sm:pt-24 md:pb-28 md:pt-40">
      <div className="absolute inset-x-0 top-0 h-24 bg-accent md:h-28" aria-hidden="true" />
      <div className="absolute -right-24 top-32 hidden size-72 rotate-45 bg-secondary lg:block lg:size-96" aria-hidden="true" />
      <div className="container-kl relative z-10">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.24em] text-accent/85 sm:mb-4">Kletterliga NRW · Saisonfeedback 2026</p>
        <h1 className="max-w-4xl font-headline text-3xl leading-[1.08] text-accent sm:text-5xl md:text-6xl">DEIN BLICK AUF 2026. DEINE IDEEN FÜR 2027.</h1>
        <p className="mt-3 max-w-2xl text-base leading-6 text-accent/90 sm:mt-5 sm:text-lg sm:leading-7">Was sollte bleiben, was sich ändern? Deine Ideen helfen uns bei der Planung für 2027.</p>
      </div>
    </section>
    <section className="relative -mt-8 bg-[#F7F0E2] pb-20 sm:-mt-12">
      <div className="container-kl max-w-5xl">
        <div className="mb-4 flex flex-col gap-2 border-l-4 border-secondary bg-accent px-5 py-3 text-primary sm:mb-6 sm:flex-row sm:items-start sm:gap-4 sm:py-4">
          <ClipboardList className="hidden size-6 shrink-0 sm:block" aria-hidden="true" />
          <p className="text-sm leading-6 sm:text-base">Kurz und anonym: Deine Perspektive und ggf. ein Grund sind Pflicht. Wer die Liga kennt, nennt außerdem einen Wunsch für 2027. Ohne Name oder E-Mail-Adresse.</p>
        </div>
        {sent ? <div className="border-t-4 border-secondary bg-white p-8 text-center shadow-sm sm:p-12" role="status">
          <Check className="mx-auto mb-5 size-10 text-secondary" aria-hidden="true" />
          <h2 className="font-headline text-2xl text-primary sm:text-3xl">DANKE FÜR DEIN FEEDBACK!</h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">Deine Ideen fließen in die Auswertung der Saison und die Planung für 2027 ein.</p>
          <Link to="/finale" className="mt-7 inline-flex items-center gap-2 font-bold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary">Zum Finaltag <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div> : <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="sr-only" aria-hidden="true"><label htmlFor="feedback-website">Website</label><input id="feedback-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
          <FormSection number="01" title="DEINE PERSPEKTIVE" description="Die folgenden Fragen passen sich daran an, ob du mitgeklettert bist oder nicht.">
            <div id="feedback-participation"><ChoiceField legend="Wie warst du 2026 dabei?" name="participation" options={participationOptions} value={answers.participation} onChange={(value) => setAnswer("participation", value)} /></div>
            {error.startsWith("Bitte wähle zuerst") && <p role="alert" className={errorClass}>{error}</p>}
            {answers.participation && answers.participation !== "active" && <div id="feedback-reasons" className="space-y-7 border-l-4 border-secondary/60 bg-accent/30 p-4 sm:p-6">
              <ReasonsField legend="Wie kam es dazu, dass du 2026 nicht mitgeklettert bist?" name="non_participation_reasons" options={reasonOptions} values={answers.non_participation_reasons} onToggle={(value) => toggleReason("non_participation_reasons", value)} />
              {error.startsWith("Bitte nenne mindestens") && <p role="alert" className={errorClass}>{error}</p>}
              <WrittenField id="feedback-non-participation-detail" label="Was war für dich der entscheidende Punkt?" hint="Zum Beispiel eine konkrete Hürde, ein Moment im Saisonablauf oder etwas, das wir bislang nicht bedacht haben." value={answers.non_participation_detail} onChange={(value) => setAnswer("non_participation_detail", value)} placeholder="Erzähl uns, was bei dir den Ausschlag gegeben hat …" />
              {answers.non_participation_reasons.includes("registration") && <WrittenField id="feedback-registration-detail" label="Was genau hat technisch nicht funktioniert?" hint="Zum Beispiel Saisonanmeldung, Login oder Ergebniseingabe in der App. Bitte keine persönlichen Daten oder Fehlermeldungen mit Zugangsdaten einfügen." value={answers.registration_detail} onChange={(value) => setAnswer("registration_detail", value)} placeholder="An welcher Stelle bist du nicht weitergekommen? …" />}
            </div>}
            {answers.participation === "active" && <div className="space-y-7">
              <div className="grid gap-6 sm:grid-cols-2">
                <WrittenField id="feedback-season-positive" label="Was hat 2026 gut funktioniert?" value={answers.season_positive} onChange={(value) => setAnswer("season_positive", value)} placeholder="Das sollten wir beibehalten …" />
                <WrittenField id="feedback-season-difficult" label="Was hat dich ausgebremst?" value={answers.season_difficult} onChange={(value) => setAnswer("season_difficult", value)} placeholder="Hier wurde es für mich schwierig …" />
              </div>
              <div className="space-y-6 border-t border-primary/15 pt-6">
                <ChoiceField legend="Wie sieht es mit deiner Teilnahme am Finale am 3. Oktober aus?" name="finale_attendance" options={finaleOptions} value={answers.finale_attendance} onChange={(value) => setAnswer("finale_attendance", value)} />
                {(answers.finale_attendance === "no" || answers.finale_attendance === "unsure") && <div className="space-y-6 border-l-4 border-secondary/60 bg-accent/30 p-4 sm:p-6">
                  <ReasonsField legend="Was spricht für dich gegen eine Teilnahme am Finale?" name="finale_reasons" options={finaleReasonOptions} values={answers.finale_reasons} onToggle={(value) => toggleReason("finale_reasons", value)} />
                  <WrittenField id="feedback-finale-detail" label="Möchtest du uns den Grund genauer erklären?" hint="Auch Probleme mit der Finalanmeldung kannst du hier beschreiben. Bitte keine persönlichen Daten eintragen." value={answers.finale_detail} onChange={(value) => setAnswer("finale_detail", value)} placeholder="Das war für mich ausschlaggebend …" />
                </div>}
              </div>
            </div>}
          </FormSection>
          <FormSection number="02" title="ROUTEN & HALLEN" description="Mehr oder weniger ist nicht alles: Uns interessieren deine Gründe und konkreten Vorschläge.">
            <ChoiceField legend="Wie viele Routen wären für dich richtig?" name="route_quantity" options={routeOptions} value={answers.route_quantity} onChange={(value) => setAnswer("route_quantity", value)} />
            <WrittenField id="feedback-route-ideas" label="Was würdest du an den Routen ändern?" hint="Anzahl, Schwierigkeitsgrade, Stil, Auswahl oder etwas ganz anderes." value={answers.route_ideas} onChange={(value) => setAnswer("route_ideas", value)} placeholder="Zum Beispiel: lieber …, weil …" />
            <div className="border-t border-primary/15 pt-7"><ChoiceField legend="Wie viele Hallen sollten Teil der Liga sein?" name="hall_quantity" options={hallOptions} value={answers.hall_quantity} onChange={(value) => setAnswer("hall_quantity", value)} /></div>
            <ChoiceField legend="Wie frei möchtest du die Hallen wählen können?" name="hall_choice" options={hallChoiceOptions} value={answers.hall_choice} onChange={(value) => setAnswer("hall_choice", value)} />
            <WrittenField id="feedback-hall-ideas" label="Welche Hallen, Regionen oder Auswahlregeln wünschst du dir?" value={answers.hall_ideas} onChange={(value) => setAnswer("hall_ideas", value)} placeholder="Andere Hallen, Wege, Kombinationen oder Wahlmöglichkeiten …" />
          </FormSection>
          <FormSection number="03" title="SAISONMODUS" description="Hier geht es um die Verteilung der Stationen und darum, ob wirklich jede Halle zählen sollte.">
            <ChoiceField legend="Wie sollte die Saison zeitlich verteilt sein?" name="season_distribution" options={distributionOptions} value={answers.season_distribution} onChange={(value) => setAnswer("season_distribution", value)} />
            <WrittenField id="feedback-distribution-ideas" label="Wie würde eine gute Verteilung für dich aussehen?" value={answers.distribution_ideas} onChange={(value) => setAnswer("distribution_ideas", value)} placeholder="Zum Beispiel mehr Zeit pro Halle, andere Reihenfolge oder flexible Termine …" />
            <div className="border-t border-primary/15 pt-7"><ChoiceField legend="Sollte man einzelne Hallen als Streichstation auslassen können?" name="drop_stations" options={dropStationOptions} value={answers.drop_stations} onChange={(value) => setAnswer("drop_stations", value)} /></div>
            <WrittenField id="feedback-drop-stations-ideas" label="Warum – und wie könnte das fair funktionieren?" value={answers.drop_stations_ideas} onChange={(value) => setAnswer("drop_stations_ideas", value)} placeholder="Wie viele Stationen dürften entfallen? Was wäre fair? …" />
          </FormSection>
          <FormSection number="04" title="DEIN WICHTIGSTER WUNSCH" description="Wenn wir für 2027 nur eine Sache ändern oder unbedingt behalten: Welche wäre das für dich?">
            <WrittenField id="feedback-top-wish" label={answers.participation === "not_participated" ? "Was müsste die Kletterliga bieten, damit du 2027 mitmachen würdest? (freiwillig)" : "Was wünschst du dir für die nächste Saison?"} value={answers.top_wish} onChange={(value) => setAnswer("top_wish", value)} maxLength={1200} placeholder="Mir wäre besonders wichtig, dass …" />
            {error.startsWith("Bitte schreibe uns") && <p role="alert" className={errorClass}>{error}</p>}
            <ChoiceField legend="Könntest du dir vorstellen, 2027 dabei zu sein?" name="next_year" options={nextYearOptions} value={answers.next_year} onChange={(value) => setAnswer("next_year", value)} />
          </FormSection>
          <div className="bg-white px-5 py-7 sm:px-9">
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">Bitte trage keine Namen oder andere personenbezogene Daten in die Freitextfelder ein. Deine Antworten werden ohne Konto-Zuordnung gespeichert und für die Planung der nächsten Saison ausgewertet. Mehr dazu in unserer <Link className="font-semibold text-primary underline underline-offset-2" to="/datenschutz">Datenschutzerklärung</Link>.</p>
            {error.startsWith("Das Speichern") && <p role="alert" className={`mt-5 ${errorClass}`}>{error}</p>}
            <Button type="submit" variant="secondary" size="lg" disabled={sending} className="mt-6 min-h-12 w-full font-bold sm:w-auto">{sending ? "Wird gespeichert …" : "Feedback absenden"}</Button>
          </div>
        </form>}
      </div>
    </section>
  </PageLayout>;
};

export default Saisonfeedback;
