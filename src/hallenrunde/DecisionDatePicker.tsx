import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { addDays, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarDay } from "./PeriodPicker";
import { isoDay, season } from "./reply";

const firstDay = parseISO(season.repliesOpen);
const lastDay = addDays(parseISO(season.start), -1);

export default function DecisionDatePicker({ value, onChange, invalid }: {
  value: string; onChange: (value: string) => void; invalid: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;

  return <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
    <Popover.Trigger id="decisionBy" className="hr-select-trigger" aria-invalid={invalid}
      aria-labelledby="decisionBy-label decisionBy-value" aria-describedby={`decisionBy-hint${invalid ? " decisionBy-error" : ""}`}>
      <span id="decisionBy-value" className={selected ? undefined : "hr-date-placeholder"}>
        {selected ? format(selected, "d. MMMM yyyy", { locale: de }) : "Datum auswählen"}
      </span>
      <span className="hr-chevron down" aria-hidden="true" />
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content className="hr-date-popover" aria-label="Entscheidungsdatum wählen"
        align="start" sideOffset={4} collisionPadding={12} onOpenAutoFocus={event => event.preventDefault()}>
        <DayPicker mode="single" locale={de} showOutsideDays={false} initialFocus
          selected={selected} defaultMonth={selected ?? firstDay} fromDate={firstDay} toDate={lastDay}
          disabled={[{ before: firstDay }, { after: lastDay }]}
          labels={{ labelPrevious: () => "Vorheriger Monat", labelNext: () => "Nächster Monat" }}
          components={{ DayContent: CalendarDay }}
          onDayClick={day => { onChange(isoDay(day)); setOpen(false); }} />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
