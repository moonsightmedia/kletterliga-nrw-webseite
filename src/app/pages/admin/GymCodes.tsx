import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { createGymCodes, listGymAdminsByProfile, listGymCodesByGym, updateGymCode, deleteGymCode, fetchProfile, listProfiles } from "@/services/appApi";
import type { GymCode, Profile } from "@/services/appTypes";
import { Download, QrCode, User, Calendar, RotateCcw, Plus, Filter, Trash2 } from "lucide-react";

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

  const exportToPDF = () => {
    const availableCodes = codes.filter((c) => !c.redeemed_by);
    if (availableCodes.length === 0) {
      toast({ title: "Keine Codes", description: "Es gibt keine freien Codes zum Exportieren." });
      return;
    }

    // Erstelle HTML für PDF
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hallen-Codes</title>
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
          <h1 style="text-align: center; margin-bottom: 30px;">Hallen-Codes</h1>
          <div class="grid">
            ${availableCodes
              .map(
                (code) => `
              <div class="code-card">
                <div class="code-label">Hallen-Code</div>
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

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">Keine Halle zugewiesen.</div>;
  }

  const availableCount = codes.filter((c) => !c.redeemed_by).length;
  const redeemedCount = codes.filter((c) => c.redeemed_by).length;

  return (
    <div className="space-y-6">
      {/* Header mit Titel und Buttons - auf Desktop nebeneinander */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-primary">Code-Verwaltung</h1>
          <p className="text-sm text-muted-foreground mt-2">Hallen-Codes generieren und verwalten.</p>
        </div>
        {/* Buttons - auf Desktop hier, auf Mobile werden sie später angezeigt */}
        <div className="hidden sm:flex flex-row items-center gap-2">
          <Button variant="outline" onClick={exportToPDF} disabled={availableCount === 0} className="touch-manipulation">
            <Download className="h-4 w-4 mr-2" />
            <span className="skew-x-6">PDF Export</span>
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)} className="touch-manipulation">
            <Plus className="h-4 w-4 mr-2" />
            <span className="skew-x-6">Neue Codes</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - auf Mobile vor den Buttons */}
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-3">
        <Card className="p-3 sm:p-4 border-border/60">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-secondary">Codes gesamt</div>
          <div className="font-headline text-xl sm:text-2xl text-primary mt-1 sm:mt-2">{codes.length}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Alle Codes</p>
        </Card>
        <Card className="p-3 sm:p-4 border-border/60">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-secondary">Codes verfügbar</div>
          <div className="font-headline text-xl sm:text-2xl text-primary mt-1 sm:mt-2">{availableCount}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Noch nicht eingelöst</p>
        </Card>
        <Card className="p-3 sm:p-4 border-border/60">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-secondary">Codes eingelöst</div>
          <div className="font-headline text-xl sm:text-2xl text-secondary mt-1 sm:mt-2">{redeemedCount}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Bereits verwendet</p>
        </Card>
      </div>

      {/* Buttons - nur auf Mobile sichtbar, nach den Statistiken */}
      <div className="flex sm:hidden flex-col items-stretch gap-2">
        <Button variant="outline" onClick={exportToPDF} disabled={availableCount === 0} className="w-full touch-manipulation">
          <Download className="h-4 w-4 mr-2" />
          <span className="skew-x-6">PDF Export</span>
        </Button>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="w-full touch-manipulation">
          <Plus className="h-4 w-4 mr-2" />
          <span className="skew-x-6">Neue Codes</span>
        </Button>
      </div>

      {showCreateForm && (
        <Card className="p-4 md:p-6 border-border/60 space-y-4">
          <div className="text-xs uppercase tracking-widest text-secondary mb-4">Codes erzeugen</div>
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
                className="touch-manipulation"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => handleCreateBatch(batchSize)} disabled={creating} className="w-full sm:w-auto touch-manipulation">
                <span className="skew-x-6">{creating ? "Erstelle..." : `Batch (${batchSize})`}</span>
              </Button>
              <Button variant="outline" onClick={() => handleCreateBatch(1)} disabled={creating} className="w-full sm:w-auto touch-manipulation">
                <span className="skew-x-6">Einzelcode</span>
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)} className="w-full sm:w-auto touch-manipulation">
                Abbrechen
              </Button>
            </div>
          </div>
        </Card>
      )}

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
        {visibleCodes.length > 0 && (
          <Button 
            variant="outline" 
            onClick={handleDeleteAllVisible} 
            className="text-destructive hover:text-destructive whitespace-nowrap w-full sm:w-auto touch-manipulation"
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
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {visibleCodes.map((code) => {
            const isRedeemed = !!code.redeemed_by;
            const redeemer = isRedeemed ? getRedeemerName(code.redeemed_by) : null;
            return (
              <Card
                key={code.id}
                className={`p-4 border-2 transition-all hover:shadow-md overflow-visible ${
                  isRedeemed ? "border-secondary/50 opacity-75" : "border-border/60"
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
                        className="flex-1 sm:flex-none touch-manipulation"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Freigeben
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCode(code.id)}
                      className="text-destructive hover:text-destructive flex-1 sm:flex-none touch-manipulation"
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

export default GymCodes;
