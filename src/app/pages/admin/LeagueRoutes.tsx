import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { createRoute, deleteRoute, listGyms, listRoutesByGym, updateRoute } from "@/services/appApi";
import type { Route, Gym } from "@/services/appTypes";
import { Pencil, Plus, Trash2, CheckSquare, Square, Building2, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const selectedColor = AVAILABLE_COLORS.find((c) => c.name.toLowerCase() === value.toLowerCase());
  const [hexValue, setHexValue] = useState(selectedColor?.hex || "#FFFFFF");

  const handleColorChange = (hex: string) => {
    setHexValue(hex);
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

const LeagueRoutes = () => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string>("");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<"toprope" | "lead">("toprope");
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    gym_id: "",
    discipline: "toprope" as "toprope" | "lead",
    code: "",
    name: "",
    setter: "",
    color: "",
  });

  useEffect(() => {
    listGyms().then(({ data }) => {
      setGyms(data ?? []);
      if (data && data.length > 0) {
        setSelectedGymId(data[0].id);
        setForm({ ...form, gym_id: data[0].id });
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedGymId) {
      listRoutesByGym(selectedGymId).then(({ data: routesData }) => setRoutes(routesData ?? []));
    } else {
      setRoutes([]);
    }
  }, [selectedGymId]);

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
    if (!form.gym_id) {
      toast({ title: "Halle fehlt", description: "Bitte eine Halle auswählen." });
      return;
    }
    if (!form.code) {
      toast({ title: "Code fehlt", description: "Bitte einen Routen-Code angeben." });
      return;
    }
    setSaving(true);
    const { data, error } = await createRoute({
      gym_id: form.gym_id,
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
      if (selectedGymId === form.gym_id) {
        setRoutes((prev) => [data, ...prev]);
      }
      setForm({
        ...form,
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
      ...form,
      gym_id: route.gym_id,
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
        ...form,
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
    const color = AVAILABLE_COLORS.find(
      (c) => c.name.toLowerCase() === colorValue.toLowerCase() || c.hex.toLowerCase() === colorValue.toLowerCase()
    );
    return color ? color.name : colorValue;
  };

  const selectedGym = gyms.find((g) => g.id === selectedGymId);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/90 shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        <div className="relative p-4 md:p-6 lg:p-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="h-6 w-6 md:h-8 md:w-8 text-white/80" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-white break-words">Routenverwaltung</h1>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs flex-shrink-0">
                  Liga
                </Badge>
              </div>
              <p className="text-white/90 text-xs md:text-sm lg:text-base break-words">
                Routen in allen Hallen verwalten und bearbeiten
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Halle-Auswahl */}
      <Card className="p-4 md:p-6 border-2 border-border/60">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
          <h2 className="text-base md:text-lg font-headline text-primary">Halle auswählen</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gymSelect">Halle</Label>
          <Select value={selectedGymId} onValueChange={(value) => {
            setSelectedGymId(value);
            setForm({ ...form, gym_id: value });
            setSelectedRoutes(new Set());
          }}>
            <SelectTrigger id="gymSelect">
              <SelectValue placeholder="Halle auswählen" />
            </SelectTrigger>
            <SelectContent>
              {gyms.map((gym) => (
                <SelectItem key={gym.id} value={gym.id}>
                  {gym.name} {gym.city && `· ${gym.city}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedGym && (
            <p className="text-xs text-muted-foreground">
              {selectedGym.address && `${selectedGym.address}`}
              {selectedGym.address && selectedGym.city && " · "}
              {selectedGym.city}
            </p>
          )}
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-center border-2 border-border/60">
          <p className="text-muted-foreground">Lade Hallen...</p>
        </Card>
      ) : !selectedGymId ? (
        <Card className="p-8 text-center border-2 border-border/60">
          <p className="text-muted-foreground">Bitte wähle eine Halle aus.</p>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-primary">
                Routen für {selectedGym?.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {routes.length} {routes.length === 1 ? "Route" : "Routen"} gesamt
              </p>
            </div>
            <Button onClick={() => {
              setForm({ ...form, gym_id: selectedGymId });
              setShowCreateForm(!showCreateForm);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="skew-x-6">Neue Route</span>
            </Button>
          </div>

          {showCreateForm && (
            <Card className="p-6 border-2 border-border/60 space-y-4">
              <div className="text-xs uppercase tracking-widest text-secondary mb-4">Neue Route anlegen</div>
              <div className="grid gap-4 md:grid-cols-2">
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
                      ? Array.from({ length: 20 }, (_, i) => `T${i + 1}`).map((code) => {
                          const isUsed = usedCodes.has(code);
                          return (
                            <option key={code} value={code} disabled={isUsed && form.code !== code}>
                              {code} {isUsed && form.code !== code ? "(bereits vergeben)" : ""}
                            </option>
                          );
                        })
                      : Array.from({ length: 20 }, (_, i) => `V${i + 1}`).map((code) => {
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleCreate} disabled={saving}>
                  <span className="skew-x-6">{saving ? "Speichern..." : "Route anlegen"}</span>
                </Button>
              </div>
            </Card>
          )}

          <Tabs value={selectedDiscipline} onValueChange={(v) => setSelectedDiscipline(v as "toprope" | "lead")}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="toprope">Toprope</TabsTrigger>
                <TabsTrigger value="lead">Vorstieg</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                {selectedRoutes.size > 0 && (
                  <Button variant="outline" size="sm" onClick={handleBulkDelete}>
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
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                              className="mt-1"
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
                              <div className="flex items-center gap-2 mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(route)}
                                  className="flex-1"
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Bearbeiten
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(route.id)}
                                  className="text-destructive hover:text-destructive"
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
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                              className="mt-1"
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
                              <div className="flex items-center gap-2 mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(route)}
                                  className="flex-1"
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Bearbeiten
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(route.id)}
                                  className="text-destructive hover:text-destructive"
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
        </>
      )}
    </div>
  );
};

export default LeagueRoutes;
