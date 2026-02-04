import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGyms } from "@/services/appApi";
import type { Gym } from "@/services/appTypes";

const Register = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    birthDate: "",
    gender: "",
    homeGymId: "",
    league: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listGyms().then(({ data }) => setGyms(data ?? []));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signUp({
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      birthDate: form.birthDate || null,
      gender: (form.gender as "m" | "w") || null,
      homeGymId: form.homeGymId || null,
      league: (form.league as "toprope" | "lead") || null,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate("/app");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Registrieren</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Dein Einstieg in die Liga-Saison.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Vorname</Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Nachname</Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birthDate">Geburtsdatum</Label>
            <Input
              id="birthDate"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Wertungsklasse (m/w)</Label>
            <select
              id="gender"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              required
            >
              <option value="">Auswählen</option>
              <option value="w">Weiblich</option>
              <option value="m">Männlich</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Auswahl gemäß Wettkampf-Wertungsklassen (m/w).
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="league">Liga</Label>
          <select
            id="league"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.league}
            onChange={(e) => setForm({ ...form, league: e.target.value })}
            required
          >
            <option value="">Auswählen</option>
            <option value="toprope">Toprope</option>
            <option value="lead">Vorstieg</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="homeGym">Heimat-Halle (optional)</Label>
          <select
            id="homeGym"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.homeGymId}
            onChange={(e) => setForm({ ...form, homeGymId: e.target.value })}
          >
            <option value="">Keine Auswahl</option>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name} {gym.city ? `(${gym.city})` : ""}
              </option>
            ))}
          </select>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Registrieren..." : "Account erstellen"}
        </Button>
      </form>
      <div className="text-sm text-muted-foreground">
        Bereits registriert?{" "}
        <Link to="/app/login" className="text-primary underline-offset-4 hover:underline">
          Zum Login
        </Link>
      </div>
    </div>
  );
};

export default Register;
