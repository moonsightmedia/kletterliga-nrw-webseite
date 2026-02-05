import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/app/auth/AuthProvider";

const Login = () => {
  const { signIn, profile, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Prüfe auf confirmed Parameter
  useEffect(() => {
    const confirmedParam = searchParams.get("confirmed");
    if (confirmedParam === "true") {
      setConfirmed(true);
      // Entferne den Parameter aus der URL
      navigate("/app/login", { replace: true });
    }
  }, [searchParams, navigate]);

  // Redirect nach Login basierend auf Rolle
  useEffect(() => {
    if (!authLoading && profile) {
      if (role === "gym_admin") {
        navigate("/app/admin/gym", { replace: true });
      } else if (role === "league_admin") {
        navigate("/app/admin/league", { replace: true });
      }
    }
  }, [profile, role, authLoading, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      // Warte auf Profil-Load, dann navigiere basierend auf Rolle
      // Die Navigation wird durch useEffect gehandhabt, sobald das Profil geladen ist
      // Falls nach 2 Sekunden kein Profil geladen ist, navigiere zu /app
      setTimeout(() => {
        if (role === "gym_admin") {
          navigate("/app/admin/gym", { replace: true });
        } else if (role === "league_admin") {
          navigate("/app/admin/league", { replace: true });
        } else {
          navigate("/app", { replace: true });
        }
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Einloggen</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Zugriff auf deine persönliche Liga-App.
        </p>
      </div>
      {confirmed && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Deine E-Mail-Adresse wurde erfolgreich bestätigt! Du kannst dich jetzt einloggen.
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Einloggen..." : "Einloggen"}
        </Button>
      </form>
      <div className="text-sm text-muted-foreground">
        Noch kein Account?{" "}
        <Link to="/app/register" className="text-primary underline-offset-4 hover:underline">
          Jetzt registrieren
        </Link>
      </div>
    </div>
  );
};

export default Login;
