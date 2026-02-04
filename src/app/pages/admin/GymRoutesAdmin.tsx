import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { createRoute, deleteRoute, listGymAdminsByProfile, listRoutesByGym, updateRoute } from "@/services/appApi";
import type { Route } from "@/services/appTypes";
import { Pencil } from "lucide-react";

const GymRoutesAdmin = () => {
  const { profile } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [gymId, setGymId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [form, setForm] = useState({
    discipline: "toprope",
    code: "",
    name: "",
    setter: "",
    color: "",
    active: true,
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

  const handleCreate = async () => {
    if (!gymId) return;
    if (!form.code) {
      toast({ title: "Code fehlt", description: "Bitte einen Routen-Code angeben." });
      return;
    }
    setSaving(true);
    const { data, error } = await createRoute({
      gym_id: gymId,
      discipline: form.discipline as "toprope" | "lead",
      code: form.code,
      name: form.name || null,
      setter: form.setter || null,
      color: form.color || null,
      grade_range: null,
      active: form.active,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (data) {
      setRoutes((prev) => [data, ...prev]);
      setForm({
        discipline: "toprope",
        code: "",
        name: "",
        setter: "",
        color: "",
        active: true,
      });
    }
  };

  const toggleActive = async (route: Route) => {
    const { data, error } = await updateRoute(route.id, { active: !route.active });
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (data) {
      setRoutes((prev) => prev.map((item) => (item.id === data.id ? data : item)));
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
      active: route.active,
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
      discipline: form.discipline as "toprope" | "lead",
      code: form.code,
      name: form.name || null,
      setter: form.setter || null,
      color: form.color || null,
      active: form.active,
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
        discipline: "toprope",
        code: "",
        name: "",
        setter: "",
        color: "",
        active: true,
      });
      toast({ title: "Gespeichert", description: "Route wurde aktualisiert." });
    }
  };

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">Keine Halle zugewiesen.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Routenverwaltung</h1>
        <p className="text-sm text-muted-foreground mt-2">Liga-Routen aktivieren oder bearbeiten.</p>
      </div>
      <Card className="p-4 border-border/60 space-y-4">
        <div className="text-xs uppercase tracking-widest text-secondary">Neue Route</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="routeDiscipline">Disziplin</Label>
            <select
              id="routeDiscipline"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.discipline}
              onChange={(e) => setForm({ ...form, discipline: e.target.value })}
            >
              <option value="toprope">Toprope</option>
              <option value="lead">Vorstieg</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="routeCode">Code</Label>
            <Input
              id="routeCode"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="T1 / V1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="routeName">Name</Label>
            <Input
              id="routeName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="routeSetter">Routenschrauber</Label>
            <Input
              id="routeSetter"
              value={form.setter}
              onChange={(e) => setForm({ ...form, setter: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="routeColor">Farbe</Label>
            <Input
              id="routeColor"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="routeActive">Status</Label>
            <select
              id="routeActive"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.active ? "active" : "inactive"}
              onChange={(e) => setForm({ ...form, active: e.target.value === "active" })}
            >
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </div>
        </div>
        <Button onClick={handleCreate} disabled={saving}>
          <span className="skew-x-6">{saving ? "Speichern..." : "Route anlegen"}</span>
        </Button>
      </Card>

      <div className="space-y-3">
        {routes.map((route) => (
          <Card key={route.id} className="p-4 border-border/60 flex items-center justify-between">
            <div>
              <div className="font-semibold text-primary">
                {route.code} · {route.name ?? "Ohne Name"}
              </div>
              <div className="text-xs text-muted-foreground">
                {route.discipline === "lead" ? "Vorstieg" : "Toprope"} · {route.color ?? "Farbe fehlt"} ·{" "}
                {route.setter ?? "Routenschrauber fehlt"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={editingRoute?.id === route.id} onOpenChange={(open) => !open && setEditingRoute(null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(route)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Route bearbeiten</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="editDiscipline">Disziplin</Label>
                        <select
                          id="editDiscipline"
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={form.discipline}
                          onChange={(e) => setForm({ ...form, discipline: e.target.value })}
                        >
                          <option value="toprope">Toprope</option>
                          <option value="lead">Vorstieg</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editCode">Code</Label>
                        <Input
                          id="editCode"
                          value={form.code}
                          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                          placeholder="T1 / V1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editName">Name</Label>
                        <Input
                          id="editName"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editSetter">Routenschrauber</Label>
                        <Input
                          id="editSetter"
                          value={form.setter}
                          onChange={(e) => setForm({ ...form, setter: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editColor">Farbe</Label>
                        <Input
                          id="editColor"
                          value={form.color}
                          onChange={(e) => setForm({ ...form, color: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editActive">Status</Label>
                        <select
                          id="editActive"
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={form.active ? "active" : "inactive"}
                          onChange={(e) => setForm({ ...form, active: e.target.value === "active" })}
                        >
                          <option value="active">Aktiv</option>
                          <option value="inactive">Inaktiv</option>
                        </select>
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
              <Button
                variant={route.active ? "secondary" : "outline"}
                size="sm"
                onClick={() => toggleActive(route)}
              >
                <span className="skew-x-6">{route.active ? "Aktiv" : "Inaktiv"}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(route.id)}>
                <span className="skew-x-6">Löschen</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GymRoutesAdmin;
