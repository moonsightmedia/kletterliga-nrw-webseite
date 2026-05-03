import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { listAdminSettings, upsertAdminSettings } from "@/services/appApi";
import { refreshLaunchSettings } from "@/config/launch";
import { Bell, Settings, Trophy } from "lucide-react";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";

const DEFAULT_ACCOUNT_CREATION_OPENS_AT = "2026-04-01T00:00";
const DEFAULT_APP_UNLOCK_AT = "2026-05-01T00:00";

const toDateTimeLocal = (value: string | null | undefined, fallback = "") => {
  const nextValue = value ?? fallback;
  if (!nextValue) return "";

  const parsed = new Date(nextValue);
  if (Number.isNaN(parsed.getTime())) return fallback;

  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const toIsoString = (value: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const LeagueSettings = () => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [classLabels, setClassLabels] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    banner: "",
    finale_enabled: false,
    account_creation_opens_at: DEFAULT_ACCOUNT_CREATION_OPENS_AT,
    app_unlock_at: DEFAULT_APP_UNLOCK_AT,
    force_account_creation_open: false,
    force_participant_unlock: false,
  });

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      const { data } = await listAdminSettings();
      const current = data?.[0];

      if (current) {
        setSettingsId(current.id);
        setClassLabels((current.class_labels as Record<string, string> | null) ?? {});
        setForm({
          banner: (current.class_labels?.banner as string) ?? "",
          finale_enabled: current.finale_enabled ?? false,
          account_creation_opens_at: toDateTimeLocal(
            current.account_creation_opens_at,
            DEFAULT_ACCOUNT_CREATION_OPENS_AT,
          ),
          app_unlock_at: toDateTimeLocal(current.app_unlock_at, DEFAULT_APP_UNLOCK_AT),
          force_account_creation_open: current.force_account_creation_open ?? false,
          force_participant_unlock: current.force_participant_unlock ?? false,
        });
      }

      setLoading(false);
    };

    void loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);

    const payload = {
      id: settingsId ?? undefined,
      class_labels: { ...classLabels, banner: form.banner },
      finale_enabled: form.finale_enabled,
      account_creation_opens_at: toIsoString(form.account_creation_opens_at),
      app_unlock_at: toIsoString(form.app_unlock_at),
      force_account_creation_open: form.force_account_creation_open,
      force_participant_unlock: form.force_participant_unlock,
    };

    const { data, error } = await upsertAdminSettings(payload);
    setSaving(false);

    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }

    if (data?.id) setSettingsId(data.id);
    setClassLabels((data?.class_labels as Record<string, string> | null) ?? classLabels);
    void refreshLaunchSettings();
    toast({ title: "Gespeichert", description: "Einstellungen aktualisiert." });
  };

  return (
    <div className="space-y-6">
      <StitchCard tone="navy" className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />
        <div className="relative p-4 md:p-6 lg:p-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[rgba(242,220,171,0.25)] bg-white/10 md:h-16 md:w-16">
              <Settings className="h-6 w-6 text-[#f2dcab]/85 md:h-8 md:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="stitch-headline text-xl text-[#f2dcab] md:text-2xl lg:text-3xl">Liga-Einstellungen</h1>
                <StitchBadge tone="cream" className="shrink-0">
                  Liga
                </StitchBadge>
              </div>
              <p className="text-sm text-[rgba(242,220,171,0.88)] md:text-base">Allgemeine Einstellungen und Hinweise</p>
            </div>
          </div>
        </div>
      </StitchCard>

      {loading ? (
        <StitchCard tone="muted" className="p-8 text-center">
          <p className="text-[rgba(27,28,26,0.64)]">Lade Einstellungen…</p>
        </StitchCard>
      ) : (
        <div className="space-y-6">
          <StitchCard tone="surface" className="p-4 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#003d55]/10">
                <Bell className="h-5 w-5 text-[#003d55]" />
              </div>
              <div className="min-w-0">
                <h2 className="stitch-headline text-base text-[#002637] md:text-lg">Hinweisbanner</h2>
                <p className="text-xs text-[rgba(27,28,26,0.55)]">Text, der auf der Startseite angezeigt wird</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner">Banner-Text</Label>
              <Input
                id="banner"
                placeholder="z. B. Finale-Anmeldung ab 01.09."
                value={form.banner}
                onChange={(e) => setForm({ ...form, banner: e.target.value })}
              />
              <p className="text-xs text-[rgba(27,28,26,0.55)]">
                Dieser Text wird als Banner auf der Startseite für alle Teilnehmer angezeigt. Leer lassen, um keinen
                Banner anzuzeigen.
              </p>
            </div>
          </StitchCard>

          <StitchCard tone="surface" className="p-4 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#003d55]/10">
                <Settings className="h-5 w-5 text-[#003d55]" />
              </div>
              <div className="min-w-0">
                <h2 className="stitch-headline text-base text-[#002637] md:text-lg">Launch-Freischaltung</h2>
                <p className="text-xs text-[rgba(27,28,26,0.55)]">Registrierung und Teilnehmerbereiche zentral steuern</p>
              </div>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="accountCreationOpensAt">Registrierung öffnet ab</Label>
                <Input
                  id="accountCreationOpensAt"
                  type="datetime-local"
                  value={form.account_creation_opens_at}
                  onChange={(e) => setForm({ ...form, account_creation_opens_at: e.target.value })}
                />
                <p className="text-xs text-[rgba(27,28,26,0.55)]">Ab diesem Zeitpunkt wird `/app/register` öffentlich freigeschaltet.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="appUnlockAt">Teilnehmerbereiche öffnen ab</Label>
                <Input
                  id="appUnlockAt"
                  type="datetime-local"
                  value={form.app_unlock_at}
                  onChange={(e) => setForm({ ...form, app_unlock_at: e.target.value })}
                />
                <p className="text-xs text-[rgba(27,28,26,0.55)]">
                  Steuert Hallen, Code-Einlösung, Ranglisten und weitere gesperrte Teilnehmerrouten.
                </p>
              </div>

              <div className="flex flex-col gap-3 rounded-xl bg-[rgba(0,61,85,0.06)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 space-y-0.5">
                  <Label htmlFor="forceAccountCreationOpen" className="cursor-pointer text-sm md:text-base">
                    Registrierung sofort freischalten
                  </Label>
                  <p className="text-xs text-[rgba(27,28,26,0.55)]">Überschreibt das Registrierungsdatum sofort für alle Nutzer.</p>
                </div>
                <Switch
                  id="forceAccountCreationOpen"
                  checked={form.force_account_creation_open}
                  onCheckedChange={(checked) => setForm({ ...form, force_account_creation_open: checked })}
                  className="touch-manipulation shrink-0"
                />
              </div>

              <div className="flex flex-col gap-3 rounded-xl bg-[rgba(0,61,85,0.06)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 space-y-0.5">
                  <Label htmlFor="forceParticipantUnlock" className="cursor-pointer text-sm md:text-base">
                    Teilnehmerbereiche sofort freischalten
                  </Label>
                  <p className="text-xs text-[rgba(27,28,26,0.55)]">
                    Hebt die Saison-Sperre für Hallen, Codes und Ranglisten sofort auf.
                  </p>
                </div>
                <Switch
                  id="forceParticipantUnlock"
                  checked={form.force_participant_unlock}
                  onCheckedChange={(checked) => setForm({ ...form, force_participant_unlock: checked })}
                  className="touch-manipulation shrink-0"
                />
              </div>
            </div>
          </StitchCard>

          <StitchCard tone="surface" className="p-4 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#003d55]/10">
                <Trophy className="h-5 w-5 text-[#003d55]" />
              </div>
              <div className="min-w-0">
                <h2 className="stitch-headline text-base text-[#002637] md:text-lg">Finale-Funktionalität</h2>
                <p className="text-xs text-[rgba(27,28,26,0.55)]">Finale-Anmeldung und -Verwaltung aktivieren</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-xl bg-[rgba(0,61,85,0.06)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 space-y-0.5">
                <Label htmlFor="finaleEnabled" className="cursor-pointer text-sm md:text-base">
                  Finale freigeschaltet
                </Label>
                <p className="text-xs text-[rgba(27,28,26,0.55)]">
                  Aktiviert die Finale-Funktionalität für Teilnehmer (Anmeldung, Verwaltung, etc.)
                </p>
              </div>
              <Switch
                id="finaleEnabled"
                checked={form.finale_enabled}
                onCheckedChange={(checked) => setForm({ ...form, finale_enabled: checked })}
                className="touch-manipulation shrink-0"
              />
            </div>
          </StitchCard>

          <StitchCard tone="muted" className="p-4 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#002637]">Änderungen speichern</p>
                <p className="mt-1 text-xs text-[rgba(27,28,26,0.55)]">Alle Einstellungen werden sofort nach dem Speichern aktiv</p>
              </div>
              <StitchButton
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="min-w-[140px] w-full touch-manipulation sm:w-auto"
              >
                {saving ? "Speichern…" : "Speichern"}
              </StitchButton>
            </div>
          </StitchCard>
        </div>
      )}
    </div>
  );
};

export default LeagueSettings;
