import { format, isValid, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { decisionLabels, finalLabels, type Decision, type Reply } from "./reply";

export function showDay(value: string) {
  const day = parseISO(value);
  return isValid(day) ? format(day, "d. MMMM yyyy", { locale: de }) : value;
}

export function replyDetails(reply: Reply) {
  return [
    ["Teilnahme", reply.decision === "yes" && reply.conditions ? "Zusage unter Bedingungen" : decisionLabels[reply.decision as Decision]],
    ["Bedingungen für die Teilnahme", reply.decision === "yes" ? reply.conditions : undefined],
    ["Qualifikationsfenster", reply.decision === "yes" ? (reply.from && reply.to ? `${reply.periodKind === "standard" ? "Normal" : "Individualzeitraum"} · ${showDay(reply.from)} bis ${showDay(reply.to)}` : "Noch abzustimmen") : ""],
    ["Entscheidung möglich ab", reply.decisionBy ? showDay(reply.decisionBy) : ""],
    ["Sperrtermine", reply.blockedPeriods.map(({ from, to }) => from === to ? showDay(from) : `${showDay(from)} bis ${showDay(to)}`).join("\n")],
    ["Hinweis zu den Sperrterminen", reply.blockers],
    ["Finalausrichtung", reply.final ? finalLabels[reply.final] : ""],
    ["Anmerkungen", reply.note],
  ].filter(([, value]) => value);
}
