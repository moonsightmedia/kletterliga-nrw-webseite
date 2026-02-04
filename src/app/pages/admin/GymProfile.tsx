import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGymAdminsByProfile, getGym, updateGym } from "@/services/appApi";
import { supabase } from "@/services/supabase";
import type { Gym } from "@/services/appTypes";

const GymProfile = () => {
  const { profile } = useAuth();
  const [gymId, setGymId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    website: "",
    opening_hours: "",
  });

  useEffect(() => {
    if (!profile?.id) return;
    listGymAdminsByProfile(profile.id).then(({ data }) => {
      const firstGym = data?.[0]?.gym_id ?? null;
      setGymId(firstGym);
      if (firstGym) {
        getGym(firstGym).then(({ data: gymData, error }) => {
          setLoading(false);
          if (error || !gymData) {
            toast({ title: "Fehler", description: "Hallen-Daten konnten nicht geladen werden." });
            return;
          }
          setForm({
            name: gymData.name ?? "",
            city: gymData.city ?? "",
            address: gymData.address ?? "",
            website: gymData.website ?? "",
            opening_hours: gymData.opening_hours ?? "",
          });
          setLogoPreview(gymData.logo_url ?? null);
        });
      } else {
        setLoading(false);
      }
    });
  }, [profile?.id]);

  const resizeImage = (file: File, maxSize = 800, quality = 0.85) =>
    new Promise<Blob>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not available"));
          return;
        }
        // Transparenz erhalten - Canvas transparent machen
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // PNG verwenden für Transparenz, sonst JPEG
        const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
        const mimeType = isPng ? "image/png" : "image/jpeg";
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Bild konnte nicht verarbeitet werden"));
              return;
            }
            resolve(blob);
          },
          mimeType,
          isPng ? undefined : quality
        );
      };
      img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
      img.src = URL.createObjectURL(file);
    });

  const handleLogoUpload = async (file: File) => {
    if (!gymId) return;
    setUploadingLogo(true);
    try {
      const optimized = await resizeImage(file, 800, 0.85);
      const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
      const extension = isPng ? "png" : "jpg";
      const filePath = `gyms/${gymId}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, optimized, {
        contentType: isPng ? "image/png" : "image/jpeg",
        cacheControl: "3600",
        upsert: true,
      });
      if (uploadError) {
        setUploadingLogo(false);
        toast({
          title: "Upload fehlgeschlagen",
          description: uploadError.message || "Bitte Bucket & Rechte prüfen.",
        });
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setLogoPreview(data.publicUrl);
      setUploadingLogo(false);
      
      // Speichere Logo-URL direkt
      const { error: updateError } = await updateGym(gymId, {
        logo_url: data.publicUrl,
      });
      if (updateError) {
        toast({ title: "Logo speichern fehlgeschlagen", description: updateError.message });
        return;
      }
      toast({ title: "Logo aktualisiert", description: "Das Hallen-Logo wurde gespeichert." });
    } catch (err) {
      setUploadingLogo(false);
      toast({ title: "Fehler", description: err instanceof Error ? err.message : "Ein unerwarteter Fehler ist aufgetreten." });
    }
  };

  const handleSave = async () => {
    if (!gymId) {
      toast({ title: "Fehler", description: "Keine Halle zugewiesen." });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await updateGym(gymId, {
        name: form.name || null,
        city: form.city || null,
        address: form.address || null,
        website: form.website || null,
        opening_hours: form.opening_hours || null,
        logo_url: logoPreview || null,
      });
      if (error) {
        console.error("Update error:", error);
        const errorMessage = error.message || error.details || JSON.stringify(error);
        toast({ 
          title: "Fehler", 
          description: errorMessage || "Die Hallen-Daten konnten nicht gespeichert werden." 
        });
        return;
      }
      if (data) {
        toast({ title: "Gespeichert", description: "Hallen-Daten wurden aktualisiert." });
      } else {
        console.error("Update returned no data");
        toast({ title: "Fehler", description: "Die Hallen-Daten konnten nicht gespeichert werden. Keine Daten zurückgegeben." });
      }
    } catch (err) {
      console.error("Update exception:", err);
      toast({ title: "Fehler", description: err instanceof Error ? err.message : "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Lade...</div>;
  }

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">Keine Halle zugewiesen.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-primary">Hallenprofil</h1>
        <p className="text-sm text-muted-foreground mt-2">Daten deiner Halle bearbeiten.</p>
      </div>
      <Card className="p-4 md:p-5 border-border/60 space-y-4">
        <div className="space-y-2">
          <Label>Hallen-Logo</Label>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                type="button"
                className={`h-24 w-24 overflow-hidden rounded-lg border-2 border-border bg-transparent flex items-center justify-center ${
                  uploadingLogo ? "opacity-70" : "hover:border-primary cursor-pointer"
                } ${!logoPreview ? "bg-muted" : ""}`}
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Hallen-Logo" className="h-full w-full object-contain" />
                ) : (
                  <div className="text-xs text-muted-foreground text-center p-2">Logo hochladen</div>
                )}
              </button>
              {uploadingLogo && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-xs text-muted-foreground">
                  Lädt...
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Klicke auf das Logo, um ein neues Bild hochzuladen. Empfohlene Größe: 800x800px
              </p>
            </div>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleLogoUpload(file);
            }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Kletterhalle NRW"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Stadt</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Düsseldorf"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Adresse</Label>
          <Input
            id="address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Musterstraße 12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Webseite</Label>
          <Input
            id="website"
            type="url"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="opening_hours">Öffnungszeiten</Label>
          <Input
            id="opening_hours"
            value={form.opening_hours}
            onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
            placeholder="z. B. Mo-So: 9-22 Uhr"
          />
          <p className="text-xs text-muted-foreground">
            Beispiel: "Mo-Fr: 9-22 Uhr, Sa-So: 10-20 Uhr" oder "Mo-So: 9-22 Uhr"
          </p>
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full md:w-auto touch-manipulation">
            <span className="skew-x-6">{saving ? "Speichern..." : "Speichern"}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default GymProfile;
