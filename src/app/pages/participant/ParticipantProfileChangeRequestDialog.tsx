import { ChevronDown, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StitchButton } from "@/app/components/StitchPrimitives";
import { cn } from "@/lib/utils";

export type ParticipantChangeRequestForm = {
  requested_league: string;
  requested_gender: string;
  message: string;
};

const ChangeRequestFieldLabel = ({ children }: { children: string }) => (
  <div className="ml-1 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#003D55]/58">{children}</div>
);

const ChangeRequestFieldShell = ({
  children,
  textarea = false,
}: {
  children: React.ReactNode;
  textarea?: boolean;
}) => (
  <div
    className={cn(
      "relative rounded-xl border border-white/80 bg-white/78 px-4 shadow-[0_10px_22px_rgba(0,38,55,0.08)] backdrop-blur-sm transition-all focus-within:border-[#003D55]/22 focus-within:shadow-[0_12px_26px_rgba(0,38,55,0.12)]",
      textarea ? "py-3" : "py-3.5",
    )}
  >
    {children}
  </div>
);

const ChangeRequestSelectField = ({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) => (
  <label className="block space-y-3">
    <ChangeRequestFieldLabel>{label}</ChangeRequestFieldLabel>
    <ChangeRequestFieldShell>
      <select
        value={value}
        onChange={onChange}
        className="h-10 w-full appearance-none bg-transparent pr-8 text-[1.08rem] font-medium text-[#003D55] outline-none"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#003D55]/42" />
    </ChangeRequestFieldShell>
  </label>
);

const ChangeRequestTextareaField = ({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  hint: string;
}) => (
  <label className="block space-y-3">
    <ChangeRequestFieldLabel>{label}</ChangeRequestFieldLabel>
    <ChangeRequestFieldShell textarea>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="min-h-24 w-full resize-none bg-transparent text-base leading-7 text-[#003D55] outline-none placeholder:text-[#003D55]/32"
      />
    </ChangeRequestFieldShell>
    <p className="px-1 text-sm leading-6 text-[#003D55]/48">{hint}</p>
  </label>
);

const ChangeRequestHint = ({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) => (
  <div
    className={cn(
      "rounded-xl border px-4 py-3 text-sm leading-6 shadow-[0_8px_18px_rgba(0,38,55,0.04)]",
      muted
        ? "border-[rgba(0,38,55,0.08)] bg-white/52 text-[#003D55]/58"
        : "border-[rgba(161,85,35,0.16)] bg-[rgba(255,255,255,0.76)] text-[#003D55]/78",
    )}
  >
    {children}
  </div>
);

export const ParticipantProfileChangeRequestDialog = ({
  open,
  onOpenChange,
  currentLeagueLabel,
  currentGenderLabel,
  form,
  onFormChange,
  requesting,
  disabled,
  showNoChangeHint,
  showSameValuesHint,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLeagueLabel: string;
  currentGenderLabel: string;
  form: ParticipantChangeRequestForm;
  onFormChange: (next: ParticipantChangeRequestForm) => void;
  requesting: boolean;
  disabled: boolean;
  showNoChangeHint: boolean;
  showSameValuesHint: boolean;
  onSubmit: () => void | Promise<void>;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      hideCloseButton
      className="stitch-app overflow-x-hidden border-0 bg-[linear-gradient(180deg,#fbf9f6_0%,#f5f0e7_100%)] p-0 text-[#1b1c1a] sm:max-w-[34rem] sm:rounded-xl sm:p-0"
    >
      <div className="relative overflow-hidden bg-[#003D55] px-6 pb-7 pt-6 text-[#F2DCAB] sm:px-7 sm:pb-8 sm:pt-7">
        <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/6 blur-2xl" />

        <DialogClose asChild>
          <button
            type="button"
            className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#003D55]/10 bg-white text-[#003D55] shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition-all hover:brightness-[1.02] focus:outline-none focus:ring-2 focus:ring-[#F2DCAB]/50 focus:ring-offset-2 focus:ring-offset-[#003D55] sm:right-6 sm:top-6"
            aria-label="Dialog schließen"
          >
            <X className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </DialogClose>

        <DialogHeader className="relative max-w-[17rem] space-y-3 px-0 pt-0 text-left">
          <DialogTitle className="font-['Space_Grotesk'] pr-14 text-[2rem] font-black uppercase leading-[0.9] tracking-tight text-[#F2DCAB]">
            Änderung anfragen
          </DialogTitle>
          <DialogDescription className="max-w-sm text-base leading-7 text-[rgba(242,220,171,0.78)]">
            Wähle die Werte, die du ändern möchtest. Wir prüfen die Anfrage anschließend manuell.
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="space-y-5 bg-[linear-gradient(180deg,#f7f2e8_0%,#f3ece1_100%)] px-6 pb-6 pt-6 sm:px-7 sm:pb-7">
        <div className="rounded-xl border border-[rgba(0,38,55,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.6)_100%)] p-5 shadow-[0_14px_28px_rgba(0,38,55,0.06)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <ChangeRequestFieldLabel>Aktuelle Liga</ChangeRequestFieldLabel>
              <div className="mt-2 text-[1.05rem] font-semibold text-[#003D55]">{currentLeagueLabel}</div>
            </div>
            <div>
              <ChangeRequestFieldLabel>Aktuelles Geschlecht</ChangeRequestFieldLabel>
              <div className="mt-2 text-[1.05rem] font-semibold text-[#003D55]">{currentGenderLabel}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <ChangeRequestSelectField
            label="Gewünschte Liga"
            value={form.requested_league}
            onChange={(event) =>
              onFormChange({
                ...form,
                requested_league: event.target.value,
              })
            }
          >
            <option value="">Keine Änderung</option>
            <option value="toprope">Toprope</option>
            <option value="lead">Vorstieg</option>
          </ChangeRequestSelectField>

          <ChangeRequestSelectField
            label="Gewünschtes Geschlecht"
            value={form.requested_gender}
            onChange={(event) =>
              onFormChange({
                ...form,
                requested_gender: event.target.value,
              })
            }
          >
            <option value="">Keine Änderung</option>
            <option value="m">Männlich</option>
            <option value="w">Weiblich</option>
          </ChangeRequestSelectField>
        </div>

        <ChangeRequestTextareaField
          label="Nachricht"
          value={form.message}
          onChange={(event) =>
            onFormChange({
              ...form,
              message: event.target.value,
            })
          }
          placeholder="Zusätzliche Informationen zu deiner Anfrage..."
          hint="Optional, aber hilfreich für die Prüfung."
        />

        {showNoChangeHint ? (
          <ChangeRequestHint muted>Bitte wähle mindestens eine Änderung aus.</ChangeRequestHint>
        ) : null}

        {showSameValuesHint ? (
          <ChangeRequestHint>
            Die gewünschten Werte müssen sich von den aktuellen Werten unterscheiden.
          </ChangeRequestHint>
        ) : null}

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">
          <StitchButton
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-[3.15rem] rounded-xl border-[rgba(0,38,55,0.14)] bg-white/75 px-5 text-[#003D55] shadow-[0_10px_18px_rgba(0,38,55,0.06)]"
          >
            Abbrechen
          </StitchButton>
          <StitchButton
            type="button"
            disabled={disabled}
            onClick={() => {
              void onSubmit();
            }}
            className="min-h-[3.15rem] rounded-xl px-6"
          >
            {requesting ? "Sende..." : "Anfrage senden"}
          </StitchButton>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
