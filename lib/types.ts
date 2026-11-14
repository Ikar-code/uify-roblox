export type ElementType = "Frame" | "TextLabel" | "TextButton" | "ImageLabel" | "ImageButton";
export type ScaleType = "Stretch" | "Fit" | "Crop";

export type UIElement = {
  id: string;
  type: ElementType;
  name: string;
  parentId: string | null; // null = directement sur l'écran, sinon dans un autre élément (groupe)
  visible: boolean; // propriété Visible
  locked: boolean; // verrouillé dans l'éditeur seulement (pas dans le code)
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
  cornerScale: number; // UICorner proportionnel (0 = non utilisé, 0.5 = cercle / capsule)
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

export type Orientation = "landscape" | "portrait";

export type Project = {
  id: string;
  name: string;
  device: DeviceId;
  orientation?: Orientation; // paysage par défaut (Roblox mobile est en paysage)
  elements: UIElement[];
  updatedAt: number;
};

export const DEVICES: Record<DeviceId, { label: string; ratio: number }> = {
  pc: { label: "PC 16:9", ratio: 16 / 9 },
  tablet: { label: "Tablette 4:3", ratio: 4 / 3 },
  mobile: { label: "Mobile 16:9", ratio: 16 / 9 },
};

/** Ratio largeur/hauteur de l'écran simulé, en tenant compte de la rotation */
export function deviceRatio(p: Pick<Project, "device" | "orientation">): number {
  const base = DEVICES[p.device].ratio;
  return p.orientation === "portrait" ? 1 / base : base;
}

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
  parentId: null,
  visible: true,
  locked: false,
  cornerScale: 0,
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
