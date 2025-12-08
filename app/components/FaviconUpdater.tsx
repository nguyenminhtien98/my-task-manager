"use client";

import { useEffect, useContext } from "react";
import { ProjectContext } from "@/app/context/ProjectContext";
import { createBrandOrbSvg, svgToDataUrl } from "@/app/utils/logoSvg";

const FaviconUpdater = () => {
  const projectContext = useContext(ProjectContext);
  const currentProject = projectContext?.currentProject ?? null;

  useEffect(() => {
    const svg = createBrandOrbSvg(currentProject?.themeColor);
    const dataUrl = svgToDataUrl(svg);

    const updateOrCreateLink = (rel: string) => {
      const linkElements = document.querySelectorAll<HTMLLinkElement>(
        `link[rel="${rel}"]`
      );

      if (linkElements.length > 0) {
        linkElements.forEach((link) => {
          link.type = "image/svg+xml";
          link.href = dataUrl;
        });
        return;
      }

      const link = document.createElement("link");
      link.rel = rel;
      link.type = "image/svg+xml";
      link.href = dataUrl;
      document.head.appendChild(link);
    };

    ["icon", "shortcut icon", "apple-touch-icon"].forEach(updateOrCreateLink);

    const metaTag = document.querySelector<HTMLMetaElement>(
      'meta[name="brand-orb-svg"]'
    );
    if (metaTag) {
      metaTag.content = svg;
    }
  }, [currentProject?.themeColor]);

  return null;
};

export default FaviconUpdater;
