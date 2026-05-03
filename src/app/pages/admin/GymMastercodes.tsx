import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";
import { useAuth } from "@/app/auth/AuthProvider";
import { CodeQrDisplay } from "@/components/CodeQrDisplay";
import { printCodeSheet } from "@/lib/printableCodeSheet";
import {
  createMasterCodes,
  fetchProfile,
  listGymAdminsByProfile,
  listMasterCodes,
  listProfiles,
} from "@/services/appApi";
import type { MasterCode, Profile } from "@/services/appTypes";
import { Calendar, Download, Filter, Plus, TicketCheck, User } from "lucide-react";

const GymMastercodes = () => {
  const { profile } = useAuth();
  const [codes, setCodes] = useState<MasterCode[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [gymId, setGymId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "available" | "redeemed">("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;

    listGymAdminsByProfile(profile.id).then(({ data }) => {
      const firstGym = data?.[0]?.gym_id ?? null;
      setGymId(firstGym);

      if (!firstGym) return;

      Promise.all([listMasterCodes(firstGym), listProfiles()]).then(
        ([{ data: codesData }, { data: profilesData }]) => {
          setCodes(codesData ?? []);

          const redeemedByIds = new Set(
            (codesData ?? []).filter((code) => code.redeemed_by).map((code) => code.redeemed_by!),
          );

          Promise.all(Array.from(redeemedByIds).map((id) => fetchProfile(id))).then((results) => {
            const profileMap = new Map<string, Profile>();
            results.forEach(({ data }) => {
              if (data) profileMap.set(data.id, data);
            });
            (profilesData ?? []).forEach((item) => profileMap.set(item.id, item));
            setProfiles(profileMap);
          });
        },
      );
    });
  }, [profile?.id]);

  const visibleCodes = useMemo(() => {
    if (filter === "available") return codes.filter((code) => !code.redeemed_by);
    if (filter === "redeemed") return codes.filter((code) => code.redeemed_by);
    return codes;
  }, [codes, filter]);

  const stats = useMemo(() => {
    const total = codes.length;
    const available = codes.filter((code) => !code.redeemed_by).length;
    const redeemed = total - available;
    return { total, available, redeemed };
  }, [codes]);

  const availableCount = visibleCodes.filter((code) => !code.redeemed_by).length;
  const redeemedCount = visibleCodes.filter((code) => code.redeemed_by).length;

  const getRedeemerName = (profileId: string | null) => {
    if (!profileId) return null;
    const item = profiles.get(profileId);
    if (!item) return "Unbekannt";
    const name = `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim();
    return name || item.email || "Unbekannt";
  };

  const generateSegment = (length: number) => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);
    return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
  };

  const generateCode = () => `KL-MASTER-${generateSegment(8)}-${generateSegment(4)}`;

  const formatCompactExportDate = (value: string | null) => {
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parsed);
  };

  const exportToPDF = async () => {
    const availableCodes = codes.filter((code) => !code.redeemed_by);
    if (availableCodes.length === 0) {
      toast({ title: "Keine Codes", description: "Es gibt keine freien Mastercodes zum Exportieren." });
      return;
    }

    toast({
      title: "PDF wird vorbereitet...",
      description: "Die QR-Codes werden auf einen kompakten Druckbogen gesetzt.",
    });

    try {
      await printCodeSheet({
        windowTitle: "Mastercodes - Kletterliga NRW",
        layout: "compact-qr",
        columns: 4,
        pageMarginCm: 0.45,
        gridGapCm: 0.18,
        qrImageSizeCm: 2.55,
        compactCodeFontSizePx: 9,
        compactDetailFontSizePx: 7.5,
        cards: availableCodes.map((code) => ({
          code: code.code,
          qrLabel: code.code,
          detailLines: [
            `Erstellt: ${formatCompactExportDate(code.created_at) ?? "-"}`,
          ],
        })),
      });
    } catch (error) {
      toast({
        title: "PDF-Export fehlgeschlagen",
        description:
          error instanceof Error ? error.message : "Die Druckansicht konnte nicht geöffnet werden.",
        variant: "destructive",
      });
    }
  };

  const handleCreateBatch = async (count: number) => {
    if (!gymId) {
      toast({ title: "Fehler", description: "Keine Halle zugeordnet." });
      return;
    }
    if (count <= 0) {
      toast({ title: "Ungültige Anzahl", description: "Bitte eine Zahl größer 0 wählen." });
      return;
    }

    setCreating(true);
    const payload = Array.from({ length: count }, () => ({
      code: generateCode(),
      gym_id: gymId,
      redeemed_by: null,
      redeemed_at: null,
      expires_at: null,
      status: "available",
    }));
    const { data, error } = await createMasterCodes(payload);
    setCreating(false);

    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }

    if (data) {
      setCodes((prev) => [...data, ...prev]);
      setShowCreateForm(false);
      toast({ title: "Mastercodes erstellt", description: `${data.length} Mastercode(s) wurden angelegt.` });
    }
  };

  if (!gymId) {
    return (
      <div className="space-y-4">
        <AdminPageHeader className="!mb-0" eyebrow="Halle" title="Mastercodes" />
        <StitchCard tone="muted" className="p-6 text-center">
          <p className="text-sm text-[rgba(27,28,26,0.64)]">
            Keine Halle zugeordnet. Nur Hallen-Admins können hier Mastercodes verwalten.
          </p>
        </StitchCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader
          className="!mb-0 min-w-0"
          eyebrow="Teilnahme"
          title="Mastercodes"
          description="Der Mastercode ist ligaweit gültig, schaltet das gesamte Profil frei und wird einmalig für 15 € in einer Halle verkauft."
        />
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <StitchButton type="button" variant="outline" size="sm" onClick={exportToPDF} disabled={stats.available === 0}>
            <Download className="h-4 w-4" />
            PDF Export
          </StitchButton>
          <StitchButton type="button" size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4" />
            Neue Mastercodes
          </StitchButton>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:hidden">
        <StitchButton
          type="button"
          variant="outline"
          className="min-h-[44px] w-full"
          onClick={exportToPDF}
          disabled={stats.available === 0}
        >
          <Download className="h-4 w-4" />
          PDF Export
        </StitchButton>
        <StitchButton type="button" className="min-h-[44px] w-full" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4" />
          Neue Mastercodes
        </StitchButton>
      </div>

      <StitchCard tone="muted" className="p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="stitch-kicker text-[#a15523]">Mastercode</div>
            <p className="text-sm leading-6 text-[#002637]">
              Gilt für die ganze Liga, schaltet das komplette Profil frei und deckt die Teilnahmegebühr von 15 € ab.
            </p>
          </div>
          <div className="space-y-2">
            <div className="stitch-kicker text-[#a15523]">Hallencode</div>
            <p className="text-sm leading-6 text-[#002637]">
              Wird zusätzlich eingelöst und schaltet nur die jeweilige Halle frei, in der geklettert wird.
            </p>
          </div>
        </div>
      </StitchCard>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        <StitchCard tone="surface" className="p-3 sm:p-4">
          <div className="stitch-kicker text-[0.58rem] text-[#a15523] sm:text-xs">Gesamt</div>
          <div className="stitch-metric mt-1 text-xl text-[#002637] sm:mt-2 sm:text-2xl">{stats.total}</div>
        </StitchCard>
        <StitchCard tone="surface" className="p-3 sm:p-4">
          <div className="stitch-kicker text-[0.58rem] text-[#a15523] sm:text-xs">Verfügbar</div>
          <div className="stitch-metric mt-1 text-xl text-[#002637] sm:mt-2 sm:text-2xl">{stats.available}</div>
        </StitchCard>
        <StitchCard tone="surface" className="p-3 sm:p-4">
          <div className="stitch-kicker text-[0.58rem] text-[#a15523] sm:text-xs">Eingelöst</div>
          <div className="stitch-metric mt-1 text-xl text-[#a15523] sm:mt-2 sm:text-2xl">{stats.redeemed}</div>
        </StitchCard>
      </div>

      {showCreateForm ? (
        <StitchCard tone="surface" className="space-y-4 p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <TicketCheck className="h-4 w-4 shrink-0 text-[#003d55]" />
            <span className="stitch-kicker text-[#a15523]">Mastercodes für diese Halle erzeugen</span>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full flex-1 space-y-2">
              <Label htmlFor="batchSize">Anzahl</Label>
              <Input
                id="batchSize"
                type="number"
                min={1}
                max={200}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="min-h-[44px] touch-manipulation"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
              <StitchButton
                type="button"
                onClick={() => handleCreateBatch(batchSize)}
                disabled={creating}
                className="min-h-[44px] w-full sm:w-auto"
              >
                {creating ? "Erstelle…" : `Batch (${batchSize})`}
              </StitchButton>
              <StitchButton type="button" variant="outline" onClick={() => handleCreateBatch(1)} disabled={creating} className="min-h-[44px] w-full sm:w-auto">
                Einzelcode
              </StitchButton>
              <StitchButton type="button" variant="outline" onClick={() => setShowCreateForm(false)} className="min-h-[44px] w-full sm:w-auto">
                Abbrechen
              </StitchButton>
            </div>
          </div>
        </StitchCard>
      ) : null}

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Filter className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <select
          className="h-10 min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm touch-manipulation sm:h-9 sm:min-h-0 sm:w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | "available" | "redeemed")}
        >
          <option value="all">Alle</option>
          <option value="available">Nur verfügbar ({availableCount})</option>
          <option value="redeemed">Nur eingelöst ({redeemedCount})</option>
        </select>
      </div>

      {visibleCodes.length === 0 ? (
        <StitchCard tone="muted" className="p-6 text-center md:p-8">
          <p className="text-sm text-[rgba(27,28,26,0.64)]">
            {filter === "available"
              ? "Keine verfügbaren Mastercodes. Erstelle neue oben."
              : filter === "redeemed"
                ? "Keine eingelösten Mastercodes."
                : "Keine Mastercodes vorhanden. Erstelle neue oben."}
          </p>
        </StitchCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCodes.map((code) => {
            const isRedeemed = Boolean(code.redeemed_by);
            const redeemer = isRedeemed ? getRedeemerName(code.redeemed_by) : null;

            return (
              <StitchCard key={code.id} tone="surface" className={`min-w-0 p-4 transition-shadow hover:shadow-[0_16px_36px_rgba(0,38,55,0.1)] md:p-5 ${isRedeemed ? "opacity-80" : ""}`}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-xs text-muted-foreground">
                        Ligaweit gültig · 15 € Teilnahmegebühr
                      </div>
                      <div className="font-mono text-sm font-semibold text-primary break-all md:text-base">
                        {code.code}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Erstellt:{" "}
                        {code.created_at ? new Date(code.created_at).toLocaleDateString("de-DE") : "-"}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <StitchBadge tone={isRedeemed ? "terracotta" : "navy"}>{isRedeemed ? "Eingelöst" : "Frei"}</StitchBadge>
                      <CodeQrDisplay value={code.code} size={64} />
                    </div>
                  </div>

                  {isRedeemed && redeemer ? (
                    <div className="space-y-2 border-t border-border/50 pt-2">
                      <div className="flex items-start gap-2 text-sm">
                        <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <span className="text-muted-foreground">Eingelöst von: </span>
                          <span className="font-medium text-primary break-words">{redeemer}</span>
                        </div>
                      </div>
                      {code.redeemed_at && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>
                            {new Date(code.redeemed_at).toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </StitchCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GymMastercodes;
