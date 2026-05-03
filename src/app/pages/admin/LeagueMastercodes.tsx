import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";
import {
  listMasterCodes,
  createMasterCodes,
  fetchProfile,
  listGyms,
  listProfiles,
} from "@/services/appApi";
import type { MasterCode, Profile, Gym } from "@/services/appTypes";
import { CodeQrDisplay } from "@/components/CodeQrDisplay";
import QRCode from "qrcode";
import { User, Calendar, Plus, Filter, Building2, TicketCheck, Download } from "lucide-react";

const LeagueMastercodes = () => {
  const [codes, setCodes] = useState<MasterCode[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [filter, setFilter] = useState<"all" | "available" | "redeemed">("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: codesData }, { data: gymsData }, { data: profilesData }] = await Promise.all([
      listMasterCodes(),
      listGyms(),
      listProfiles(),
    ]);

    if (codesData) {
      setCodes(codesData);
      const redeemedByIds = new Set(codesData.filter((c) => c.redeemed_by).map((c) => c.redeemed_by!));
      const profileResults = await Promise.all(Array.from(redeemedByIds).map((id) => fetchProfile(id)));
      const profileMap = new Map<string, Profile>();
      profileResults.forEach(({ data }) => {
        if (data) profileMap.set(data.id, data);
      });
      (profilesData ?? []).forEach((p) => profileMap.set(p.id, p));
      setProfiles(profileMap);
    }
    if (gymsData) setGyms(gymsData);
  };

  const visibleCodes = useMemo(() => {
    if (filter === "available") return codes.filter((c) => !c.redeemed_by);
    if (filter === "redeemed") return codes.filter((c) => c.redeemed_by);
    return codes;
  }, [codes, filter]);

  const stats = useMemo(() => {
    const total = codes.length;
    const available = codes.filter((c) => !c.redeemed_by).length;
    const redeemed = total - available;
    return { total, available, redeemed };
  }, [codes]);

  const getRedeemerName = (profileId: string | null) => {
    if (!profileId) return null;
    const p = profiles.get(profileId);
    if (!p) return "Unbekannt";
    const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
    return name || p.email || "Unbekannt";
  };

  const getGymName = (gymId: string | null) => {
    if (!gymId) return "Liga";
    const g = gyms.find((x) => x.id === gymId);
    return g?.name ?? "Unbekannt";
  };

  const generateSegment = (length: number) => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);
    return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
  };

  const generateCode = () => `KL-MASTER-${generateSegment(8)}-${generateSegment(4)}`;

  const exportToPDF = async () => {
    const availableCodes = visibleCodes.filter((c) => !c.redeemed_by);
    if (availableCodes.length === 0) {
      toast({ title: "Keine Codes", description: "Es gibt keine freien Mastercodes zum Exportieren." });
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
          <title>Mastercodes - Kletterliga NRW</title>
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
            .code-text { font-size: 22px; font-weight: bold; text-align: center; margin: 10px 0; letter-spacing: 2px; }
            .code-label { font-size: 12px; text-align: center; color: #666; margin-top: 5px; }
            .origin { font-size: 10px; text-align: center; color: #999; margin-top: 3px; }
            .qr-wrap { margin: 8px 0; }
            .qr-wrap img { width: 100px; height: 100px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; margin-bottom: 30px;">Mastercodes – Teilnahmegebühr</h1>
          <div class="grid">
            ${availableCodes
              .map(
                (code, i) => `
              <div class="code-card">
                <div class="code-label">Mastercode (scannbar)</div>
                <div class="qr-wrap"><img src="${qrDataUrls[i]}" alt="QR" /></div>
                <div class="code-text">${code.code}</div>
                <div class="origin">${getGymName(code.gym_id)}</div>
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

  const handleCreateBatch = async (count: number) => {
    if (count <= 0) {
      toast({ title: "Ungültige Anzahl", description: "Bitte eine Zahl größer 0 wählen." });
      return;
    }
    setCreating(true);
    const payload = Array.from({ length: count }, () => ({
      code: generateCode(),
      gym_id: null,
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
      await loadData();
      setShowCreateForm(false);
      toast({ title: "Mastercodes erstellt", description: `${data.length} Mastercode(s) wurden angelegt.` });
    }
  };

  const availableCount = visibleCodes.filter((c) => !c.redeemed_by).length;
  const redeemedCount = visibleCodes.filter((c) => c.redeemed_by).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader
          className="!mb-0 min-w-0"
          eyebrow="Liga"
          title="Mastercodes"
          description="Teilnahmegebühr – einmal pro Teilnehmer einlösbar. Erstellung durch Liga (ohne Halle) oder durch Hallen."
        />
        <div className="hidden shrink-0 flex-row items-center gap-2 sm:flex">
          <StitchButton
            type="button"
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={visibleCodes.filter((c) => !c.redeemed_by).length === 0}
          >
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
          disabled={visibleCodes.filter((c) => !c.redeemed_by).length === 0}
        >
          <Download className="h-4 w-4" />
          PDF Export
        </StitchButton>
        <StitchButton type="button" className="min-h-[44px] w-full" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4" />
          Neue Mastercodes
        </StitchButton>
      </div>

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
        <StitchCard tone="muted" className="space-y-4 p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <TicketCheck className="h-4 w-4 shrink-0 text-[#003d55]" />
            <span className="stitch-kicker text-[#a15523]">Mastercodes erzeugen (Liga)</span>
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
              <StitchButton type="button" onClick={() => handleCreateBatch(batchSize)} disabled={creating} className="min-h-[44px] w-full sm:w-auto">
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

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <select
          className="h-10 sm:h-9 min-h-[44px] sm:min-h-0 w-full sm:w-auto rounded-md border border-input bg-background px-3 text-sm touch-manipulation"
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
            const isRedeemed = !!code.redeemed_by;
            const redeemer = isRedeemed ? getRedeemerName(code.redeemed_by) : null;
            const origin = getGymName(code.gym_id);
            return (
              <StitchCard
                key={code.id}
                tone="surface"
                className={`min-w-0 p-4 transition-shadow hover:shadow-[0_16px_36px_rgba(0,38,55,0.1)] md:p-5 ${isRedeemed ? "opacity-80" : ""}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {origin}
                      </div>
                      <div className="font-mono font-semibold text-sm md:text-base text-primary break-all">{code.code}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Erstellt: {code.created_at ? new Date(code.created_at).toLocaleDateString("de-DE") : "-"}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <StitchBadge tone={isRedeemed ? "terracotta" : "navy"}>{isRedeemed ? "Eingelöst" : "Frei"}</StitchBadge>
                      <CodeQrDisplay value={code.code} size={64} />
                    </div>
                  </div>
                  {isRedeemed && redeemer && (
                    <div className="pt-2 border-t border-border/50 space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-muted-foreground">Eingelöst von: </span>
                          <span className="font-medium text-primary break-words">{redeemer}</span>
                        </div>
                      </div>
                      {code.redeemed_at && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(code.redeemed_at).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </StitchCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeagueMastercodes;
