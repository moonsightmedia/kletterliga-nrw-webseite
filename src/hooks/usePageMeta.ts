import { useEffect } from "react";

type StructuredData = Record<string, unknown> | Record<string, unknown>[];

type PageMetaOptions = {
  title: string;
  description?: string;
  canonicalPath?: string;
  image?: string;
  noindex?: boolean;
  ogType?: string;
  structuredData?: StructuredData;
};

const SITE_NAME = "Kletterliga NRW";
const DEFAULT_IMAGE = "https://kletterliga-nrw.de/og-image.png";

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

const upsertStructuredData = (data?: StructuredData) => {
  const selector = 'script[data-kl-schema="page"]';
  const existing = document.querySelector(selector);

  if (!data) {
    existing?.parentNode?.removeChild(existing);
    return;
  }

  const element = existing ?? document.createElement("script");
  element.setAttribute("type", "application/ld+json");
  element.setAttribute("data-kl-schema", "page");
  element.textContent = JSON.stringify(data);

  if (!existing) {
    document.head.appendChild(element);
  }
};

export const usePageMeta = ({
  title,
  description,
  canonicalPath,
  image,
  noindex,
  ogType,
  structuredData,
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
    upsertMeta('meta[property="og:type"]', {
      property: "og:type",
      content: ogType || "website",
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

    upsertStructuredData(structuredData);
  }, [title, description, canonicalPath, image, noindex, ogType, structuredData]);
};
