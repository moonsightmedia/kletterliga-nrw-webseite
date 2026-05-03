import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";
import { useAuth } from "@/app/auth/AuthProvider";
import { createGymCodes, listGymAdminsByProfile, listGymCodesByGym, updateGymCode, deleteGymCode, fetchProfile, listProfiles } from "@/services/appApi";
import type { GymCode, Profile } from "@/services/appTypes";
import { CodeQrDisplay } from "@/components/CodeQrDisplay";
import QRCode from "qrcode";
import { Download, User, Calendar, RotateCcw, Plus, Filter, Trash2 } from "lucide-react";

const GymCodes = () => {
  const { profile } = useAuth();
  const [codes, setCodes] = useState<GymCode[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [gymId, setGymId] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(50);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "available" | "redeemed">("all");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    listGymAdminsByProfile(profile.id).then(({ data }) => {
      const firstGym = data?.[0]?.gym_id ?? null;
      setGymId(firstGym);
      if (firstGym) {
        listGymCodesByGym(firstGym).then(({ data: codesData }) => {
          setCodes(codesData ?? []);
          // Lade Profile für eingelöste Codes
          const redeemedByIds = new Set((codesData ?? []).filter((c) => c.redeemed_by).map((c) => c.redeemed_by!));
          Promise.all(Array.from(redeemedByIds).map((id) => fetchProfile(id))).then((results) => {
            const profileMap = new Map<string, Profile>();
            results.forEach(({ data }) => {
              if (data) profileMap.set(data.id, data);
            });
            setProfiles(profileMap);
          });
        });
      }
    });
    // Lade alle Profile für schnelleren Zugriff
    listProfiles().then(({ data }) => {
      const profileMap = new Map<string, Profile>();
      (data ?? []).forEach((p) => profileMap.set(p.id, p));
      setProfiles(profileMap);
    });
  }, [profile?.id]);

  const visibleCodes = useMemo(() => {
    if (filter === "all") return codes;
    if (filter === "available") return codes.filter((code) => !code.redeemed_by);
    return codes.filter((code) => code.redeemed_by);
  }, [codes, filter]);

  const generateCode = () =>
    `KL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const handleCreateBatch = async (count: number) => {
    if (!gymId) return;
    if (count <= 0) {
      toast({ title: "Ungültige Anzahl", description: "Bitte eine Zahl größer 0 wählen." });
      return;
    }
    setCreating(true);
    const payload = Array.from({ length: count }, () => ({
      gym_id: gymId,
      code: generateCode(),
      status: "available",
      redeemed_by: null,
      redeemed_at: null,
      expires_at: null,
    }));
    const { data, error } = await createGymCodes(payload);
    setCreating(false);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (data) {
      setCodes((prev) => [...data, ...prev]);
      setShowCreateForm(false);
      toast({ title: "Codes erstellt", description: `${data.length} Codes wurden angelegt.` });
    }
  };

  const handleReleaseCode = async (codeId: string) => {
    if (!confirm("Möchtest du diesen Code wirklich freigeben? Er kann dann erneut eingelöst werden.")) return;
    const { data, error } = await updateGymCode(codeId, {
      redeemed_by: null,
      redeemed_at: null,
      status: "available",
    });
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (data) {
      setCodes((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      toast({ title: "Code freigegeben", description: "Der Code kann jetzt erneut eingelöst werden." });
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm("Möchtest du diesen Code wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    const { error } = await deleteGymCode(codeId);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    setCodes((prev) => prev.filter((item) => item.id !== codeId));
    toast({ title: "Code gelöscht", description: "Der Code wurde entfernt." });
  };

  const handleDeleteAllVisible = async () => {
    const count = visibleCodes.length;
    if (count === 0) return;
    const filterText = filter === "all" ? "alle" : filter === "available" ? "alle verfügbaren" : "alle eingelösten";
    if (!confirm(`Möchtest du wirklich ${filterText} ${count} Code${count > 1 ? "s" : ""} löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
    
    const promises = visibleCodes.map((code) => deleteGymCode(code.id));
    const results = await Promise.all(promises);
    const errors = results.filter((r) => r.error);
    
    if (errors.length > 0) {
      toast({ title: "Fehler", description: `${errors.length} Code${errors.length > 1 ? "s" : ""} konnten nicht gelöscht werden.` });
    } else {
      setCodes((prev) => prev.filter((item) => !visibleCodes.some((vc) => vc.id === item.id)));
      toast({ title: "Codes gelöscht", description: `${count} Code${count > 1 ? "s" : ""} wurden entfernt.` });
    }
  };

  const exportToPDF = async () => {
    const availableCodes = codes.filter((c) => !c.redeemed_by);
    if (availableCodes.length === 0) {
      toast({ title: "Keine Codes", description: "Es gibt keine freien Codes zum Exportieren." });
      return;
    }
    toast({ title: "PDF wird vorbereitet…", description: "QR-Codes werden erzeugt." });
    const qrDataUrls = await Promise.all(
      availableCodes.map((code) => QRCode.toDataURL(code.code, { width: 120, margin: 1 }))
    );
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hallen-Codes</title>
          <style>
            @page { size: A4; margin: 1cm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .code-card {
              border: 2px dashed #000;
              padding: 15px;
              margin: 10px 0;
              page-break-inside: avoid;
              width: 100%;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .code-text { font-size: 24px; font-weight: bold; text-align: center; margin: 10px 0; letter-spacing: 2px; }
            .code-label { font-size: 12px; text-align: center; color: #666; margin-top: 5px; }
            .qr-wrap { margin: 8px 0; }
            .qr-wrap img { width: 100px; height: 100px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; margin-bottom: 30px;">Hallen-Codes</h1>
          <div class="grid">
            ${availableCodes
              .map(
                (code, i) => `
              <div class="code-card">
                <div class="code-label">Hallen-Code (scannbar)</div>
                <div class="qr-wrap"><img src="${qrDataUrls[i]}" alt="QR" /></div>
                <div class="code-text">${code.code}</div>
                <div class="code-label">Zum Ausschneiden</div>
              </div>
            `
              )
              .join("")}
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 250);
  };

  const getRedeemerName = (profileId: string | null) => {
    if (!profileId) return null;
    const profile = profiles.get(profileId);
    if (!profile) return "Unbekannt";
    const firstName = profile.first_name || "";
    const lastName = profile.last_name || "";
    return `${firstName} ${lastName}`.trim() || profile.email || "Unbekannt";
  };

  if (!gymId) {
    return <p className="text-sm text-[rgba(27,28,26,0.64)]">Keine Halle zugewiesen.</p>;
  }

  const availableCount = codes.filter((c) => !c.redeemed_by).length;
  const redeemedCount = codes.filter((c) => c.redeemed_by).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader
          className="!mb-0"
          eyebrow="Halle"
          title="Code-Verwaltung"
          description="Hallen-Codes generieren und verwalten."
        />
        <div className="hidden shrink-0 flex-row items-center gap-2 sm:flex">
          <StitchButton type="button" variant="outline" size="sm" onClick={exportToPDF} disabled={availableCount === 0}>
            <Download className="h-4 w-4" />
            PDF Export
          </StitchButton>
          <StitchButton type="button" size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4" />
            Neue Codes
          </StitchButton>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        <StitchCard tone="surface" className="p-3 sm:p-4">
          <div className="stitch-kicker text-[0.58rem] text-[#a15523] sm:text-xs">Codes gesamt</div>
          <div className="stitch-metric mt-1 text-xl text-[#002637] sm:mt-2 sm:text-2xl">{codes.length}</div>
          <p className="mt-1 text-[10px] text-[rgba(27,28,26,0.55)] sm:text-xs">Alle Codes</p>
        </StitchCard>
        <StitchCard tone="surface" className="p-3 sm:p-4">
          <div className="stitch-kicker text-[0.58rem] text-[#a15523] sm:text-xs">Codes verfügbar</div>
          <div className="stitch-metric mt-1 text-xl text-[#002637] sm:mt-2 sm:text-2xl">{availableCount}</div>
          <p className="mt-1 text-[10px] text-[rgba(27,28,26,0.55)] sm:text-xs">Noch nicht eingelöst</p>
        </StitchCard>
        <StitchCard tone="surface" className="p-3 sm:p-4">
          <div className="stitch-kicker text-[0.58rem] text-[#a15523] sm:text-xs">Codes eingelöst</div>
          <div className="stitch-metric mt-1 text-xl text-[#a15523] sm:mt-2 sm:text-2xl">{redeemedCount}</div>
          <p className="mt-1 text-[10px] text-[rgba(27,28,26,0.55)] sm:text-xs">Bereits verwendet</p>
        </StitchCard>
      </div>

      <div className="flex flex-col gap-2 sm:hidden">
        <StitchButton type="button" variant="outline" className="w-full" onClick={exportToPDF} disabled={availableCount === 0}>
          <Download className="h-4 w-4" />
          PDF Export
        </StitchButton>
        <StitchButton type="button" className="w-full" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4" />
          Neue Codes
        </StitchButton>
      </div>

      {showCreateForm ? (
        <StitchCard tone="muted" className="space-y-4 p-4 md:p-6">
          <div className="stitch-kicker mb-4 text-[#a15523]">Codes erzeugen</div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="batchSize">Batch-Größe</Label>
              <Input
                id="batchSize"
                type="number"
                min={1}
                max={500}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                placeholder="Anzahl der Codes"
                className="touch-manipulation"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <StitchButton type="button" onClick={() => handleCreateBatch(batchSize)} disabled={creating} className="w-full sm:w-auto">
                {creating ? "Erstelle…" : `Batch (${batchSize})`}
              </StitchButton>
              <StitchButton type="button" variant="outline" onClick={() => handleCreateBatch(1)} disabled={creating} className="w-full sm:w-auto">
                Einzelcode
              </StitchButton>
              <StitchButton type="button" variant="outline" onClick={() => setShowCreateForm(false)} className="w-full sm:w-auto">
                Abbrechen
              </StitchButton>
            </div>
          </div>
        </StitchCard>
      ) : null}

      {/* Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 sm:flex-none touch-manipulation"
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "available" | "redeemed")}
          >
            <option value="all">Alle Codes</option>
            <option value="available">Nur Verfügbare ({availableCount})</option>
            <option value="redeemed">Nur Eingelöste ({redeemedCount})</option>
          </select>
        </div>
        {visibleCodes.length > 0 ? (
          <StitchButton
            type="button"
            variant="outline"
            onClick={handleDeleteAllVisible}
            className="w-full whitespace-nowrap border-[#c41e3a]/35 text-[0.62rem] text-[#b42318] hover:bg-[#c41e3a]/08 sm:w-auto"
          >
            <Trash2 className="h-4 w-4" />
            Alle löschen ({visibleCodes.length})
          </StitchButton>
        ) : null}
      </div>

      {/* Codes List */}
      {visibleCodes.length === 0 ? (
        <StitchCard tone="muted" className="p-6 text-center md:p-8">
          <p className="text-sm text-[rgba(27,28,26,0.64)]">
            {filter === "available"
              ? "Keine verfügbaren Codes. Erstelle neue Codes oben."
              : filter === "redeemed"
                ? "Keine eingelösten Codes."
                : "Keine Codes vorhanden. Erstelle neue Codes oben."}
          </p>
        </StitchCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visibleCodes.map((code) => {
            const isRedeemed = !!code.redeemed_by;
            const redeemer = isRedeemed ? getRedeemerName(code.redeemed_by) : null;
            return (
              <StitchCard
                key={code.id}
                tone="surface"
                className={`overflow-visible p-4 transition-shadow hover:shadow-[0_16px_36px_rgba(0,38,55,0.1)] ${
                  isRedeemed ? "opacity-80" : ""
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-semibold text-lg text-primary break-all">{code.code}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Erstellt: {code.created_at ? new Date(code.created_at).toLocaleDateString("de-DE") : "-"}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <StitchBadge tone={isRedeemed ? "terracotta" : "navy"}>{isRedeemed ? "Eingelöst" : "Frei"}</StitchBadge>
                      <CodeQrDisplay value={code.code} size={64} />
                    </div>
                  </div>

                  {isRedeemed && redeemer ? (
                    <div className="pt-2 border-t border-border/50 space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
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

                  <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {isRedeemed && redeemer ? (
                      <StitchButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleReleaseCode(code.id)}
                        className="flex-1 touch-manipulation sm:flex-none"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Freigeben
                      </StitchButton>
                    ) : null}
                    <StitchButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCode(code.id)}
                      className="flex-1 border-[#c41e3a]/35 text-[0.58rem] text-[#b42318] hover:bg-[#c41e3a]/08 sm:flex-none"
                    >
                      <Trash2 className="h-3 w-3" />
                    </StitchButton>
                  </div>
                </div>
              </StitchCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GymCodes;
