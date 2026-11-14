import { IMAGE_TYPES, TEXT_TYPES, UIElement } from "./types";

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  const n = parseInt(full.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

const col = (hex: string) => `Color3.fromRGB(${hexToRgb(hex).join(", ")})`;

function num(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function varName(name: string, i: number): string {
  const clean = name.replace(/[^A-Za-z0-9_]/g, "");
  return /^[A-Za-z_]/.test(clean) && clean ? clean : `Element${i + 1}`;
}

export function toLuau(elements: UIElement[], guiName = "MonUI"): string {
  const lines: string[] = [];
  lines.push(`local ScreenGui = Instance.new("ScreenGui")`);
  lines.push(`ScreenGui.Name = "${esc(guiName)}"`);
  lines.push(`ScreenGui.ResetOnSpawn = false`);

  const used = new Set<string>();

  elements.forEach((el, i) => {
    let v = varName(el.name, i);
    while (used.has(v) || v === "ScreenGui") v += "_";
    used.add(v);

    lines.push("");
    lines.push(`local ${v} = Instance.new("${el.type}")`);
    lines.push(`${v}.Name = "${esc(el.name)}"`);
    lines.push(`${v}.Position = UDim2.new(${num(el.x)}, 0, ${num(el.y)}, 0)`);
    lines.push(`${v}.Size = UDim2.new(${num(el.w)}, 0, ${num(el.h)}, 0)`);
    // Avec un UIGradient, Roblox multiplie la couleur du fond : on part du blanc
    lines.push(`${v}.BackgroundColor3 = ${el.gradient ? "Color3.fromRGB(255, 255, 255)" : col(el.color)}`);
    if (el.transparency > 0) lines.push(`${v}.BackgroundTransparency = ${num(el.transparency)}`);
    lines.push(`${v}.BorderSizePixel = 0`);
    if (el.rotation !== 0) lines.push(`${v}.Rotation = ${num(el.rotation)}`);

    if (TEXT_TYPES.includes(el.type)) {
      lines.push(`${v}.Text = "${esc(el.text)}"`);
      lines.push(`${v}.TextColor3 = ${col(el.textColor)}`);
      if (el.textScaled) lines.push(`${v}.TextScaled = true`);
      else lines.push(`${v}.TextSize = ${Math.round(el.textSize)}`);
      lines.push(`${v}.Font = Enum.Font.${el.font}`);
    }
    if (IMAGE_TYPES.includes(el.type)) {
      if (el.assetId) lines.push(`${v}.Image = "rbxassetid://${el.assetId}"`);
      else lines.push(`${v}.Image = "" -- colle ici ton rbxassetid://...`);
      if (el.scaleType !== "Stretch") lines.push(`${v}.ScaleType = Enum.ScaleType.${el.scaleType}`);
    }
    lines.push(`${v}.Parent = ScreenGui`);

    if (el.radius > 0) {
      lines.push("");
      lines.push(`local ${v}Corner = Instance.new("UICorner")`);
      lines.push(`${v}Corner.CornerRadius = UDim.new(0, ${Math.round(el.radius)})`);
      lines.push(`${v}Corner.Parent = ${v}`);
    }
    if (el.strokeThickness > 0) {
      lines.push("");
      lines.push(`local ${v}Stroke = Instance.new("UIStroke")`);
      lines.push(`${v}Stroke.Color = ${col(el.strokeColor)}`);
      lines.push(`${v}Stroke.Thickness = ${num(el.strokeThickness)}`);
      lines.push(`${v}Stroke.Parent = ${v}`);
    }
    if (el.gradient) {
      lines.push("");
      lines.push(`local ${v}Gradient = Instance.new("UIGradient")`);
      lines.push(`${v}Gradient.Color = ColorSequence.new(${col(el.color)}, ${col(el.gradientColor)})`);
      lines.push(`${v}Gradient.Rotation = ${num(el.gradientRotation)}`);
      lines.push(`${v}Gradient.Parent = ${v}`);
    }
  });

  lines.push("");
  lines.push(`ScreenGui.Parent = game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui")`);
  return lines.join("\n");
}
