import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const upsertMeta = (selector: string, attributes: Record<string, string>) => {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element!.setAttribute(key, value);
  });
};

export const AppIndexability = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.pathname.startsWith("/app")) {
      return;
    }

    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: "noindex, nofollow",
    });
  }, [location.pathname]);

  return null;
};
