export type ElementType = "Frame" | "TextLabel" | "TextButton" | "ImageLabel" | "ImageButton";
export type ScaleType = "Stretch" | "Fit" | "Crop";

export type UIElement = {
  id: string;
  type: ElementType;
  name: string;
  // Position et taille en Scale (0 à 1, relatif à l'écran)
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // degrés
  color: string;
  transparency: number; // BackgroundTransparency (0 = opaque, 1 = invisible)
  // Texte
  text: string;
  textColor: string;
  font: string; // nom de Enum.Font
  textScaled: boolean;
  textSize: number;
  // Coins / bordure / dégradé
  radius: number; // UICorner en pixels Roblox (0 = aucun)
  strokeThickness: number; // UIStroke (0 = aucun)
  strokeColor: string;
  gradient: boolean; // UIGradient
  gradientColor: string;
  gradientRotation: number;
  // Image
  image: string; // aperçu dans l'éditeur (URL ou data URL)
  assetId: string; // ID Roblox (chiffres) utilisé dans le code
  scaleType: ScaleType;
};

export type DeviceId = "pc" | "tablet" | "mobile";

export type Project = {
  id: string;
  name: string;
  device: DeviceId;
  elements: UIElement[];
  updatedAt: number;
};

export const DEVICES: Record<DeviceId, { label: string; ratio: number }> = {
  pc: { label: "PC 16:9", ratio: 16 / 9 },
  tablet: { label: "Tablette 4:3", ratio: 4 / 3 },
  mobile: { label: "Mobile 9:16", ratio: 9 / 16 },
};

export const TEXT_TYPES: ElementType[] = ["TextLabel", "TextButton"];
export const IMAGE_TYPES: ElementType[] = ["ImageLabel", "ImageButton"];

export const FONTS = [
  "GothamBold",
  "Gotham",
  "GothamMedium",
  "GothamBlack",
  "SourceSans",
  "SourceSansBold",
  "Arial",
  "ArialBold",
  "FredokaOne",
  "LuckiestGuy",
  "Bangers",
  "PermanentMarker",
  "Oswald",
  "Roboto",
  "RobotoMono",
  "Code",
  "SciFi",
  "Arcade",
  "Cartoon",
  "Fantasy",
];

export const ELEMENT_DEFAULTS: Omit<UIElement, "id" | "type" | "name"> = {
  x: 0.35,
  y: 0.35,
  w: 0.3,
  h: 0.3,
  rotation: 0,
  color: "#2d2d3a",
  transparency: 0,
  text: "",
  textColor: "#ffffff",
  font: "GothamBold",
  textScaled: true,
  textSize: 24,
  radius: 0,
  strokeThickness: 0,
  strokeColor: "#ffffff",
  gradient: false,
  gradientColor: "#00c4cc",
  gradientRotation: 90,
  image: "",
  assetId: "",
  scaleType: "Stretch",
};
