import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { createRoute, deleteRoute, listGymAdminsByProfile, listRoutesByGym, updateRoute } from "@/services/appApi";
import type { Route } from "@/services/appTypes";
import { Pencil, Plus, Trash2, CheckSquare, Square } from "lucide-react";

const AVAILABLE_COLORS = [
  { name: "weiß", class: "bg-white border border-border", hex: "#FFFFFF" },
  { name: "gelb", class: "bg-yellow-400", hex: "#FACC15" },
  { name: "grün", class: "bg-green-500", hex: "#22C55E" },
  { name: "blau", class: "bg-blue-500", hex: "#3B82F6" },
  { name: "rot", class: "bg-red-500", hex: "#EF4444" },
  { name: "schwarz", class: "bg-black", hex: "#000000" },
  { name: "lila", class: "bg-purple-500", hex: "#A855F7" },
  { name: "pink", class: "bg-pink-400", hex: "#F472B6" },
  { name: "orange", class: "bg-orange-500", hex: "#F97316" },
  { name: "grau", class: "bg-gray-400", hex: "#9CA3AF" },
];

const ColorPicker = ({ value, onChange }: { value: string; onChange: (color: string) => void }) => {
  const [open, setOpen] = useState(false);
  const selectedColor = AVAILABLE_COLORS.find((c) => c.name.toLowerCase() === value.toLowerCase());
  const [hexValue, setHexValue] = useState(selectedColor?.hex || "#FFFFFF");

  const handleColorChange = (hex: string) => {
    setHexValue(hex);
    // Finde den nächsten Farbnamen oder verwende den Hex-Wert
    const color = AVAILABLE_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
    onChange(color ? color.name : hex);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={hexValue}
            onChange={(e) => handleColorChange(e.target.value)}
            className="h-10 w-20 rounded-md border border-input cursor-pointer"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {selectedColor && (
              <>
                <div className={`h-5 w-5 rounded-full ${selectedColor.class} border border-border/50`} />
                <span className="text-sm capitalize">{selectedColor.name}</span>
              </>
            )}
            {!selectedColor && value && (
              <>
                <div className="h-5 w-5 rounded-full border border-border/50" style={{ backgroundColor: value }} />
                <span className="text-sm text-muted-foreground">{value}</span>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground">Klicke auf den Farbkreis zum Anpassen</div>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2 pt-2 border-t border-border/50">
        {AVAILABLE_COLORS.map((color) => (
          <button
            key={color.name}
            type="button"
            onClick={() => {
              setHexValue(color.hex);
              onChange(color.name);
            }}
            className={`h-8 w-8 rounded-full ${color.class} border-2 transition-all hover:scale-110 ${
              selectedColor?.name === color.name ? "border-primary ring-2 ring-primary/20" : "border-border"
            }`}
            title={color.name}
          />
        ))}
      </div>
    </div>
  );
};

const GymRoutesAdmin = () => {
  const { profile } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [gymId, setGymId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<"toprope" | "lead">("toprope");
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({
    discipline: "toprope" as "toprope" | "lead",
    code: "",
    name: "",
    setter: "",
    color: "",
  });

  useEffect(() => {
    if (!profile?.id) return;
    listGymAdminsByProfile(profile.id).then(({ data }) => {
      const firstGym = data?.[0]?.gym_id ?? null;
      setGymId(firstGym);
      if (firstGym) {
        listRoutesByGym(firstGym).then(({ data: routesData }) => setRoutes(routesData ?? []));
      }
    });
  }, [profile?.id]);

  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => route.discipline === selectedDiscipline);
  }, [routes, selectedDiscipline]);

  const usedCodes = useMemo(() => {
    return new Set(
      routes
        .filter((route) => route.discipline === form.discipline)
        .map((route) => route.code)
    );
  }, [routes, form.discipline]);

  const handleCreate = async () => {
    if (!gymId) return;
    if (!form.code) {
      toast({ title: "Code fehlt", description: "Bitte einen Routen-Code angeben." });
      return;
    }
    setSaving(true);
    const { data, error } = await createRoute({
      gym_id: gymId,
      discipline: form.discipline,
      code: form.code,
      name: form.name || null,
      setter: form.setter || null,
      color: form.color || null,
      grade_range: null,
      active: true,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (data) {
      setRoutes((prev) => [data, ...prev]);
      setForm({
        discipline: selectedDiscipline,
        code: "",
        name: "",
        setter: "",
        color: "",
      });
      setShowCreateForm(false);
      toast({ title: "Erfolg", description: "Route wurde angelegt." });
    }
  };



  const handleBulkDelete = async () => {
    if (selectedRoutes.size === 0) return;
    if (!confirm(`Möchtest du wirklich ${selectedRoutes.size} Routen löschen?`)) return;
    const promises = Array.from(selectedRoutes).map((routeId) => deleteRoute(routeId));
    const results = await Promise.all(promises);
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      toast({ title: "Fehler", description: `${errors.length} Routen konnten nicht gelöscht werden.` });
    } else {
      setRoutes((prev) => prev.filter((item) => !selectedRoutes.has(item.id)));
      setSelectedRoutes(new Set());
      toast({ title: "Erfolg", description: `${selectedRoutes.size} Routen wurden gelöscht.` });
    }
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm("Möchtest du diese Route wirklich löschen?")) return;
    const { error } = await deleteRoute(routeId);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    setRoutes((prev) => prev.filter((item) => item.id !== routeId));
    toast({ title: "Gelöscht", description: "Route wurde entfernt." });
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setForm({
      discipline: route.discipline,
      code: route.code,
      name: route.name ?? "",
      setter: route.setter ?? "",
      color: route.color ?? "",
    });
  };

  const handleUpdate = async () => {
    if (!editingRoute) return;
    if (!form.code) {
      toast({ title: "Code fehlt", description: "Bitte einen Routen-Code angeben." });
      return;
    }
    setSaving(true);
    const { data, error } = await updateRoute(editingRoute.id, {
      discipline: form.discipline,
      code: form.code,
      name: form.name || null,
      setter: form.setter || null,
      color: form.color || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (data) {
      setRoutes((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      setEditingRoute(null);
      setForm({
        discipline: selectedDiscipline,
        code: "",
        name: "",
        setter: "",
        color: "",
      });
      toast({ title: "Gespeichert", description: "Route wurde aktualisiert." });
    }
  };

  const toggleRouteSelection = (routeId: string) => {
    const newSelected = new Set(selectedRoutes);
    if (newSelected.has(routeId)) {
      newSelected.delete(routeId);
    } else {
      newSelected.add(routeId);
    }
    setSelectedRoutes(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRoutes.size === filteredRoutes.length) {
      setSelectedRoutes(new Set());
    } else {
      setSelectedRoutes(new Set(filteredRoutes.map((r) => r.id)));
    }
  };

  const getColorClass = (colorName: string | null) => {
    if (!colorName) return "bg-muted";
    const color = AVAILABLE_COLORS.find((c) => c.name.toLowerCase() === colorName.toLowerCase());
    return color?.class || "bg-muted";
  };

  const getColorName = (colorValue: string | null) => {
    if (!colorValue) return null;
    // Wenn es ein Hex-Code ist, versuche den Farbnamen zu finden
    const color = AVAILABLE_COLORS.find(
      (c) => c.name.toLowerCase() === colorValue.toLowerCase() || c.hex.toLowerCase() === colorValue.toLowerCase()
    );
    return color ? color.name : colorValue;
  };

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">Keine Halle zugewiesen.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-primary">Routenverwaltung</h1>
          <p className="text-sm text-muted-foreground mt-2">Liga-Routen verwalten und bearbeiten.</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="w-full sm:w-auto touch-manipulation">
          <Plus className="h-4 w-4 mr-2" />
          <span className="skew-x-6">Neue Route</span>
        </Button>
      </div>

      {showCreateForm && (
        <Card className="p-4 md:p-6 border-border/60 space-y-4">
          <div className="text-xs uppercase tracking-widest text-secondary mb-4">Neue Route anlegen</div>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="routeDiscipline">Disziplin</Label>
              <select
                id="routeDiscipline"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.discipline}
                onChange={(e) => setForm({ ...form, discipline: e.target.value as "toprope" | "lead" })}
              >
                <option value="toprope">Toprope</option>
                <option value="lead">Vorstieg</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="routeCode">Code *</Label>
              <select
                id="routeCode"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              >
                <option value="">Bitte wählen</option>
                {form.discipline === "toprope"
                  ? Array.from({ length: 10 }, (_, i) => `T${i + 1}`).map((code) => {
                      const isUsed = usedCodes.has(code);
                      return (
                        <option key={code} value={code} disabled={isUsed && form.code !== code}>
                          {code} {isUsed && form.code !== code ? "(bereits vergeben)" : ""}
                        </option>
                      );
                    })
                  : Array.from({ length: 10 }, (_, i) => `V${i + 1}`).map((code) => {
                      const isUsed = usedCodes.has(code);
                      return (
                        <option key={code} value={code} disabled={isUsed && form.code !== code}>
                          {code} {isUsed && form.code !== code ? "(bereits vergeben)" : ""}
                        </option>
                      );
                    })}
              </select>
              {usedCodes.has(form.code) && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ Dieser Code ist bereits vergeben. Bitte wähle einen anderen Code.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="routeName">Name</Label>
              <Input
                id="routeName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routeSetter">Routenschrauber</Label>
              <Input
                id="routeSetter"
                value={form.setter}
                onChange={(e) => setForm({ ...form, setter: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routeColor">Farbe</Label>
              <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateForm(false)} className="w-full sm:w-auto touch-manipulation">
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="w-full sm:w-auto touch-manipulation">
              <span className="skew-x-6">{saving ? "Speichern..." : "Route anlegen"}</span>
            </Button>
          </div>
        </Card>
      )}

      <Tabs value={selectedDiscipline} onValueChange={(v) => setSelectedDiscipline(v as "toprope" | "lead")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="toprope" className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 touch-manipulation">Toprope</TabsTrigger>
            <TabsTrigger value="lead" className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 touch-manipulation">Vorstieg</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {selectedRoutes.size > 0 && (
              <Button variant="outline" size="sm" onClick={handleBulkDelete} className="w-full sm:w-auto touch-manipulation">
                <Trash2 className="h-4 w-4 mr-1" />
                Löschen ({selectedRoutes.size})
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="toprope" className="space-y-4">
          {filteredRoutes.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Keine Routen gefunden. Erstelle eine neue Route oben.
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-secondary flex items-center justify-between">
                <span>Routen ({filteredRoutes.length})</span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  {selectedRoutes.size === filteredRoutes.length ? "Alle abwählen" : "Alle auswählen"}
                </button>
              </div>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredRoutes.map((route) => {
                  const colorClass = getColorClass(route.color);
                  const colorName = getColorName(route.color);
                  const isSelected = selectedRoutes.has(route.id);
                  return (
                    <Card
                      key={route.id}
                      className={`p-4 border-2 transition-all hover:shadow-md ${
                        isSelected ? "border-primary bg-primary/5" : "border-border/60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleRouteSelection(route.id)}
                          className="mt-1 touch-manipulation flex-shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`h-4 w-4 rounded-full ${colorClass} border border-border/50 flex-shrink-0`} />
                            <div className="font-semibold text-primary truncate">
                              {route.code} {route.name && `· ${route.name}`}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            {colorName && <div>Farbe: {colorName}</div>}
                            {route.setter && <div>Routenschrauber: {route.setter}</div>}
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(route)}
                              className="flex-1 touch-manipulation"
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Bearbeiten
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(route.id)}
                              className="text-destructive hover:text-destructive touch-manipulation"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lead" className="space-y-4">
          {filteredRoutes.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Keine Routen gefunden. Erstelle eine neue Route oben.
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-secondary flex items-center justify-between">
                <span>Routen ({filteredRoutes.length})</span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  {selectedRoutes.size === filteredRoutes.length ? "Alle abwählen" : "Alle auswählen"}
                </button>
              </div>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredRoutes.map((route) => {
                  const colorClass = getColorClass(route.color);
                  const colorName = getColorName(route.color);
                  const isSelected = selectedRoutes.has(route.id);
                  return (
                    <Card
                      key={route.id}
                      className={`p-4 border-2 transition-all hover:shadow-md ${
                        isSelected ? "border-primary bg-primary/5" : "border-border/60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleRouteSelection(route.id)}
                          className="mt-1 touch-manipulation flex-shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`h-4 w-4 rounded-full ${colorClass} border border-border/50 flex-shrink-0`} />
                            <div className="font-semibold text-primary truncate">
                              {route.code} {route.name && `· ${route.name}`}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            {colorName && <div>Farbe: {colorName}</div>}
                            {route.setter && <div>Routenschrauber: {route.setter}</div>}
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(route)}
                              className="flex-1 touch-manipulation"
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Bearbeiten
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(route.id)}
                              className="text-destructive hover:text-destructive touch-manipulation"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingRoute} onOpenChange={(open) => !open && setEditingRoute(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Route bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editDiscipline">Disziplin</Label>
                <select
                  id="editDiscipline"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.discipline}
                  onChange={(e) => setForm({ ...form, discipline: e.target.value as "toprope" | "lead" })}
                >
                  <option value="toprope">Toprope</option>
                  <option value="lead">Vorstieg</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCode">Code *</Label>
                <select
                  id="editCode"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                >
                  <option value="">Bitte wählen</option>
                  {form.discipline === "toprope"
                    ? Array.from({ length: 20 }, (_, i) => `T${i + 1}`).map((code) => {
                        const isUsed = usedCodes.has(code) && editingRoute?.code !== code;
                        return (
                          <option key={code} value={code} disabled={isUsed}>
                            {code} {isUsed ? "(bereits vergeben)" : ""}
                          </option>
                        );
                      })
                    : Array.from({ length: 20 }, (_, i) => `V${i + 1}`).map((code) => {
                        const isUsed = usedCodes.has(code) && editingRoute?.code !== code;
                        return (
                          <option key={code} value={code} disabled={isUsed}>
                            {code} {isUsed ? "(bereits vergeben)" : ""}
                          </option>
                        );
                      })}
                </select>
                {usedCodes.has(form.code) && editingRoute?.code !== form.code && (
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Dieser Code ist bereits vergeben. Bitte wähle einen anderen Code.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="editName">Name</Label>
                <Input
                  id="editName"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSetter">Routenschrauber</Label>
                <Input
                  id="editSetter"
                  value={form.setter}
                  onChange={(e) => setForm({ ...form, setter: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editColor">Farbe</Label>
                <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingRoute(null)}>
                Abbrechen
              </Button>
              <Button onClick={handleUpdate} disabled={saving}>
                {saving ? "Speichern..." : "Speichern"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GymRoutesAdmin;
