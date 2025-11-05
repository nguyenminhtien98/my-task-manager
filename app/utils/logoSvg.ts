import { DEFAULT_THEME_GRADIENT } from "./themeColors";

const DEFAULT_FILL = "#6d28d9";
const DEFAULT_GRADIENT_FROM = "#E9D5FF";
const DEFAULT_GRADIENT_TO = "#A78BFA";

type GradientStop = {
  color: string;
  offset: number;
};

export type FillConfig =
  | {
      type: "solid";
      solid: string;
    }
  | {
      type: "gradient";
      stops: GradientStop[];
    };

const DEFAULT_STOPS: GradientStop[] = [
  { color: DEFAULT_GRADIENT_FROM, offset: 0 },
  { color: DEFAULT_GRADIENT_TO, offset: 1 },
];

const clampOffset = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 1;
  return value / 100;
};

export const getFillConfig = (background?: string | null): FillConfig => {
  if (!background) {
    const normalized = DEFAULT_THEME_GRADIENT.trim();
    const matches = Array.from(
      normalized.matchAll(/#([0-9a-f]{3,8})(?:\s+([0-9]{1,3})%)?/gi)
    );
    if (matches.length > 0) {
      const stops: GradientStop[] = matches.map((match) => {
        const color = `#${match[1]}`;
        const rawOffset = match[2];
        const offset =
          rawOffset !== undefined ? clampOffset(parseFloat(rawOffset)) : 0;
        return { color, offset };
      });
      stops.sort((a, b) => a.offset - b.offset);
      return { type: "gradient", stops };
    }
    return { type: "gradient", stops: DEFAULT_STOPS };
  }

  const normalized = background.trim();
  if (!normalized.toLowerCase().includes("gradient")) {
    return {
      type: "solid",
      solid: normalized || DEFAULT_FILL,
    };
  }

  const matches = Array.from(
    normalized.matchAll(/#([0-9a-f]{3,8})(?:\s+([0-9]{1,3})%)?/gi)
  );

  if (!matches.length) {
    return { type: "gradient", stops: DEFAULT_STOPS };
  }

  const stops: GradientStop[] = matches.map((match, index) => {
    const color = `#${match[1]}`;
    const rawOffset = match[2];

    if (rawOffset !== undefined) {
      return {
        color,
        offset: clampOffset(parseFloat(rawOffset)),
      };
    }

    const computed = matches.length === 1 ? 0 : index / (matches.length - 1);

    return {
      color,
      offset: computed,
    };
  });

  stops.sort((a, b) => a.offset - b.offset);

  return {
    type: "gradient",
    stops,
  };
};

export const createBrandOrbSvg = (
  background?: string | null,
  size = 100
): string => {
  const fillConfig = getFillConfig(background);
  const gradientId = "brand-orb-gradient";
  const shadowId = "brand-orb-shadow";

  const gradientDefs =
    fillConfig.type === "gradient"
      ? `<linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          ${fillConfig.stops
            .map(
              ({ color, offset }) =>
                `<stop offset="${Math.round(
                  offset * 100
                )}%" stop-color="${color}" />`
            )
            .join("")}
        </linearGradient>`
      : "";

  const fillAttr =
    fillConfig.type === "gradient" ? `url(#${gradientId})` : fillConfig.solid;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    ${gradientDefs}
    <filter id="${shadowId}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
      <feOffset dy="2" />
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.35" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <g filter="url(#${shadowId})">
    <rect x="8" y="32" width="22" height="48" rx="11" fill="${fillAttr}" />
    <rect x="39" y="8" width="22" height="84" rx="11" fill="${fillAttr}" />
    <rect x="70" y="18" width="22" height="60" rx="11" fill="${fillAttr}" />
  </g>
</svg>`.trim();
};

export const svgToDataUrl = (svg: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const DEFAULT_LOGO_SVG = createBrandOrbSvg();
export const DEFAULT_LOGO_DATA_URL = svgToDataUrl(DEFAULT_LOGO_SVG);
export const DEFAULT_LOGO_FILL = DEFAULT_FILL;
