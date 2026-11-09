import { format, isValid, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { decisionLabels, finalLabels, type Decision, type Reply } from "./reply";

export function showDay(value: string) {
  const day = parseISO(value);
  return isValid(day) ? format(day, "d. MMMM yyyy", { locale: de }) : value;
}

export function replyDetails(reply: Reply) {
  return [
    ["Teilnahme", decisionLabels[reply.decision as Decision]],
    ["Qualifikationsfenster", reply.decision === "yes" ? (reply.from && reply.to ? `${reply.periodKind === "standard" ? "Normal" : "Individualzeitraum"} · ${showDay(reply.from)} bis ${showDay(reply.to)}` : "Noch abzustimmen") : ""],
    ["Entscheidung möglich ab", reply.decisionBy ? showDay(reply.decisionBy) : ""],
    ["Sperrtermine", reply.blockedPeriods.map(({ from, to }) => from === to ? showDay(from) : `${showDay(from)} bis ${showDay(to)}`).join("\n")],
    ["Bedingungen oder Begründung", reply.blockers],
    ["Finalausrichtung", reply.final ? finalLabels[reply.final] : ""],
    ["Anmerkungen", reply.note],
  ].filter(([, value]) => value);
}
