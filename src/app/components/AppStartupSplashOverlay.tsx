import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppStartupLoadingState } from "@/app/components/AppStartupLoadingState";
import {
  APP_STARTUP_SPLASH_MIN_DURATION_MS,
  shouldShowAppStartupSplash,
} from "@/app/startup/appStartupSplash";

export const AppStartupSplashOverlay = () => {
  const location = useLocation();
  const [visible, setVisible] = useState(() => shouldShowAppStartupSplash(location.pathname));
  const [hasTriggered, setHasTriggered] = useState(() =>
    shouldShowAppStartupSplash(location.pathname),
  );

  useEffect(() => {
    if (!visible && !hasTriggered && shouldShowAppStartupSplash(location.pathname)) {
      setHasTriggered(true);
      setVisible(true);
    }
  }, [hasTriggered, location.pathname, visible]);

  useEffect(() => {
    if (!visible) return;

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, APP_STARTUP_SPLASH_MIN_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <AppStartupLoadingState
        title="App wird geladen"
        description="Wir bauen den Teilnehmerbereich gerade fuer dich auf."
      />
    </div>
  );
};
