import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, MessageSquareText } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/services/supabase";

type Answers = {
  participation: string;
  overall_rating: number;
  best_aspect: string;
  improve_aspect: string;
  next_year: string;
  comment: string;
};

const initialAnswers: Answers = {
  participation: "",
  overall_rating: 0,
  best_aspect: "",
  improve_aspect: "",
  next_year: "",
  comment: "",
};

const participationOptions = [
  { value: "active", label: "Ich habe aktiv mitgeklettert" },
  { value: "followed", label: "Ich habe die Liga verfolgt" },
  { value: "not_participated", label: "Ich war dieses Jahr nicht dabei" },
];
const bestOptions = [
  { value: "halls", label: "Die verschiedenen Hallen" },
  { value: "flexibility", label: "Das Klettern im eigenen Tempo" },
  { value: "ranking_app", label: "App und Ranglisten" },
  { value: "community", label: "Die Kletter-Community" },
  { value: "other", label: "Etwas anderes" },
];
const improveOptions = [
  { value: "rules", label: "Regeln und Ablauf" },
  { value: "communication", label: "Infos und Kommunikation" },
  { value: "app", label: "App und Ergebniseingabe" },
  { value: "halls_routes", label: "Hallen und Routen" },
  { value: "nothing", label: "Eigentlich nichts Wesentliches" },
  { value: "other", label: "Etwas anderes" },
];
const nextYearOptions = [
  { value: "yes", label: "Ja" },
  { value: "maybe", label: "Vielleicht" },
  { value: "no", label: "Eher nicht" },
];

function ChoiceField({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="font-headline text-lg leading-snug text-primary sm:text-xl">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className="block cursor-pointer">
            <input
              className="peer sr-only"
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="flex min-h-14 items-center border-2 border-primary/15 bg-white px-4 py-3 text-sm font-medium text-primary transition-colors hover:border-secondary peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-2">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const Saisonfeedback = () => {
  usePageMeta({
    title: "Saisonfeedback 2026",
    description: "Sag uns anonym, was an der Kletterliga NRW 2026 gut war und was wir verbessern können.",
    canonicalPath: "/feedback-2026",
  });

  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [website, setWebsite] = useState("");
  const [openedAt] = useState(() => Date.now());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const setAnswer = (name: keyof Answers, value: string | number) => {
    setAnswers((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!answers.participation || !answers.overall_rating || !answers.best_aspect || !answers.improve_aspect || !answers.next_year) {
      setError("Bitte beantworte die fünf Auswahlfragen.");
      return;
    }
    setSending(true);
    try {
      const { data, error: requestError } = await supabase.functions.invoke("submit-season-feedback", {
        body: { ...answers, website, fill_time_ms: Date.now() - openedAt },
      });
      if (requestError || !data?.ok) {
        setError("Das Speichern hat gerade nicht geklappt. Bitte versuche es später erneut.");
        return;
      }
      setSent(true);
    } catch {
      setError("Das Speichern hat gerade nicht geklappt. Bitte versuche es später erneut.");
    } finally {
      setSending(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title="DEINE SAISON. DEIN FEEDBACK."
        subtitle="Was lief bei der Kletterliga NRW 2026 gut – und was können wir für die nächste Saison besser machen?"
      />
      <section className="section-padding bg-background">
        <div className="container-kl max-w-4xl">
          <div className="mb-8 flex items-start gap-4 border-l-4 border-secondary bg-accent/50 p-5 text-primary">
            <MessageSquareText className="mt-1 size-6 shrink-0" aria-hidden="true" />
            <p className="text-sm leading-6 sm:text-base">
              Fünf kurze Fragen, ungefähr zwei Minuten. Die Rückmeldung ist freiwillig und ohne Name oder E-Mail-Adresse möglich – auch wenn du dieses Jahr nicht mitgeklettert bist.
            </p>
          </div>

          {sent ? (
            <div className="border-2 border-primary bg-white p-8 text-center sm:p-12" role="status">
              <Check className="mx-auto mb-5 size-10 text-secondary" aria-hidden="true" />
              <h2 className="font-headline text-2xl text-primary sm:text-3xl">DANKE FÜR DEIN FEEDBACK!</h2>
              <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
                Wir sammeln alle Rückmeldungen für die Auswertung der Saison und die Planung 2027.
              </p>
              <Link to="/finale" className="mt-7 inline-flex items-center gap-2 font-bold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary">
                Zum Finaltag <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-9 border-2 border-primary/10 bg-white p-5 shadow-sm sm:p-9" noValidate>
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="feedback-website">Website</label>
                <input id="feedback-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
              </div>
              <ChoiceField legend="1. Wie hast du die Saison erlebt?" name="participation" options={participationOptions} value={answers.participation} onChange={(value) => setAnswer("participation", value)} />
              <fieldset className="space-y-4">
                <legend className="font-headline text-lg leading-snug text-primary sm:text-xl">2. Wie war dein Gesamteindruck?</legend>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <label key={rating} className="cursor-pointer">
                      <input className="peer sr-only" type="radio" name="overall_rating" value={rating} checked={answers.overall_rating === rating} onChange={() => setAnswer("overall_rating", rating)} />
                      <span className="flex min-h-14 items-center justify-center border-2 border-primary/15 bg-white font-headline text-xl text-primary transition-colors hover:border-secondary peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-2">{rating}</span>
                    </label>
                  ))}
                </div>
                <p className="flex justify-between text-xs text-muted-foreground"><span>1 = nicht gut</span><span>5 = sehr gut</span></p>
              </fieldset>
              <ChoiceField legend="3. Was hat dir am besten gefallen?" name="best_aspect" options={bestOptions} value={answers.best_aspect} onChange={(value) => setAnswer("best_aspect", value)} />
              <ChoiceField legend="4. Wo sollten wir zuerst besser werden?" name="improve_aspect" options={improveOptions} value={answers.improve_aspect} onChange={(value) => setAnswer("improve_aspect", value)} />
              <ChoiceField legend="5. Wärst du 2027 gern wieder dabei?" name="next_year" options={nextYearOptions} value={answers.next_year} onChange={(value) => setAnswer("next_year", value)} />
              <div>
                <label className="font-headline text-lg leading-snug text-primary sm:text-xl" htmlFor="feedback-comment">Möchtest du noch etwas ergänzen? <span className="font-body text-sm font-normal">(optional)</span></label>
                <Textarea id="feedback-comment" className="mt-4 min-h-32 resize-y border-2 border-primary/20 text-base focus-visible:ring-secondary" maxLength={1000} value={answers.comment} onChange={(event) => setAnswer("comment", event.target.value)} placeholder="Was sollten wir beibehalten oder konkret ändern?" />
                <p className="mt-2 text-xs text-muted-foreground">Bitte keine Namen oder anderen personenbezogenen Daten eintragen. {answers.comment.length}/1000 Zeichen</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Deine Antworten werden ohne Konto-Zuordnung gespeichert und nur für die Auswertung der Saison 2026 verwendet. Mehr dazu in unserer <Link className="font-medium text-primary underline underline-offset-2" to="/datenschutz">Datenschutzerklärung</Link>.
              </p>
              {error && <p role="alert" className="border-l-4 border-destructive bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
              <Button type="submit" variant="secondary" size="lg" disabled={sending} className="min-h-12 w-full font-bold sm:w-auto">
                {sending ? "Wird gespeichert …" : "Feedback absenden"}
              </Button>
            </form>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Saisonfeedback;
