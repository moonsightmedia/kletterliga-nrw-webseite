import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PenLine } from "lucide-react";
import { MaterialIcon } from "@/app/components/MaterialIcon";
import { ParticipantProfileChangeRequestDialog } from "./ParticipantProfileChangeRequestDialog";
import { useParticipantProfileEditor } from "./useParticipantProfileEditor";
import { cn } from "@/lib/utils";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const SegmentedOption = ({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) => (
  <div
    className={cn(
      "flex-1 rounded-xl px-4 py-3 text-center text-sm font-bold transition-all",
      active ? "bg-[#A15523] text-white shadow-md" : "text-[#003D55]/58",
    )}
  >
    {label}
  </div>
);

const ChipOption = ({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) => (
  <div
    className={cn(
      "rounded-full px-4 py-2 text-xs font-bold transition-all",
      active ? "bg-[#003D55] text-[#F2DCAB]" : "bg-[#003D55]/10 text-[#003D55]",
    )}
  >
    {label}
  </div>
);

const ProfileEditScreen = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    gyms,
    displayName,
    avatarPreview,
    form,
    setForm,
    leagueLabel,
    genderLabel,
    saving,
    uploading,
    savingAvatar,
    handleSave,
    handleAvatarUpload,
    changeRequestOpen,
    setChangeRequestOpen,
    changeRequestForm,
    setChangeRequestForm,
    changeRequestDisabled,
    changeState,
    requestingChange,
    handleChangeRequestSubmit,
  } = useParticipantProfileEditor();

  const handleSaveAndReturn = async () => {
    const didSave = await handleSave();
    if (didSave) {
      navigate("/app/profile");
    }
  };

  return (
    <>
      <div className="mx-auto max-w-md px-1 pb-6">
        <section className="mb-8 flex flex-col items-center pt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || savingAvatar}
            className={cn(
              "group relative transition-transform",
              (uploading || savingAvatar) && "cursor-wait opacity-70",
            )}
          >
            <div className="h-36 w-36 rounded-xl bg-[#A15523] p-1 shadow-[0_20px_42px_rgba(0,0,0,0.22)]">
              <div className="h-full w-full overflow-hidden rounded-[calc(0.75rem-0.25rem)] bg-[#0f2d3c]">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-['Space_Grotesk'] text-4xl font-bold uppercase text-[#F2DCAB]">
                    {getInitials(displayName)}
                  </div>
                )}
              </div>
            </div>

            <span className="absolute -bottom-1 -right-1 flex h-14 w-14 items-center justify-center rounded-xl border-2 border-[#003D55] bg-[#A15523] text-white shadow-lg transition-transform group-hover:scale-[1.02]">
              <MaterialIcon name="edit" className="text-lg" />
            </span>
          </button>

          <p className="mt-5 font-['Space_Grotesk'] text-[2rem] font-bold tracking-tight text-[#F2DCAB]">
            {displayName}
          </p>
        </section>

        <section className="relative overflow-hidden rounded-xl bg-[#F2DCAB] p-8 shadow-[0_24px_54px_rgba(0,0,0,0.16)]">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#A15523]/6 blur-3xl" />

          <div className="relative z-10 space-y-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-[#003D55]">Vorname</span>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                  className="border-0 border-b-2 border-[#003D55]/20 bg-transparent px-2 py-2 text-2xl font-semibold text-[#003D55] outline-none transition-all focus:border-[#003D55]"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-[#003D55]">Nachname</span>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                  className="border-0 border-b-2 border-[#003D55]/20 bg-transparent px-2 py-2 text-2xl font-semibold text-[#003D55] outline-none transition-all focus:border-[#003D55]"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-[#003D55]">Geburtsdatum</span>
              <input
                type="date"
                value={form.birthDate}
                onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
                className="w-full border-0 border-b-2 border-[#003D55]/20 bg-transparent px-2 py-2 text-2xl font-semibold text-[#003D55] outline-none transition-all focus:border-[#003D55]"
              />
            </label>

            <div className="space-y-3">
              <div className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-[#003D55]">Heimat-Halle</div>
              <div className="relative">
                <select
                  value={form.homeGymId}
                  onChange={(event) => setForm((current) => ({ ...current, homeGymId: event.target.value }))}
                  className="w-full appearance-none border-0 border-b-2 border-[#003D55]/20 bg-transparent px-2 py-2 pr-10 text-lg font-semibold text-[#003D55] outline-none transition-all focus:border-[#003D55]"
                >
                  <option value="">Keine Auswahl</option>
                  {gyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.name}
                      {gym.city ? ` (${gym.city})` : ""}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-2 text-[#003D55]/42">
                  <MaterialIcon name="expand_more" className="text-2xl" />
                </span>
              </div>
            </div>

            <div className="space-y-6 pt-2">
              <div className="space-y-3">
                <div className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-[#003D55]">Geschlecht</div>
                <div className="flex rounded-xl bg-[#003D55]/5 p-1.5" aria-disabled="true">
                  <SegmentedOption active={genderLabel === "Männlich"} label="Männlich" />
                  <SegmentedOption active={genderLabel === "Weiblich"} label="Weiblich" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-[#003D55]">Liga</div>
                <div className="flex flex-wrap gap-2">
                  <ChipOption active={leagueLabel === "Toprope"} label="Toprope" />
                  <ChipOption active={leagueLabel === "Vorstieg"} label="Vorstieg" />
                </div>
              </div>

              <div className="rounded-xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.48)_0%,rgba(255,255,255,0.28)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_26px_rgba(0,38,55,0.06)]">
                <div className="inline-flex items-center rounded-full bg-white/65 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#A15523]">
                  Wettkampfbereich
                </div>
                <p className="mt-4 max-w-[18rem] text-[0.98rem] leading-8 text-[#003D55]/82">
                  Geschlecht und Liga werden für die Wertung verwendet und können nicht direkt editiert werden.
                </p>
                <button
                  type="button"
                  onClick={() => setChangeRequestOpen(true)}
                  className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#003D55]/12 bg-white px-5 py-3.5 text-sm font-bold text-[#003D55] shadow-[0_10px_22px_rgba(0,38,55,0.08)] transition-all hover:-translate-y-[1px] hover:bg-white/95"
                >
                  <PenLine className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                  <span>Änderung anfragen</span>
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                disabled={saving || uploading || savingAvatar}
                onClick={() => {
                  void handleSaveAndReturn();
                }}
                className={cn(
                  "w-full rounded-xl bg-[#A15523] px-6 py-5 font-['Space_Grotesk'] text-sm font-black uppercase tracking-[0.24em] text-white shadow-[0_16px_32px_rgba(161,85,35,0.28)] transition-all hover:shadow-[0_20px_36px_rgba(161,85,35,0.34)] active:translate-y-0.5",
                  (saving || uploading || savingAvatar) && "cursor-wait opacity-70",
                )}
              >
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </div>
        </section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";
          if (file) {
            void handleAvatarUpload(file);
          }
        }}
      />

      <ParticipantProfileChangeRequestDialog
        open={changeRequestOpen}
        onOpenChange={setChangeRequestOpen}
        currentLeagueLabel={leagueLabel}
        currentGenderLabel={genderLabel}
        form={changeRequestForm}
        onFormChange={setChangeRequestForm}
        requesting={requestingChange}
        disabled={changeRequestDisabled}
        showNoChangeHint={changeState.hasNoChange}
        showSameValuesHint={changeState.hasSameValues && !changeState.hasLeagueChange && !changeState.hasGenderChange}
        onSubmit={handleChangeRequestSubmit}
      />
    </>
  );
};

export default ProfileEditScreen;
