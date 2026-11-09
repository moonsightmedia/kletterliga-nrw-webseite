import { useEffect, useRef, useState } from "react";
import { DayPicker, type DayContentProps } from "react-day-picker";
import { addDays, addMonths, differenceInCalendarDays, format, parseISO, startOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import {
  isoDay, maxBlockedPeriods, mergeBlockedPeriods, season, shortPeriod, type DateSpan, type Reply, type ReplyErrors,
} from "./reply";

const firstDay = parseISO(season.start);
const lastDay = parseISO(season.end);
const lastMonth = startOfMonth(lastDay);
const dateLabel = (value: string) => format(parseISO(value), "d. MMM yyyy", { locale: de });
const spanLabel = ({ from, to }: DateSpan) => from === to ? dateLabel(from) : dateLabel(from) + " – " + dateLabel(to);
const asMatcher = ({ from, to }: DateSpan) => ({ from: parseISO(from), to: parseISO(to) });
type Props = { reply: Reply; change: (patch: Partial<Reply>) => void; errors: ReplyErrors };

export function CalendarDay({ date, activeModifiers }: DayContentProps) {
  return <>
    <span aria-hidden="true">{date.getDate()}</span>
    <span className="hr-sr-only">
      {format(date, "EEEE, d. MMMM yyyy", { locale: de })}{activeModifiers.blocked ? ", Sperrtermin" : ""}
    </span>
  </>;
}

function useCalendarMonths() {
  const region = useRef<HTMLDivElement>(null);
  const [months, setMonths] = useState(1);
  useEffect(() => {
    const target = region.current;
    if (!target) return;
    const update = (width: number) => setMonths(width >= 600 ? 2 : 1);
    update(target.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return { region, months };
}

export default function PeriodPicker({ reply, change, errors }: Props) {
  const [month, setMonth] = useState(firstDay);
  const [markingBlock, setMarkingBlock] = useState(false);
  const [blockDraft, setBlockDraft] = useState<DateSpan | null>(null);
  const { region, months } = useCalendarMonths();
  const lastAnchor = addMonths(lastMonth, 1 - months);
  const visibleMonth = month > lastAnchor ? lastAnchor : month;
  const standard = reply.periodKind === "standard";
  const from = standard ? season.start : reply.from;
  const to = standard ? season.standardEnd : reply.to;
  const periods = reply.blockedPeriods ?? [];
  const error = errors.periodKind || errors.from;
  const days = from && to ? differenceInCalendarDays(parseISO(to), parseISO(from)) + 1 : 0;

  function finishMarking() {
    setMarkingBlock(false);
    setBlockDraft(null);
  }

  function chooseMode(kind: Reply["periodKind"]) {
    finishMarking();
    if (kind === "standard") {
      change({ periodKind: kind, from: season.start, to: season.standardEnd });
      setMonth(firstDay);
    } else if (kind !== reply.periodKind) {
      change({ periodKind: kind, from: "", to: "" });
    }
  }

  function chooseDay(day: Date) {
    const value = isoDay(day);
    if (markingBlock) {
      if (!blockDraft || blockDraft.from !== blockDraft.to) setBlockDraft({ from: value, to: value });
      else if (value < blockDraft.from) setBlockDraft({ from: value, to: blockDraft.from });
      else setBlockDraft({ ...blockDraft, to: value });
      return;
    }
    if (standard || !from || to || value <= from) {
      change({ periodKind: "custom", from: value, to: "" });
    } else {
      change({ periodKind: "custom", from, to: value });
    }
  }

  function addBlock() {
    if (!blockDraft) return;
    change({ blockedPeriods: mergeBlockedPeriods([...periods, blockDraft]) });
    finishMarking();
  }

  function removeBlock(index: number) {
    const remaining = periods.filter((_, i) => i !== index);
    change(remaining.length ? { blockedPeriods: remaining } : { blockedPeriods: remaining, blockers: "" });
  }

  let instruction = "Wählt den ersten Tag im Kalender.";
  if (markingBlock) {
    if (!blockDraft) instruction = "Wählt einen Tag. Für ein Wochenende wählt danach den letzten Tag.";
    else if (blockDraft.from === blockDraft.to) instruction = "Ein Tag ist markiert. Für mehrere Tage wählt noch den letzten Tag.";
    else instruction = "Fügt die markierten Tage als Sperrtermin hinzu.";
  } else if (from && !to) {
    instruction = "Wählt jetzt den letzten Tag.";
  } else if (days) {
    instruction = standard ? "Der Wunschzeitraum ist übernommen." : "Der Individualzeitraum ist ausgewählt.";
  }

  return <section className="hr-section" aria-labelledby="period-heading">
    <div className="hr-section-head">
      <h3 id="period-heading">Qualifikationszeitraum</h3>
      <p className="hr-muted">Unser Wunschzeitraum ist der <strong>1. Mai bis 31. August 2027</strong>. So können möglichst viele Hallen gleichzeitig starten.</p>
    </div>
    <div className="hr-period-modes" role="group" aria-label="Qualifikationszeitraum auswählen">
      <button id="periodKind" type="button" aria-pressed={standard} onClick={() => chooseMode("standard")}>
        <strong>Normal</strong><span>1. Mai – 31. August</span>
      </button>
      <button id="from" type="button" aria-pressed={reply.periodKind === "custom"} onClick={() => chooseMode("custom")}>
        <strong>Individualzeitraum</strong><span>Start und Ende frei wählen</span>
      </button>
    </div>
    {error && <p className="hr-error" role="alert">{error}</p>}
    <div className="hr-inline-calendar" ref={region}>
      <div className="hr-range" aria-label="Gewählter Zeitraum" role="group">
        <div><span>Von</span><strong>{from ? dateLabel(from) : "–"}</strong></div>
        <div><span>Bis</span><strong>{to ? dateLabel(to) : "–"}</strong></div>
        <p className="hr-day-count" aria-live="polite">{days > 0 && days + " Tage"}</p>
      </div>
      <div className="hr-calendar-tools">
        <p className="hr-calendar-status" aria-live="polite">{instruction}</p>
        <button id="blockedPeriods" type="button" className="hr-text-action" aria-pressed={markingBlock}
          onClick={() => markingBlock ? finishMarking() : setMarkingBlock(true)}
          disabled={!markingBlock && periods.length >= maxBlockedPeriods}>
          {markingBlock ? "Abbrechen" : "Sperrtermin markieren"}
        </button>
      </div>
      <div className="hr-month-nav">
        <button type="button" className="hr-month-button" aria-label="Vorheriger Monat" disabled={visibleMonth <= firstDay}
          onClick={() => setMonth(addMonths(visibleMonth, -1))}><span className="hr-chevron previous" aria-hidden="true" /></button>
        <span className="hr-sr-only" aria-live="polite">{format(visibleMonth, "MMMM yyyy", { locale: de })}</span>
        <button type="button" className="hr-month-button" aria-label="Nächster Monat" disabled={visibleMonth >= lastAnchor}
          onClick={() => setMonth(addMonths(visibleMonth, 1))}><span className="hr-chevron next" aria-hidden="true" /></button>
      </div>
      <DayPicker mode="range" locale={de} showOutsideDays={false} disableNavigation
        month={visibleMonth} onMonthChange={setMonth} fromMonth={firstDay} toMonth={lastMonth} numberOfMonths={months}
        selected={from ? { from: parseISO(from), to: to ? parseISO(to) : undefined } : undefined}
        disabled={[{ before: firstDay }, { after: !markingBlock && (!from || to) ? addDays(lastDay, -1) : lastDay }]}
        modifiers={{ blocked: periods.map(asMatcher), pendingBlock: blockDraft ? [asMatcher(blockDraft)] : [] }}
        modifiersClassNames={{ blocked: "hr-day-blocked", pendingBlock: "hr-day-pending" }}
        onDayClick={chooseDay} components={{ DayContent: CalendarDay }} />
      {markingBlock && <div className="hr-block-draft">
        <span aria-live="polite">{blockDraft ? spanLabel(blockDraft) : "Noch kein Tag gewählt"}</span>
        <button type="button" className="hr-apply" disabled={!blockDraft} onClick={addBlock}>Sperrtermin hinzufügen</button>
      </div>}
    </div>
    <div className="hr-range-options">
      <button className="hr-text-action" type="button" aria-pressed={reply.periodKind === "open"}
        onClick={() => chooseMode("open")}>Zeitraum noch offen lassen</button>
    </div>
    {reply.periodKind === "open" && <p className="hr-muted" role="status">Ihr habt den Qualifikationszeitraum offen gelassen.</p>}
    {reply.periodKind === "custom" && shortPeriod(from, to) && <p className="hr-notice">
      Für weniger als drei Monate brauchen wir eine kurze Begründung {periods.length ? "bei den Sperrterminen oder unter Anmerkungen." : "unter Anmerkungen."}
    </p>}
    {errors.blockedPeriods && <p className="hr-error" role="alert">{errors.blockedPeriods}</p>}
    {!!periods.length && <div className="hr-block-list">
      <p className="hr-block-list-title">Gemeldete Sperrtermine</p>
      <ul>{periods.map((period, index) => <li key={period.from}>
        <span>{spanLabel(period)}</span>
        <button type="button" className="hr-text-action" aria-label={"Sperrtermin " + spanLabel(period) + " entfernen"} onClick={() => removeBlock(index)}>Entfernen</button>
      </li>)}</ul>
    </div>}
  </section>;
}
