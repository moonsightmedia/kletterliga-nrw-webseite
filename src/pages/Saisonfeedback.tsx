import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/services/supabase";

type Answers = {
  participation: string;
  top_wish: string;
  keep_aspect: string;
  main_barrier: string;
  barrier_detail: string;
  registration_detail: string;
  awareness_source: string;
  spectator_note: string;
  finale_eligibility: string;
  finale_attendance: string;
  finale_reason: string;
  finale_detail: string;
  next_year: string;
  deep_dive_topics: string[];
  route_quantity: string;
  route_ideas: string;
  hall_pool: string;
  hall_visits: string;
  hall_ideas: string;
  season_distribution: string;
  distribution_ideas: string;
  dropped_score: string;
  scoring_ideas: string;
};

const initialAnswers: Answers = {
  participation: "", top_wish: "", keep_aspect: "", main_barrier: "", barrier_detail: "",
  registration_detail: "", awareness_source: "", spectator_note: "", finale_eligibility: "",
  finale_attendance: "", finale_reason: "", finale_detail: "", next_year: "", deep_dive_topics: [],
  route_quantity: "", route_ideas: "", hall_pool: "", hall_visits: "", hall_ideas: "",
  season_distribution: "", distribution_ideas: "", dropped_score: "", scoring_ideas: "",
};

const participationOptions = [
  { value: "active", label: "Ich bin 2026 mitgeklettert" },
  { value: "followed", label: "Ich kannte die Liga, habe aber nicht mitgemacht" },
  { value: "not_participated", label: "Ich habe erst spät oder nach der Saison davon erfahren" },
  { value: "spectator", label: "Ich war nur als Zuschauer:in oder Begleitung dabei" },
];
const reasonOptions = [
  { value: "time", label: "Mir fehlte die Zeit" }, { value: "travel", label: "Die Wege zu den Hallen waren zu weit" },
  { value: "format", label: "Ablauf oder Regeln passten nicht zu mir" }, { value: "routes", label: "Die Routen passten nicht zu mir" },
  { value: "cost", label: "Die Kosten waren eine Hürde" }, { value: "registration", label: "Anmeldung oder App haben nicht funktioniert" },
  { value: "confidence", label: "Ich war unsicher, ob mein Können ausreicht" },
  { value: "personal", label: "Persönliche Umstände" }, { value: "other", label: "Ein anderer Grund" },
];
const eligibilityOptions = [
  { value: "yes", label: "Ja, ich bin fürs Halbfinale startberechtigt" },
  { value: "no", label: "Nein, ich bin nicht startberechtigt" },
  { value: "unsure", label: "Das weiß ich nicht genau" },
];
const pastEligibilityOptions = [
  { value: "yes", label: "Ja, ich war fürs Halbfinale startberechtigt" },
  { value: "no", label: "Nein, ich war nicht startberechtigt" },
  { value: "unsure", label: "Das weiß ich nicht genau" },
];
const finaleOptions = [
  { value: "yes", label: "Ja, ich nehme am Halbfinale teil" }, { value: "no", label: "Nein, ich nehme nicht teil" },
  { value: "unsure", label: "Das ist noch offen" },
];
const finaleReasonOptions = [
  { value: "date", label: "Der Termin passt nicht" }, { value: "travel", label: "Anreise oder Entfernung" },
  { value: "cost", label: "Die Kosten" }, { value: "format", label: "Ablauf oder Format" },
  { value: "registration", label: "Die Finalanmeldung hat nicht funktioniert" },
  { value: "personal", label: "Persönliche Umstände" },
  { value: "other", label: "Ein anderer Grund" },
];
const deepDiveOptions = [
  { value: "routes", label: "Routen" }, { value: "halls", label: "Hallen & Wege" },
  { value: "timing", label: "Zeitplan" }, { value: "scoring", label: "Wertung & Streichstationen" },
];
const routeOptions = [
  { value: "more", label: "Mehr Routen" }, { value: "same", label: "Die Anzahl passt" },
  { value: "fewer", label: "Weniger Routen" }, { value: "unsure", label: "Kann ich nicht beurteilen" },
];
const hallPoolOptions = [
  { value: "more", label: "Mehr Partnerhallen zur Auswahl" }, { value: "same", label: "Etwa gleich viele" },
  { value: "fewer", label: "Weniger Partnerhallen" }, { value: "unsure", label: "Kann ich nicht beurteilen" },
];
const hallVisitOptions = [
  { value: "all", label: "Alle teilnehmenden Hallen besuchen" },
  { value: "choose", label: "Eine feste Anzahl aus einem größeren Hallenpool wählen" },
  { value: "regions", label: "Zwischen regionalen Hallengruppen wählen" },
  { value: "unsure", label: "Kann ich nicht beurteilen" },
];
const distributionOptions = [
  { value: "more", label: "Mehr Zeit pro Hallenstation" }, { value: "same", label: "Die Zeit pro Halle passt" },
  { value: "less", label: "Kürzere Stationen" }, { value: "unsure", label: "Kann ich nicht beurteilen" },
];
const droppedScoreOptions = [
  { value: "none", label: "Nein, alle Hallenwertungen sollen zählen" },
  { value: "one", label: "Ja, die schwächste Hallenwertung streichen" },
  { value: "multiple", label: "Ja, mehr als eine Hallenwertung streichen" },
  { value: "unsure", label: "Kann ich nicht beurteilen" },
];
const nextYearOptions = [
  { value: "yes", label: "Ja" }, { value: "maybe", label: "Vielleicht" }, { value: "no", label: "Eher nicht" },
];
const choiceClass = "flex min-h-14 items-center rounded-lg border-2 border-primary/10 bg-background px-4 py-3 text-sm font-semibold leading-snug text-primary transition-colors hover:border-secondary/60 hover:bg-accent/40 peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-2";

