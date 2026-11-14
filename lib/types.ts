export type ElementType = "Frame" | "TextLabel" | "TextButton" | "ImageLabel";

export type UIElement = {
  id: string;
  type: ElementType;
  name: string;
  // Position et taille en Scale (0 à 1, relatif à l'écran)
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  text: string;
  textColor: string;
  radius: number; // UICorner en pixels Roblox (0 = aucun)
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
