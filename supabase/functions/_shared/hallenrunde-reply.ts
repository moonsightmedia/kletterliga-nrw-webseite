import { addDays, addMonths, format, isValid, parseISO } from "date-fns";
import { z } from "zod";

export const season = { repliesOpen: "2026-11-09", start: "2027-05-01", standardEnd: "2027-08-31", end: "2027-09-15" };
export const isoDay = (day: Date) => format(day, "yyyy-MM-dd");
const validDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));
export const shortPeriod = (from: string, to: string) =>
  validDay(from) && validDay(to) && addDays(parseISO(to), 1) < addMonths(parseISO(from), 3);

const dateSpan = z.object({ from: z.string().max(10), to: z.string().max(10) });
export type DateSpan = z.infer<typeof dateSpan>;
export const maxBlockedPeriods = 12;

export function mergeBlockedPeriods(periods: DateSpan[]): DateSpan[] {
  const ordered = [...periods].sort((left, right) => left.from.localeCompare(right.from));
  const result: DateSpan[] = [];
  for (const period of ordered) {
    const previous = result[result.length - 1];
    if (previous && period.from <= isoDay(addDays(parseISO(previous.to), 1))) {
      if (period.to > previous.to) previous.to = period.to;
    } else result.push({ ...period });
  }
  return result;
}

export const decisionLabels = {
  yes: "Wir sind dabei",
  later: "Wir entscheiden später",
  no: "Wir setzen 2027 aus",
} as const;

export type Decision = keyof typeof decisionLabels;

const replyFields = z.object({
  decision: z.enum(["", "yes", "later", "no"]),
  periodKind: z.enum(["", "standard", "custom", "open"]),
  from: z.string().max(10),
  to: z.string().max(10),
  decisionBy: z.string().max(10),
  blockedPeriods: z.array(dateSpan).max(maxBlockedPeriods).default([]),
  blockers: z.string().trim().max(600),
  final: z.enum(["", "yes", "maybe", "no"]),
  note: z.string().trim().max(1200),
});

export type Reply = z.infer<typeof replyFields>;
export type ReplyErrors = Partial<Record<keyof Reply, string>>;
export type SavedReply = { reply: Reply; savedAt: string };
export type HallAccess = { hall: string; saved: SavedReply | null };

export const blankReply: Reply = {
  decision: "", periodKind: "", from: "", to: "",
  decisionBy: "", blockedPeriods: [], blockers: "", final: "", note: "",
};

export const finalLabels = { yes: "Grundsätzlich interessiert", maybe: "Klären wir intern", no: "Kommt für uns nicht infrage" };

export function validateReply(input: unknown): { reply?: Reply; errors: ReplyErrors } {
  const parsed = replyFields.safeParse(input);
  if (!parsed.success) {
    return { errors: Object.fromEntries(parsed.error.issues.map(issue => [issue.path[0], "Bitte prüft diese Angabe."])) };
  }
  const reply = parsed.data;
  const errors: ReplyErrors = {};
  if (!reply.decision) errors.decision = "Wählt bitte aus, wie eure Halle zur Saison steht.";

  if (reply.decision === "yes") {
    if (reply.blockedPeriods.some(({ from, to }) => !validDay(from) || !validDay(to) || from > to || from < season.start || to > season.end)) {
      errors.blockedPeriods = "Sperrtermine müssen zwischen dem 1. Mai und dem 15. September 2027 liegen.";
    } else reply.blockedPeriods = mergeBlockedPeriods(reply.blockedPeriods);
    if (!reply.blockedPeriods.length) reply.blockers = "";

    if (!reply.periodKind) errors.periodKind = "Wählt ein Zeitfenster oder gebt an, dass es noch offen ist.";
    if (reply.periodKind === "standard") {
      reply.from = season.start;
      reply.to = season.standardEnd;
    } else if (reply.periodKind === "custom") {
      if (!validDay(reply.from) || !validDay(reply.to)) errors.from = "Wählt im Kalender den ersten und den letzten Tag.";
      else if (reply.from >= reply.to || reply.from < season.start || reply.to > season.end) {
        errors.from = "Wählt ein Zeitfenster zwischen dem 1. Mai und dem 15. September 2027.";
      } else if (shortPeriod(reply.from, reply.to) && !reply.blockers && !reply.note) {
        const field = reply.blockedPeriods.length ? "blockers" : "note";
        errors[field] = "Erklärt bitte kurz, weshalb ihr weniger als drei Monate anbieten könnt.";
      }
    } else {
      reply.from = "";
      reply.to = "";
    }
  } else {
    reply.periodKind = "";
    reply.from = "";
    reply.to = "";
    reply.final = "";
    reply.blockedPeriods = [];
    reply.blockers = "";
  }
  if (reply.decision === "later") {
    if (!validDay(reply.decisionBy) || reply.decisionBy < season.repliesOpen || reply.decisionBy >= season.start) {
      errors.decisionBy = "Gebt bitte ein Datum vor Saisonbeginn an.";
    }
  } else reply.decisionBy = "";

  return { reply: Object.keys(errors).length ? undefined : reply, errors };
}