function ChoiceField({ legend, name, options, value, onChange }: {
  legend: string; name: string; options: { value: string; label: string }[];
  value: string; onChange: (value: string) => void;
}) {
  return <fieldset className="space-y-3">
    <legend className="text-base font-bold leading-snug text-primary sm:text-lg">{legend}</legend>
    <div className="grid gap-2 sm:grid-cols-2">{options.map((option) =>
      <label key={option.value} className="block cursor-pointer">
        <input className="peer sr-only" type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
        <span className={`${choiceClass} ${value === option.value ? "border-secondary bg-accent/60 shadow-sm" : ""}`}>
          <span aria-hidden="true" className={`mr-3 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${value === option.value ? "border-secondary" : "border-primary/35"}`}>
            {value === option.value && <span className="size-2 rounded-full bg-secondary" />}
          </span>
          {option.label}
        </span>
      </label>)}</div>
  </fieldset>;
}

function MultiChoiceField({ legend, hint, name, options, values, onToggle }: {
  legend: string; hint: string; name: string; options: { value: string; label: string }[];
  values: string[]; onToggle: (value: string) => void;
}) {
  return <fieldset className="space-y-3">
    <legend className="text-base font-bold leading-snug text-primary sm:text-lg">{legend}</legend>
    <p className="text-sm text-muted-foreground">{hint}</p>
    <div className="grid gap-2 sm:grid-cols-2">{options.map((option) =>
      <label key={option.value} className="block cursor-pointer">
        <input className="peer sr-only" type="checkbox" name={name} value={option.value} checked={values.includes(option.value)} onChange={() => onToggle(option.value)} />
        <span className={`${choiceClass} ${values.includes(option.value) ? "border-secondary bg-accent/60 shadow-sm" : ""}`}>
          <span aria-hidden="true" className={`mr-3 flex size-5 shrink-0 items-center justify-center rounded border-2 ${values.includes(option.value) ? "border-secondary bg-secondary text-secondary-foreground" : "border-primary/35"}`}>
            {values.includes(option.value) && <Check className="size-3.5" strokeWidth={3} />}
          </span>
          {option.label}
        </span>
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
    <Textarea id={id} className="mt-3 min-h-28 resize-y rounded-lg border-primary/20 bg-background text-base focus-visible:ring-secondary" maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    <p className="mt-1 text-right text-xs text-muted-foreground">{value.length}/{maxLength} Zeichen</p>
  </div>;
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return <section className="rounded-xl border border-border/50 bg-card px-5 py-6 shadow-lg sm:px-9 sm:py-9">
    <div className="mb-6 flex gap-4 border-b border-primary/10 pb-5 sm:mb-8 sm:pb-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent font-headline text-xl text-primary" aria-hidden="true">{number}</span>
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
  const pastFinalDay = Date.now() >= new Date("2026-10-04T00:00:00+02:00").getTime();
  const attendanceOptions = pastFinalDay
    ? [{ value: "yes", label: "Ja, ich war beim Halbfinale dabei" }, { value: "no", label: "Nein, ich war nicht dabei" }]
    : finaleOptions;

  const setAnswer = (name: Exclude<keyof Answers, "deep_dive_topics">, value: string) => {
    setAnswers((current) => {
      if (name === "participation") return { ...initialAnswers, participation: value };
      if (name === "main_barrier") return { ...current, main_barrier: value, registration_detail: "" };
      if (name === "finale_eligibility") return { ...current, finale_eligibility: value, finale_attendance: "", finale_reason: "", finale_detail: "" };
      if (name === "finale_attendance") return { ...current, finale_attendance: value, finale_reason: "", finale_detail: "" };
      return { ...current, [name]: value };
    });
    setError("");
  };
  const toggleTopic = (value: string) => {
    setAnswers((current) => {
      const selected = current.deep_dive_topics.includes(value)
        ? current.deep_dive_topics.filter((topic) => topic !== value)
        : [...current.deep_dive_topics, value];
      const next = { ...current, deep_dive_topics: selected };
      if (selected.includes(value)) return next;
      if (value === "routes") return { ...next, route_quantity: "", route_ideas: "" };
      if (value === "halls") return { ...next, hall_pool: "", hall_visits: "", hall_ideas: "" };
      if (value === "timing") return { ...next, season_distribution: "", distribution_ideas: "" };
      if (value === "scoring") return { ...next, dropped_score: "", scoring_ideas: "" };
      return next;
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
    if (answers.participation === "followed" && !answers.main_barrier) {
      setError("Bitte wähle den wichtigsten Grund aus, warum du 2026 nicht mitgemacht hast.");
      document.getElementById("feedback-main-barrier")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      return;
    }
    setSending(true);
    try {
      const { data, error: requestError } = await supabase.functions.invoke("submit-season-feedback", { body: { survey_version: 4, ...answers, website, fill_time_ms: Date.now() - openedAt } });
      if (requestError || !data?.ok) { setError("Das Speichern hat gerade nicht geklappt. Bitte versuche es später erneut."); return; }
      setSent(true);
    } catch { setError("Das Speichern hat gerade nicht geklappt. Bitte versuche es später erneut."); }
    finally { setSending(false); }
  };

  return <PageLayout>
    <PageHeader title="SAISONFEEDBACK 2026" subtitle="Was lief gut – und was sollten wir für 2027 ändern? Wir freuen uns auf deine ehrliche Sicht." />
    <section className="bg-background py-10 pb-20 sm:py-14 sm:pb-24">
      <div className="container-kl max-w-5xl">
        <p className="mb-6 max-w-3xl text-sm leading-6 text-muted-foreground sm:mb-8 sm:text-base">Ohne Namen oder E-Mail-Adresse: Erzähl uns zuerst, wie du die Liga erlebt hast. Danach kannst du nur die Themen vertiefen, zu denen du etwas sagen möchtest.</p>
        {sent ? <div className="rounded-xl border border-border/50 bg-card p-8 text-center shadow-lg sm:p-12" role="status">
          <Check className="mx-auto mb-5 size-10 text-secondary" aria-hidden="true" />
          <h2 className="font-headline text-2xl text-primary sm:text-3xl">DANKE FÜR DEIN FEEDBACK!</h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">Deine Ideen fließen in die Auswertung der Saison und die Planung für 2027 ein.</p>
          <Link to="/finale" className="mt-7 inline-flex items-center gap-2 font-bold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary">Zum Finaltag <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div> : <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="sr-only" aria-hidden="true"><label htmlFor="feedback-website">Website</label><input id="feedback-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
          <FormSection number="01" title="DEINE PERSPEKTIVE" description="Ein paar Fragen zum Einstieg – ohne vorgegebene Themen für deinen wichtigsten Gedanken.">
            <div id="feedback-participation"><ChoiceField legend="Welche Beschreibung trifft am besten auf dich zu?" name="participation" options={participationOptions} value={answers.participation} onChange={(value) => setAnswer("participation", value)} /></div>
            {error.startsWith("Bitte wähle zuerst") && <p role="alert" className={errorClass}>{error}</p>}
            {answers.participation && <WrittenField id="feedback-top-wish" label={answers.participation === "active" || answers.participation === "followed" ? "Wenn du eine Sache für 2027 ändern könntest: Welche wäre das – und warum?" : "Was wäre dir bei einer Kletterliga 2027 wichtig?"} hint="Ein Gedanke reicht. Du musst nicht zu jedem Thema etwas schreiben." value={answers.top_wish} onChange={(value) => setAnswer("top_wish", value)} maxLength={1200} placeholder="Mir wäre besonders wichtig, dass …" />}
            {(answers.participation === "active" || answers.participation === "followed") && <WrittenField id="feedback-keep-aspect" label="Was sollte auf jeden Fall bleiben?" value={answers.keep_aspect} onChange={(value) => setAnswer("keep_aspect", value)} placeholder="Das hat für mich gut funktioniert …" />}
          </FormSection>
          {answers.participation === "followed" && <FormSection number="02" title="WARUM NICHT DABEI?" description="Uns hilft vor allem zu verstehen, was für dich ausschlaggebend war.">
            <div id="feedback-main-barrier"><ChoiceField legend="Was war dein wichtigster Grund, 2026 nicht mitzuklettern?" name="main_barrier" options={reasonOptions} value={answers.main_barrier} onChange={(value) => setAnswer("main_barrier", value)} /></div>
            {error.startsWith("Bitte wähle den wichtigsten") && <p role="alert" className={errorClass}>{error}</p>}
            <WrittenField id="feedback-barrier-detail" label="Gab es weitere Gründe oder einen konkreten Moment, der den Ausschlag gab?" hint="Freiwillig – hier ist Platz für alles, was die Auswahl nicht trifft." value={answers.barrier_detail} onChange={(value) => setAnswer("barrier_detail", value)} placeholder="Bei mir war besonders wichtig, dass …" />
            {answers.main_barrier === "registration" && <WrittenField id="feedback-registration-detail" label="Was hat bei Anmeldung oder App nicht funktioniert?" hint="Bitte keine Zugangsdaten oder persönlichen Angaben eintragen." value={answers.registration_detail} onChange={(value) => setAnswer("registration_detail", value)} placeholder="An dieser Stelle kam ich nicht weiter …" />}
          </FormSection>}
          {answers.participation === "not_participated" && <FormSection number="02" title="SPÄT ENTDECKT" description="Du musst die Saison nicht beurteilen, wenn du sie kaum kanntest.">
            <WrittenField id="feedback-awareness-source" label="Wo oder wann bist du auf die Kletterliga aufmerksam geworden?" hint="Freiwillig – damit wir 2027 besser sichtbar werden." value={answers.awareness_source} onChange={(value) => setAnswer("awareness_source", value)} placeholder="Zum Beispiel durch eine Halle, Freunde oder Social Media …" />
          </FormSection>}
          {answers.participation === "spectator" && <FormSection number="02" title="DEIN BLICK VON AUSSEN" description="Auch als Zuschauer:in oder Begleitung kannst du uns etwas Wichtiges mitgeben.">
            <WrittenField id="feedback-spectator-note" label="Was ist dir aus deiner Perspektive aufgefallen?" value={answers.spectator_note} onChange={(value) => setAnswer("spectator_note", value)} placeholder="Das fand ich gut oder würde ich ändern …" />
          </FormSection>}
          {answers.participation === "active" && <FormSection number="02" title="HALBFINALE AM 3. OKTOBER" description={pastFinalDay ? "Nur wenn du dazu etwas sagen möchtest. Halbfinale und Finale fanden am selben Tag statt." : "Nur wenn du dazu etwas sagen möchtest. Halbfinale und Finale finden am selben Tag statt."}>
            <ChoiceField legend={pastFinalDay ? "Warst du für das Halbfinale startberechtigt?" : "Bist du für das Halbfinale startberechtigt?"} name="finale_eligibility" options={pastFinalDay ? pastEligibilityOptions : eligibilityOptions} value={answers.finale_eligibility} onChange={(value) => setAnswer("finale_eligibility", value)} />
            {answers.finale_eligibility === "yes" && <div className="space-y-6 rounded-xl border border-secondary/20 bg-accent/20 p-4 sm:p-6">
              <ChoiceField legend={pastFinalDay ? "Hast du am Halbfinale am 3. Oktober teilgenommen?" : "Wirst du am Halbfinale am 3. Oktober teilnehmen?"} name="finale_attendance" options={attendanceOptions} value={answers.finale_attendance} onChange={(value) => setAnswer("finale_attendance", value)} />
              {(answers.finale_attendance === "no" || answers.finale_attendance === "unsure") && <>
                <ChoiceField legend={pastFinalDay ? "Was war der wichtigste Grund dafür?" : "Was ist der wichtigste Grund dafür?"} name="finale_reason" options={finaleReasonOptions} value={answers.finale_reason} onChange={(value) => setAnswer("finale_reason", value)} />
                <WrittenField id="feedback-finale-detail" label="Möchtest du dazu noch etwas erklären?" hint="Freiwillig – auch technische Probleme kannst du hier beschreiben, aber bitte ohne persönliche Daten." value={answers.finale_detail} onChange={(value) => setAnswer("finale_detail", value)} placeholder={pastFinalDay ? "Das hat für mich den Ausschlag gegeben …" : "Das ist für mich ausschlaggebend …"} />
              </>}
            </div>}
          </FormSection>}
          {answers.participation && <FormSection number="03" title="DEIN BLICK AUF 2027" description="Die Vertiefung ist freiwillig. Wähle nur Themen aus, bei denen du mitreden möchtest.">
            <ChoiceField legend={answers.participation === "active" ? "Könntest du dir vorstellen, 2027 wieder mitzuklettern?" : "Könntest du dir vorstellen, 2027 selbst mitzuklettern?"} name="next_year" options={nextYearOptions} value={answers.next_year} onChange={(value) => setAnswer("next_year", value)} />
            <MultiChoiceField legend="Zu welchen Themen möchtest du genauer Feedback geben?" hint="Du kannst mehrere Themen wählen – oder direkt absenden." name="deep_dive_topics" options={deepDiveOptions} values={answers.deep_dive_topics} onToggle={toggleTopic} />
          </FormSection>}
          {answers.deep_dive_topics.includes("routes") && <FormSection number="R" title="ROUTEN" description="Hier geht es um die Ligaarouten während der Saison, nicht um die fünf Halbfinalrouten.">
            <ChoiceField legend="Wie viele Ligaarouten pro Halle wünschst du dir im Vergleich zu 2026?" name="route_quantity" options={routeOptions} value={answers.route_quantity} onChange={(value) => setAnswer("route_quantity", value)} />
            <WrittenField id="feedback-route-ideas" label="Was sollte sich bei Schwierigkeit, Stil oder Auswahl der Routen ändern?" value={answers.route_ideas} onChange={(value) => setAnswer("route_ideas", value)} placeholder="Für mich wäre besser, wenn …" />
          </FormSection>}
          {answers.deep_dive_topics.includes("halls") && <FormSection number="H" title="HALLEN & WEGE" description="Mehr Partnerhallen bedeuten nicht automatisch mehr verpflichtende Besuche.">
            <ChoiceField legend="Wie groß sollte der Pool an Partnerhallen sein?" name="hall_pool" options={hallPoolOptions} value={answers.hall_pool} onChange={(value) => setAnswer("hall_pool", value)} />
            <ChoiceField legend="Wie sollte festgelegt werden, welche Hallen man für die Wertung besuchen muss?" name="hall_visits" options={hallVisitOptions} value={answers.hall_visits} onChange={(value) => setAnswer("hall_visits", value)} />
            <WrittenField id="feedback-hall-ideas" label="Welche Hallen, Regionen oder Auswahlregeln würden dir helfen – und warum?" value={answers.hall_ideas} onChange={(value) => setAnswer("hall_ideas", value)} placeholder="Eine bessere Verteilung wäre für mich …" />
          </FormSection>}
          {answers.deep_dive_topics.includes("timing") && <FormSection number="Z" title="ZEITPLAN" description="Denke an die Zeit pro Hallenstation und den Rhythmus der Saison.">
            <ChoiceField legend="Wie viel Zeit pro Hallenstation wäre für dich richtig?" name="season_distribution" options={distributionOptions} value={answers.season_distribution} onChange={(value) => setAnswer("season_distribution", value)} />
            <WrittenField id="feedback-distribution-ideas" label="Wie sähe ein guter Saisonablauf für dich konkret aus?" hint="Zum Beispiel andere Reihenfolge, flexiblere Zeitfenster oder Pausen." value={answers.distribution_ideas} onChange={(value) => setAnswer("distribution_ideas", value)} placeholder="Für mich würde gut funktionieren …" />
          </FormSection>}
          {answers.deep_dive_topics.includes("scoring") && <FormSection number="W" title="WERTUNG" description="Hallen auslassen und Hallenergebnisse streichen sind unterschiedliche Regeln. Die Besuchspflicht steht im Themenblock „Hallen & Wege“.">
            <ChoiceField legend="Wenn alle Pflicht-Hallen besucht wurden: Soll eine schwache Hallenwertung aus der Rangliste herausfallen?" name="dropped_score" options={droppedScoreOptions} value={answers.dropped_score} onChange={(value) => setAnswer("dropped_score", value)} />
            <WrittenField id="feedback-scoring-ideas" label="Warum wäre das fair oder unfair? Hast du eine andere Idee?" value={answers.scoring_ideas} onChange={(value) => setAnswer("scoring_ideas", value)} placeholder="Für die Wertung wäre mir wichtig …" />
          </FormSection>}
          <div className="rounded-xl border border-border/50 bg-card px-5 py-7 shadow-lg sm:px-9">
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">Bitte trage keine Namen oder andere personenbezogene Daten in die Freitextfelder ein. Deine Antworten werden ohne Konto-Zuordnung gespeichert und für die Planung der nächsten Saison ausgewertet. Mehr dazu in unserer <Link className="font-semibold text-primary underline underline-offset-2" to="/datenschutz">Datenschutzerklärung</Link>.</p>
            {error.startsWith("Das Speichern") && <p role="alert" className={`mt-5 ${errorClass}`}>{error}</p>}
            <Button type="submit" size="lg" disabled={sending} className="mt-6 min-h-12 w-full font-bold sm:w-auto"><span className="skew-x-6">{sending ? "Wird gespeichert …" : "Feedback absenden"}</span></Button>
          </div>
        </form>}
      </div>
    </section>
  </PageLayout>;
};

export default Saisonfeedback;
