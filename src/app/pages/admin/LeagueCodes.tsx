import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { listAllGymCodes, createGymCodes, updateGymCode, deleteGymCode, fetchProfile, listGyms, listProfiles, type GymCodeWithGym } from "@/services/appApi";
import type { Profile, Gym } from "@/services/appTypes";
import { Download, QrCode, User, Calendar, RotateCcw, Plus, Filter, Trash2, Building2 } from "lucide-react";

const LeagueCodes = () => {
  const [codes, setCodes] = useState<GymCodeWithGym[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [selectedGymId, setSelectedGymId] = useState<string>("all");
  const [batchSize, setBatchSize] = useState(50);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "available" | "redeemed">("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createGymId, setCreateGymId] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: codesData }, { data: gymsData }, { data: profilesData }] = await Promise.all([
      listAllGymCodes(),
      listGyms(),
      listProfiles(),
    ]);

    if (codesData) {
      setCodes(codesData);
      // Lade Profile für eingelöste Codes
      const redeemedByIds = new Set(codesData.filter((c) => c.redeemed_by).map((c) => c.redeemed_by!));
      const profileResults = await Promise.all(Array.from(redeemedByIds).map((id) => fetchProfile(id)));
      const profileMap = new Map<string, Profile>();
      profileResults.forEach(({ data }) => {
        if (data) profileMap.set(data.id, data);
      });
      (profilesData ?? []).forEach((p) => profileMap.set(p.id, p));
      setProfiles(profileMap);
    }

    if (gymsData) {
      setGyms(gymsData);
      if (gymsData.length > 0 && !createGymId) {
        setCreateGymId(gymsData[0].id);
      }
    }
  };

  const visibleCodes = useMemo(() => {
    let filtered = codes;

    // Filter nach Halle
    if (selectedGymId !== "all") {
      filtered = filtered.filter((code) => code.gym_id === selectedGymId);
    }

    // Filter nach Status
    if (filter === "available") {
      filtered = filtered.filter((code) => !code.redeemed_by);
    } else if (filter === "redeemed") {
      filtered = filtered.filter((code) => code.redeemed_by);
    }

    return filtered;
  }, [codes, selectedGymId, filter]);

  const generateCode = () =>
    `KL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const handleCreateBatch = async (count: number, gymId: string) => {
    if (!gymId) {
      toast({ title: "Fehler", description: "Bitte eine Halle auswählen." });
      return;
    }
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
      await loadData();
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
      await loadData();
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
    await loadData();
    toast({ title: "Code gelöscht", description: "Der Code wurde entfernt." });
  };

  const handleDeleteAllVisible = async () => {
    const count = visibleCodes.length;
    if (count === 0) return;
    const filterText = filter === "all" ? "alle" : filter === "available" ? "alle verfügbaren" : "alle eingelösten";
    const gymText = selectedGymId === "all" ? "" : ` für ${gyms.find((g) => g.id === selectedGymId)?.name || "die ausgewählte Halle"}`;
    if (!confirm(`Möchtest du wirklich ${filterText} ${count} Code${count > 1 ? "s" : ""}${gymText} löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
    
    const promises = visibleCodes.map((code) => deleteGymCode(code.id));
    const results = await Promise.all(promises);
    const errors = results.filter((r) => r.error);
    
    if (errors.length > 0) {
      toast({ title: "Fehler", description: `${errors.length} Code${errors.length > 1 ? "s" : ""} konnten nicht gelöscht werden.` });
    } else {
      await loadData();
      toast({ title: "Codes gelöscht", description: `${count} Code${count > 1 ? "s" : ""} wurden entfernt.` });
    }
  };

  const exportToPDF = () => {
    const availableCodes = visibleCodes.filter((c) => !c.redeemed_by);
    if (availableCodes.length === 0) {
      toast({ title: "Keine Codes", description: "Es gibt keine freien Codes zum Exportieren." });
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const gymName = selectedGymId === "all" ? "Alle Hallen" : gyms.find((g) => g.id === selectedGymId)?.name || "Unbekannt";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hallen-Codes - ${gymName}</title>
          <style>
            @page {
              size: A4;
              margin: 1cm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .code-card {
              border: 2px dashed #000;
              padding: 15px;
              margin: 10px 0;
              page-break-inside: avoid;
              width: 100%;
              box-sizing: border-box;
            }
            .code-text {
              font-size: 24px;
              font-weight: bold;
              text-align: center;
              margin: 10px 0;
              letter-spacing: 2px;
            }
            .code-label {
              font-size: 12px;
              text-align: center;
              color: #666;
              margin-top: 5px;
            }
            .gym-name {
              font-size: 10px;
              text-align: center;
              color: #999;
              margin-top: 3px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
            }
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; margin-bottom: 30px;">Hallen-Codes - ${gymName}</h1>
          <div class="grid">
            ${availableCodes
              .map(
                (code) => `
              <div class="code-card">
                <div class="code-label">Hallen-Code</div>
                <div class="code-text">${code.code}</div>
                ${code.gyms ? `<div class="gym-name">${code.gyms.name}</div>` : ""}
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
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const getRedeemerName = (profileId: string | null) => {
    if (!profileId) return null;
    const profile = profiles.get(profileId);
    if (!profile) return "Unbekannt";
    const firstName = profile.first_name || "";
    const lastName = profile.last_name || "";
    return `${firstName} ${lastName}`.trim() || profile.email || "Unbekannt";
  };

  const stats = useMemo(() => {
    const total = codes.length;
    const available = codes.filter((c) => !c.redeemed_by).length;
    const redeemed = codes.filter((c) => c.redeemed_by).length;
    
    // Statistiken nach Halle
    const byGym = codes.reduce<Record<string, { total: number; available: number; redeemed: number }>>((acc, code) => {
      const gymId = code.gym_id;
      if (!acc[gymId]) {
        acc[gymId] = { total: 0, available: 0, redeemed: 0 };
      }
      acc[gymId].total++;
      if (code.redeemed_by) {
        acc[gymId].redeemed++;
      } else {
        acc[gymId].available++;
      }
      return acc;
    }, {});

    return { total, available, redeemed, byGym };
  }, [codes]);

  const availableCount = visibleCodes.filter((c) => !c.redeemed_by).length;
  const redeemedCount = visibleCodes.filter((c) => c.redeemed_by).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-primary">Code-Verwaltung</h1>
          <p className="text-sm text-muted-foreground mt-2">Verwaltung aller Hallen-Codes.</p>
        </div>
        <div className="hidden sm:flex flex-row items-center gap-2">
          <Button variant="outline" onClick={exportToPDF} disabled={availableCount === 0}>
            <Download className="h-4 w-4 mr-2" />
            <span className="skew-x-6">PDF Export</span>
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="skew-x-6">Neue Codes</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-3">
        <Card className="p-3 sm:p-4 border-border/60">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-secondary">Codes gesamt</div>
          <div className="font-headline text-xl sm:text-2xl text-primary mt-1 sm:mt-2">{stats.total}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Alle Codes</p>
        </Card>
        <Card className="p-3 sm:p-4 border-border/60">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-secondary">Codes verfügbar</div>
          <div className="font-headline text-xl sm:text-2xl text-primary mt-1 sm:mt-2">{stats.available}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Noch nicht eingelöst</p>
        </Card>
        <Card className="p-3 sm:p-4 border-border/60">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-secondary">Codes eingelöst</div>
          <div className="font-headline text-xl sm:text-2xl text-secondary mt-1 sm:mt-2">{stats.redeemed}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Bereits verwendet</p>
        </Card>
      </div>

      {/* Mobile Buttons */}
      <div className="flex sm:hidden flex-col items-stretch gap-2">
        <Button variant="outline" onClick={exportToPDF} disabled={availableCount === 0} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          <span className="skew-x-6">PDF Export</span>
        </Button>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          <span className="skew-x-6">Neue Codes</span>
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="p-4 md:p-6 border-border/60 space-y-4">
          <div className="text-xs uppercase tracking-widest text-secondary mb-4">Codes erzeugen</div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="createGym">Halle auswählen</Label>
              <select
                id="createGym"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={createGymId}
                onChange={(e) => setCreateGymId(e.target.value)}
              >
                <option value="">-- Halle auswählen --</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name} {gym.city ? `(${gym.city})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="batchSize">Batch-Größe</Label>
                <Input
                  id="batchSize"
                  type="number"
                  min={1}
                  max={500}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  placeholder="Anzahl der Codes"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => handleCreateBatch(batchSize, createGymId)} disabled={creating || !createGymId} className="w-full sm:w-auto">
                  <span className="skew-x-6">{creating ? "Erstelle..." : `Batch (${batchSize})`}</span>
                </Button>
                <Button variant="outline" onClick={() => handleCreateBatch(1, createGymId)} disabled={creating || !createGymId} className="w-full sm:w-auto">
                  <span className="skew-x-6">Einzelcode</span>
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)} className="w-full sm:w-auto">
                  Abbrechen
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 sm:flex-none min-w-[200px]"
              value={selectedGymId}
              onChange={(e) => setSelectedGymId(e.target.value)}
            >
              <option value="all">Alle Hallen</option>
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name} {gym.city ? `(${gym.city})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 sm:flex-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value as "all" | "available" | "redeemed")}
            >
              <option value="all">Alle Codes</option>
              <option value="available">Nur Verfügbare ({availableCount})</option>
              <option value="redeemed">Nur Eingelöste ({redeemedCount})</option>
            </select>
          </div>
        </div>
        {visibleCodes.length > 0 && (
          <Button 
            variant="outline" 
            onClick={handleDeleteAllVisible} 
            className="text-destructive hover:text-destructive whitespace-nowrap w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span className="skew-x-6">Alle löschen ({visibleCodes.length})</span>
          </Button>
        )}
      </div>

      {/* Codes List */}
      {visibleCodes.length === 0 ? (
        <Card className="p-6 md:p-8 text-center text-muted-foreground">
          {filter === "available"
            ? "Keine verfügbaren Codes. Erstelle neue Codes oben."
            : filter === "redeemed"
              ? "Keine eingelösten Codes."
              : "Keine Codes vorhanden. Erstelle neue Codes oben."}
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleCodes.map((code) => {
            const isRedeemed = !!code.redeemed_by;
            const redeemer = isRedeemed ? getRedeemerName(code.redeemed_by) : null;
            const gymName = code.gyms?.name || "Unbekannte Halle";
            return (
              <Card
                key={code.id}
                className={`p-4 md:p-5 border-2 transition-all hover:shadow-md overflow-visible ${
                  isRedeemed ? "border-secondary/50 opacity-75" : "border-border/60"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {gymName}
                      </div>
                      <div className="font-mono font-semibold text-base md:text-lg text-primary break-all">{code.code}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Erstellt: {code.created_at ? new Date(code.created_at).toLocaleDateString("de-DE") : "-"}
                      </div>
                    </div>
                    <Badge variant={isRedeemed ? "secondary" : "default"} className="flex-shrink-0">
                      {isRedeemed ? "Eingelöst" : "Frei"}
                    </Badge>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReleaseCode(code.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Freigeben
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCode(code.id)}
                      className="text-destructive hover:text-destructive flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeagueCodes;
