import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSeasonSettings } from "@/services/seasonSettings";
import {
  getLiveCompetition,
  getPublicFinal,
  type LiveNotice,
} from "@/services/competitionFinal";

export function CompetitionLiveBanner() {
  const { settings } = useSeasonSettings();
  const season = settings?.season_year?.trim();
  const [notices, setNotices] = useState<LiveNotice[]>([]);
  const [hasFinal, setHasFinal] = useState(false);
  useEffect(() => {
    if (!season) return;
    let active = true;
    const load = () =>
      Promise.all([getLiveCompetition(season), getPublicFinal(season)])
        .then(([data, final]) => {
          if (active) {
            setNotices(data.notices.filter((n) => n.show_app));
            setHasFinal(final.length > 0);
          }
        })
        .catch(() => {});
    void load();
    const id = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [season]);
  if (!notices.length && !hasFinal) return null;
  return (
    <div className="mb-5 space-y-2" aria-live="polite">
      {notices.map((notice) => (
        <aside
          key={notice.id}
          className="rounded-xl border border-[#f2dcab]/40 bg-[#a15523] p-4 text-white"
        >
          <strong className="block text-base">{notice.title}</strong>
          <p className="mt-1 text-sm">{notice.body}</p>
        </aside>
      ))}
      {hasFinal && (
        <Link
          to="/app/wettkampf/rangliste#finale"
          className="block rounded-xl bg-[#003d55] p-4 text-sm font-bold text-[#f2dcab] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]"
        >
          Finale · vorläufige Live-Wertung ansehen
        </Link>
      )}
    </div>
  );
}
