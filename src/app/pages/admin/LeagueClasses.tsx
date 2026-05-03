import { useEffect, useMemo, useState } from "react";
import { Award, Users, Info } from "lucide-react";
import { useSeasonSettings } from "@/services/seasonSettings";
import { listProfiles } from "@/services/appApi";
import type { Profile } from "@/services/appTypes";
import { StitchBadge, StitchCard } from "@/app/components/StitchPrimitives";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";

const LeagueClasses = () => {
  const { settings, getAgeU15Max, getAgeU40Min, getClassName } = useSeasonSettings();
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    listProfiles().then(({ data }) => {
      const participants = (data ?? []).filter((p) => p.role === "participant");
      setProfiles(participants);
    });
  }, []);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const allClasses = ["U15-m", "U15-w", "Ü15-m", "Ü15-w", "Ü40-m", "Ü40-w"];

    allClasses.forEach((cls) => {
      counts[cls] = 0;
    });

    profiles.forEach((profile) => {
      const className = getClassName(profile.birth_date, profile.gender);
      if (className && Object.prototype.hasOwnProperty.call(counts, className)) {
        counts[className]++;
      }
    });

    return counts;
  }, [profiles, getClassName]);

  const u15Max = getAgeU15Max();
  const u40Min = getAgeU40Min();
  const cutoffDate = settings?.age_cutoff_date || settings?.qualification_start || null;

  const classes = [
    {
      key: "U15",
      label: "U15",
      description: `Bis ${u15Max} Jahre`,
      ageRange: `≤ ${u15Max} Jahre`,
      classes: [
        { key: "U15-m", label: "U15 männlich", count: classCounts["U15-m"] || 0 },
        { key: "U15-w", label: "U15 weiblich", count: classCounts["U15-w"] || 0 },
      ],
    },
    {
      key: "Ü15",
      label: "Ü15",
      description: `${u15Max + 1}–${u40Min - 1} Jahre`,
      ageRange: `${u15Max + 1}–${u40Min - 1} Jahre`,
      classes: [
        { key: "Ü15-m", label: "Ü15 männlich", count: classCounts["Ü15-m"] || 0 },
        { key: "Ü15-w", label: "Ü15 weiblich", count: classCounts["Ü15-w"] || 0 },
      ],
    },
    {
      key: "Ü40",
      label: "Ü40",
      description: `Ab ${u40Min} Jahre`,
      ageRange: `≥ ${u40Min} Jahre`,
      classes: [
        { key: "Ü40-m", label: "Ü40 männlich", count: classCounts["Ü40-m"] || 0 },
        { key: "Ü40-w", label: "Ü40 weiblich", count: classCounts["Ü40-w"] || 0 },
      ],
    },
  ];

  const totalParticipants = Object.values(classCounts).reduce((sum, count) => sum + count, 0);
  const totalClasses = classes.reduce((sum, group) => sum + group.classes.length, 0);

  return (
    <div className="space-y-6">
      <StitchCard tone="navy" className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />
        <div className="relative p-4 md:p-6 lg:p-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[rgba(242,220,171,0.25)] bg-white/10 md:h-16 md:w-16">
              <Award className="h-6 w-6 text-[#f2dcab]/85 md:h-8 md:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="stitch-headline text-xl text-[#f2dcab] md:text-2xl lg:text-3xl">Wertungsklassen</h1>
                <StitchBadge tone="cream" className="shrink-0">
                  Liga
                </StitchBadge>
              </div>
              <p className="text-sm text-[rgba(242,220,171,0.88)] md:text-base">
                Übersicht der Wertungsklassen · {totalClasses} Klassen · {totalParticipants} Teilnehmer zugeordnet
              </p>
            </div>
          </div>
        </div>
      </StitchCard>

      <StitchCard tone="surface" className="p-4 md:p-6">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#003d55]" />
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="stitch-headline text-sm text-[#002637] md:text-base">Konfiguration</h3>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 md:grid-cols-3">
              <div>
                <span className="text-[rgba(27,28,26,0.55)]">U15 max Alter:</span>{" "}
                <span className="font-semibold text-[#002637]">{u15Max} Jahre</span>
              </div>
              <div>
                <span className="text-[rgba(27,28,26,0.55)]">Ü40 min Alter:</span>{" "}
                <span className="font-semibold text-[#002637]">{u40Min} Jahre</span>
              </div>
              <div>
                <span className="text-[rgba(27,28,26,0.55)]">Stichtag:</span>{" "}
                <span className="font-semibold text-[#002637]">
                  {cutoffDate ? new Date(cutoffDate).toLocaleDateString("de-DE") : "Nicht gesetzt"}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-[rgba(27,28,26,0.55)]">
              Die Altersgrenzen können in der Saisonverwaltung angepasst werden.
            </p>
          </div>
        </div>
      </StitchCard>

      <AdminPageHeader
        className="!mb-4"
        eyebrow="Übersicht"
        title="Hauptwertungsklassen"
        description="Finalrelevante Wertungsklassen und Teilnehmerzahlen."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 md:grid-cols-3">
        {classes.map((group) => (
          <StitchCard key={group.key} tone="muted" className="p-6 transition-shadow hover:shadow-[0_20px_44px_rgba(0,38,55,0.1)]">
            <div className="mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-[#003d55]" />
              <div>
                <h3 className="stitch-headline text-xl text-[#002637]">{group.label}</h3>
                <p className="text-xs text-[rgba(27,28,26,0.55)]">{group.ageRange}</p>
              </div>
            </div>
            <div className="space-y-3">
              {group.classes.map((cls) => (
                <div
                  key={cls.key}
                  className="flex items-center justify-between rounded-lg border border-[rgba(0,38,55,0.08)] bg-white/60 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[rgba(27,28,26,0.45)]" />
                    <span className="text-sm font-medium text-[#002637]">{cls.label}</span>
                  </div>
                  <StitchBadge tone="navy" className="shrink-0">
                    {cls.count} {cls.count === 1 ? "Teilnehmer" : "Teilnehmer"}
                  </StitchBadge>
                </div>
              ))}
              <div className="border-t border-[rgba(0,38,55,0.08)] pt-2 text-center text-xs text-[rgba(27,28,26,0.55)]">
                Gesamt: {group.classes.reduce((sum, c) => sum + c.count, 0)} Teilnehmer
              </div>
            </div>
          </StitchCard>
        ))}
      </div>

      <StitchCard tone="surface" className="p-6">
        <h3 className="stitch-headline mb-4 text-base text-[#002637]">Statistik</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-[rgba(0,61,85,0.06)] p-4 text-center">
            <div className="stitch-metric mb-1 text-3xl text-[#002637]">{totalClasses}</div>
            <div className="text-sm text-[rgba(27,28,26,0.55)]">Wertungsklassen</div>
          </div>
          <div className="rounded-lg bg-[rgba(0,61,85,0.06)] p-4 text-center">
            <div className="stitch-metric mb-1 text-3xl text-[#002637]">{totalParticipants}</div>
            <div className="text-sm text-[rgba(27,28,26,0.55)]">Teilnehmer zugeordnet</div>
          </div>
          <div className="rounded-lg bg-[rgba(0,61,85,0.06)] p-4 text-center">
            <div className="stitch-metric mb-1 text-3xl text-[#002637]">{profiles.length - totalParticipants}</div>
            <div className="text-sm text-[rgba(27,28,26,0.55)]">Ohne Zuordnung</div>
            <p className="mt-1 text-xs text-[rgba(27,28,26,0.5)]">(fehlende Geburtsdaten/Geschlecht)</p>
          </div>
        </div>
      </StitchCard>
    </div>
  );
};

export default LeagueClasses;
