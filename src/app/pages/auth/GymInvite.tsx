import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/services/supabase";
import { Building2, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";

const GymInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    website: "",
    password: "",
    passwordConfirm: "",
  });

  useEffect(() => {
    if (!token) {
      toast({ title: "Fehler", description: "Kein Token gefunden." });
      navigate("/app/login");
      return;
    }

    // Load invite data
    const loadInvite = async () => {
      try {
        // Use fetch directly to ensure proper headers
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(
          `${supabaseUrl}/rest/v1/gym_invites?select=email,expires_at,used_at&token=eq.${encodeURIComponent(token)}`,
          {
            method: "GET",
            headers: {
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${supabaseAnonKey}`,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.error("Failed to load invite:", response.status, response.statusText);
          let errorText = "";
          try {
            const errorData = await response.json();
            errorText = errorData.message || errorData.error || "";
          } catch {
            errorText = response.statusText;
          }
          
          if (response.status === 406) {
            toast({
              title: "Fehler beim Laden",
              description: "Die Einladung konnte nicht geladen werden. Bitte kontaktiere einen Liga-Admin. (Fehler: RLS-Policy nicht konfiguriert)",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Ungültiger Link",
              description: `Der Einladungslink ist ungültig oder abgelaufen. (Status: ${response.status})`,
              variant: "destructive",
            });
          }
          navigate("/app/login");
          return;
        }

        const data = await response.json();
        const invite = Array.isArray(data) ? data[0] : data;

        if (!invite) {
          console.error("No invite data returned:", data);
          toast({
            title: "Ungültiger Link",
            description: "Der Einladungslink ist ungültig oder abgelaufen.",
            variant: "destructive",
          });
          navigate("/app/login");
          return;
        }

        if (invite.used_at) {
          toast({
            title: "Link bereits verwendet",
            description: "Dieser Einladungslink wurde bereits verwendet.",
          });
          navigate("/app/login");
          return;
        }

        const expiresAt = new Date(invite.expires_at);
        if (new Date() > expiresAt) {
          toast({
            title: "Link abgelaufen",
            description: "Der Einladungslink ist abgelaufen. Bitte kontaktiere einen Liga-Admin.",
          });
          navigate("/app/login");
          return;
        }

        setInviteEmail(invite.email);
        setLoading(false);
      } catch (error) {
        toast({
          title: "Fehler",
          description: "Fehler beim Laden der Einladung.",
        });
        navigate("/app/login");
      }
    };

    loadInvite();
  }, [token, navigate]);

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
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
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

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Ungültiges Format",
        description: "Bitte wähle eine Bilddatei aus.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: "Das Logo darf maximal 5 MB groß sein.",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const optimized = await resizeImage(file, 800, 0.85);
      const previewUrl = URL.createObjectURL(optimized);
      setLogoPreview(previewUrl);
      setLogoFile(file);
      setUploadingLogo(false);
    } catch (error) {
      setUploadingLogo(false);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Bild konnte nicht verarbeitet werden.",
      });
    }
  };

  const handleRemoveLogo = () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(null);
    setLogoFile(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.password) {
      toast({
        title: "Fehlende Angaben",
        description: "Bitte fülle alle Pflichtfelder aus.",
      });
      return;
    }

    if (form.password !== form.passwordConfirm) {
      toast({
        title: "Passwörter stimmen nicht überein",
        description: "Bitte überprüfe deine Passwort-Eingabe.",
      });
      return;
    }

    if (form.password.length < 6) {
      toast({
        title: "Passwort zu kurz",
        description: "Das Passwort muss mindestens 6 Zeichen lang sein.",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Convert logo to base64 if present
      let logoBase64: string | null = null;
      if (logoFile) {
        try {
          const optimized = await resizeImage(logoFile, 800, 0.85);
          const blob = optimized;
          logoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") {
                resolve(reader.result);
              } else {
                reject(new Error("Failed to convert logo"));
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error("Logo conversion error:", error);
          // Continue without logo if conversion fails
        }
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Use fetch directly for better error handling
      const response = await fetch(`${supabaseUrl}/functions/v1/complete-gym-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          token,
          password: form.password,
          gym: {
            name: form.name,
            city: form.city || null,
            address: form.address || null,
            website: form.website || null,
            logo_base64: logoBase64,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Complete gym invite error:", data);
        const errorMessage = data?.error || `HTTP ${response.status}: ${response.statusText}`;
        toast({
          title: "Fehler",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (!data?.success) {
        const errorMessage = data?.error || "Unbekannter Fehler";
        toast({
          title: "Fehler",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Erfolgreich registriert!",
        description: "Deine Halle wurde erstellt. Du kannst dich jetzt anmelden.",
        variant: "success",
      });

      // Redirect to login
      navigate("/app/login", { state: { email: inviteEmail } });
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Registrierung fehlgeschlagen.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 w-full max-w-md">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Lade Einladung...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-8 md:py-12">
      <Card className="w-full max-w-2xl p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-headline text-primary">Halle registrieren</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
              Einladung für: <span className="font-medium">{inviteEmail}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {/* Hallenname - Volle Breite */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Hallenname <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="z. B. Kletterhalle Ruhr"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full h-11"
            />
          </div>

          {/* Stadt und Adresse - Mobile: gestapelt, Desktop: nebeneinander */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium">Stadt</Label>
              <Input
                id="city"
                placeholder="z. B. Essen"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full h-11"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address" className="text-sm font-medium">Adresse</Label>
              <Input
                id="address"
                placeholder="z. B. Hauptstraße 123"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full h-11"
              />
            </div>
          </div>

          {/* Webseite */}
          <div className="space-y-2">
            <Label htmlFor="website">Webseite</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://example.com"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full"
            />
          </div>

          {/* Logo - Volle Breite für besseres Layout */}
          <div className="space-y-2">
            <Label htmlFor="logo">Logo</Label>
            <input
              ref={logoInputRef}
              id="logo"
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="hidden"
            />
            {logoPreview ? (
              <div className="relative">
                <div className="relative w-full h-40 sm:h-48 border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted/50">
                  <img
                    src={logoPreview}
                    alt="Logo Vorschau"
                    className="w-full h-full object-contain p-4"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute top-2 right-2 p-2 rounded-full bg-background/90 backdrop-blur-sm border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-sm"
                    aria-label="Logo entfernen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="w-full h-40 sm:h-48 flex flex-col items-center justify-center gap-3 border-2 border-dashed hover:border-primary/50 transition-colors bg-muted/30 hover:bg-muted/50"
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Wird verarbeitet...</span>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Logo hochladen</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG (max. 5 MB)</p>
                    </div>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Passwort-Felder */}
          <div className="pt-5 border-t border-border space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Passwort <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mindestens 6 Zeichen"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                className="w-full h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm" className="text-sm font-medium">
                Passwort bestätigen <span className="text-destructive">*</span>
              </Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="Passwort wiederholen"
                value={form.passwordConfirm}
                onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                required
                minLength={6}
                className="w-full h-11"
              />
            </div>
          </div>

          {/* Buttons - Mobile: gestapelt, Desktop: nebeneinander */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button 
              type="submit" 
              disabled={submitting || uploadingLogo} 
              className="flex-1 h-11 text-base font-medium"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registriere...
                </>
              ) : (
                "Halle registrieren"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/app/login")}
              disabled={submitting || uploadingLogo}
              className="sm:w-auto h-11"
            >
              Abbrechen
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default GymInvite;
