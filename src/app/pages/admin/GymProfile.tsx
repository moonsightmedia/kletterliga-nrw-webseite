import { useEffect, useState, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGymAdminsByProfile, getGym, updateGym } from "@/services/appApi";
import { resizeImageFile } from "@/lib/imageProcessing";
import { supabase } from "@/services/supabase";
import type { Gym } from "@/services/appTypes";
import { StitchButton, StitchCard, StitchTextField } from "@/app/components/StitchPrimitives";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";

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
    postal_code: "",
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
            postal_code: gymData.postal_code ?? "",
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

  const handleLogoUpload = async (file: File) => {
    if (!gymId) return;
    setUploadingLogo(true);
    try {
      const optimized = await resizeImageFile(file, {
        maxSize: 800,
        quality: 0.85,
        preserveTransparency: true,
      });
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
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Ein unerwarteter Fehler ist aufgetreten.",
      });
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
        postal_code: form.postal_code?.trim() || null,
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
          description: errorMessage || "Die Hallen-Daten konnten nicht gespeichert werden.",
        });
        return;
      }
      if (data) {
        toast({ title: "Gespeichert", description: "Hallen-Daten wurden aktualisiert." });
      } else {
        console.error("Update returned no data");
        toast({
          title: "Fehler",
          description: "Die Hallen-Daten konnten nicht gespeichert werden. Keine Daten zurückgegeben.",
        });
      }
    } catch (err) {
      console.error("Update exception:", err);
      toast({ title: "Fehler", description: err instanceof Error ? err.message : "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[rgba(27,28,26,0.64)]">Lade…</p>;
  }

  if (!gymId) {
    return <p className="text-sm text-[rgba(27,28,26,0.64)]">Keine Halle zugewiesen.</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Halle" title="Hallenprofil" description="Daten deiner Halle bearbeiten." />

      <StitchCard tone="surface" className="space-y-4 p-4 md:p-5">
        <div className="space-y-2">
          <span className="stitch-kicker text-[rgba(0,38,55,0.6)]">Hallen-Logo</span>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <button
                type="button"
                className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border-2 border-[rgba(0,38,55,0.14)] bg-transparent ${
                  uploadingLogo ? "opacity-70" : "cursor-pointer hover:border-[#003d55]"
                } ${!logoPreview ? "bg-[rgba(0,61,85,0.06)]" : ""}`}
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Hallen-Logo" className="h-full w-full object-contain" />
                ) : (
                  <div className="p-2 text-center text-xs text-[rgba(27,28,26,0.55)]">Logo hochladen</div>
                )}
              </button>
              {uploadingLogo ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs text-[rgba(27,28,26,0.64)]">
                  Lädt…
                </div>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[rgba(27,28,26,0.64)] break-words">
                Klicke auf das Logo, um ein neues Bild hochzuladen. Empfohlene Größe: 800×800px
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StitchTextField
            label="Name *"
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Kletterhalle NRW"
          />
          <StitchTextField
            label="Stadt"
            id="city"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Düsseldorf"
          />
          <StitchTextField
            label="PLZ"
            id="postal_code"
            value={form.postal_code}
            onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
            placeholder="z. B. 45127"
          />
        </div>

        <StitchTextField
          label="Adresse"
          id="address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Musterstraße 12"
        />

        <StitchTextField
          label="Webseite"
          id="website"
          type="url"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="https://…"
        />

        <StitchTextField
          label="Öffnungszeiten"
          id="opening_hours"
          value={form.opening_hours}
          onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
          placeholder="z. B. Mo–So: 9–22 Uhr"
          hint='Beispiel: "Mo–Fr: 9–22 Uhr, Sa–So: 10–20 Uhr" oder "Mo–So: 9–22 Uhr"'
        />

        <div className="flex justify-end pt-2">
          <StitchButton
            type="button"
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="w-full touch-manipulation md:w-auto"
          >
            {saving ? "Speichern…" : "Speichern"}
          </StitchButton>
        </div>
      </StitchCard>
    </div>
  );
};

export default GymProfile;
