import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CompetitionLiveView from "@/app/components/CompetitionLiveView";
import { getLiveCompetition, type LiveData } from "@/services/competitionFinal";

export default function LiveScreen() {
  const { season } = useParams();
  const [data, setData] = useState<LiveData | null>(null);
  const [lastSuccess, setLastSuccess] = useState<Date | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    setData(null);
    setLastSuccess(null);
    setOffline(false);
    if (!season) return;
    let active = true;
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const next = await getLiveCompetition(season);
        if (active) {
          setData(next);
          setLastSuccess(new Date());
          setOffline(false);
        }
      } catch {
        if (active) setOffline(true);
      } finally {
        pending = false;
      }
    };
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5000);
    const resume = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", resume);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [season]);
  return (
    <CompetitionLiveView
      data={data}
      season={season ?? ""}
      lastSuccess={lastSuccess}
      offline={offline}
    />
  );
}
