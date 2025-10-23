export interface ThemeColorOption {
  id: string;
  label: string;
  gradient: string;
}

export const themeColors: ThemeColorOption[] = [
  {
    id: "aurora",
    label: "Aurora",
    gradient: "linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #a1c4fd 100%)",
  },
  {
    id: "sunset",
    label: "Sunset",
    gradient: "linear-gradient(135deg, #ff512f 0%, #dd2476 50%, #24c6dc 100%)",
  },
  {
    id: "forest",
    label: "Forest",
    gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 50%, #57c1eb 100%)",
  },
  {
    id: "dawn",
    label: "Dawn",
    gradient: "linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #f9c1d9 100%)",
  },
  {
    id: "twilight",
    label: "Twilight",
    gradient: "linear-gradient(135deg, #654ea3 0%, #eaafc8 50%, #fbc2eb 100%)",
  },
  {
    id: "ocean",
    label: "Ocean",
    gradient: "linear-gradient(135deg, #00c6ff 0%, #0072ff 50%, #00f2fe 100%)",
  },
  {
    id: "ember",
    label: "Ember",
    gradient: "linear-gradient(135deg, #f83600 0%, #f9d423 50%, #ff9a9e 100%)",
  },
  {
    id: "galaxy",
    label: "Galaxy",
    gradient: "linear-gradient(135deg, #20002c 0%, #cbb4d4 50%, #6a0572 100%)",
  },
  {
    id: "mint",
    label: "Mint",
    gradient: "linear-gradient(135deg, #b2fefa 0%, #0ed2f7 50%, #5ee7df 100%)",
  },
  {
    id: "flamingo",
    label: "Flamingo",
    gradient: "linear-gradient(135deg, #f77062 0%, #fe5196 50%, #ff9a9e 100%)",
  },
];

export const DEFAULT_THEME_GRADIENT = themeColors[0].gradient;
