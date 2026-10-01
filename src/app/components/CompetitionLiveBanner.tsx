import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSeasonSettings } from "@/services/seasonSettings";
import { activeNotices } from "@/lib/competitionPresentation";
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
  const [official, setOfficial] = useState(false);
  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setNotices([]);
    setHasFinal(false);
    setOfficial(false);
    if (!season) return;
    let active = true;
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      const [data, final] = await Promise.allSettled([
        getLiveCompetition(season),
        getPublicFinal(season),
      ]);
      if (active) {
        if (data.status === "fulfilled") setNotices(data.value.notices);
        if (final.status === "fulfilled") {
          setHasFinal(final.value.length > 0);
          setOfficial(
            final.value.length > 0 &&
              final.value.every((item) => item.phase === "final"),
          );
        }
      }
      pending = false;
    };
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [season]);
  const visibleNotices = activeNotices(notices, "app", time);
  if (!visibleNotices.length && !hasFinal) return null;
  return (
    <div className="mb-5 space-y-2" aria-live="polite">
      <CompetitionNoticeList notices={visibleNotices} />
      {hasFinal && (
        <Link
          to="/app/wettkampf/rangliste"
          className="block rounded-xl bg-[#003d55] p-4 text-sm font-bold text-[#f2dcab] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]"
        >
          {official
            ? "Finale · offizielle Ergebnisse ansehen"
            : "Finale · vorläufige Live-Wertung ansehen"}
        </Link>
      )}
    </div>
  );
}

export function CompetitionNoticeList({ notices }: { notices: LiveNotice[] }) {
  return (
    <div className="space-y-2" aria-live="polite">
      {notices.map((notice) => (
        <aside
          key={notice.id}
          className="rounded-xl border border-[#f2dcab]/40 bg-[#a15523] p-4 text-white"
        >
          <strong className="block text-base">{notice.title}</strong>
          <p className="mt-1 text-sm">{notice.body}</p>
        </aside>
      ))}
    </div>
  );
}
