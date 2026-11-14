import type { CSSProperties } from "react";
import { hexToRgb } from "./luau";
import { UIElement } from "./types";

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

/** Fond CSS d'un élément (couleur, transparence, dégradé) */
export function elementBackground(el: UIElement): string {
  const a = 1 - el.transparency;
  if (el.gradient) {
    // Roblox : 0° = gauche → droite. CSS : 90° = gauche → droite.
    return `linear-gradient(${el.gradientRotation + 90}deg, ${hexToRgba(el.color, a)}, ${hexToRgba(el.gradientColor, a)})`;
  }
  return hexToRgba(el.color, a);
}

/** Approximation web des polices Roblox pour l'aperçu */
export function fontStyle(font: string): CSSProperties {
  const bold = /Bold|Black|Fredoka|Luckiest|Bangers|Marker/.test(font);
  let family = 'Inter, "Segoe UI", Roboto, sans-serif';
  if (/Mono|Code|SciFi|Arcade/.test(font)) family = 'ui-monospace, Consolas, "Courier New", monospace';
  else if (/Cartoon|Fredoka|Luckiest|Bangers|Marker|Fantasy/.test(font)) family = '"Comic Sans MS", "Comic Neue", cursive';
  else if (/Oswald/.test(font)) family = 'Impact, "Arial Narrow", sans-serif';
  return { fontFamily: family, fontWeight: bold ? 800 : 500 };
}

export const OBJECT_FIT: Record<string, "fill" | "contain" | "cover"> = {
  Stretch: "fill",
  Fit: "contain",
  Crop: "cover",
};
