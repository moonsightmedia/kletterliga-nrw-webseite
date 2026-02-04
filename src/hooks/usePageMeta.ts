import { useEffect } from "react";

type PageMetaOptions = {
  title: string;
  description?: string;
  canonicalPath?: string;
  image?: string;
  noindex?: boolean;
};

const SITE_NAME = "Kletterliga NRW";
const DEFAULT_IMAGE = "https://kletterliga-nrw.de/og-image.jpg";

const upsertMeta = (
  selector: string,
  attributes: Record<string, string>,
) => {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => {
      element!.setAttribute(key, value);
    });
    document.head.appendChild(element);
  } else {
    Object.entries(attributes).forEach(([key, value]) => {
      element!.setAttribute(key, value);
    });
  }
};

const upsertLink = (rel: string, href: string) => {
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
};

export const usePageMeta = ({
  title,
  description,
  canonicalPath,
  image,
  noindex,
}: PageMetaOptions) => {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME)
      ? title
      : `${title} – ${SITE_NAME}`;
    document.title = fullTitle;

    if (description) {
      upsertMeta('meta[name="description"]', {
        name: "description",
        content: description,
      });
      upsertMeta('meta[property="og:description"]', {
        property: "og:description",
        content: description,
      });
      upsertMeta('meta[name="twitter:description"]', {
        name: "twitter:description",
        content: description,
      });
    }

    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: fullTitle,
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: fullTitle,
    });

    const resolvedImage = image || DEFAULT_IMAGE;
    upsertMeta('meta[property="og:image"]', {
      property: "og:image",
      content: resolvedImage,
    });
    upsertMeta('meta[name="twitter:image"]', {
      name: "twitter:image",
      content: resolvedImage,
    });

    if (canonicalPath) {
      const canonicalUrl = new URL(canonicalPath, window.location.origin).toString();
      upsertLink("canonical", canonicalUrl);
      upsertMeta('meta[property="og:url"]', {
        property: "og:url",
        content: canonicalUrl,
      });
      upsertMeta('meta[name="twitter:url"]', {
        name: "twitter:url",
        content: canonicalUrl,
      });
    }

    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: noindex ? "noindex, nofollow" : "index, follow",
    });
  }, [title, description, canonicalPath, image, noindex]);
};
