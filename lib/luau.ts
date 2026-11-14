import { UIElement } from "./types";

function rgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

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
    lines.push(`${v}.BackgroundColor3 = Color3.fromRGB(${rgb(el.color)})`);
    lines.push(`${v}.BorderSizePixel = 0`);

    if (el.type === "TextLabel" || el.type === "TextButton") {
      lines.push(`${v}.Text = "${esc(el.text)}"`);
      lines.push(`${v}.TextColor3 = Color3.fromRGB(${rgb(el.textColor)})`);
      lines.push(`${v}.TextScaled = true`);
      lines.push(`${v}.Font = Enum.Font.GothamBold`);
    }
    if (el.type === "ImageLabel") {
      lines.push(`${v}.Image = "" -- colle ici ton rbxassetid://...`);
    }
    lines.push(`${v}.Parent = ScreenGui`);

    if (el.radius > 0) {
      lines.push("");
      lines.push(`local ${v}Corner = Instance.new("UICorner")`);
      lines.push(`${v}Corner.CornerRadius = UDim.new(0, ${Math.round(el.radius)})`);
      lines.push(`${v}Corner.Parent = ${v}`);
    }
  });

  lines.push("");
  lines.push(`ScreenGui.Parent = game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui")`);
  return lines.join("\n");
}
