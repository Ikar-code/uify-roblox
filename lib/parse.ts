import { rgbToHex } from "./luau";
import { ELEMENT_DEFAULTS, ElementType, IMAGE_TYPES, ScaleType, UIElement } from "./types";
import { uid } from "./store";

/**
 * Lit le code Luau du panneau de droite et reconstruit les éléments.
 * Gère le format généré par l'éditeur (et des variantes écrites à la main) :
 *   local X = Instance.new("Frame")
 *   X.Propriété = valeur
 * Une instruction par ligne. Les UICorner / UIStroke / UIGradient sont rattachés
 * à leur élément via leur Parent.
 */

export type ParseResult =
  | { ok: true; elements: UIElement[]; warnings: string[] }
  | { ok: false; error: string };

class ParseError extends Error {
  constructor(public line: number, message: string) {
    super(message);
  }
}

const ELEMENT_CLASSES = ["Frame", "TextLabel", "TextButton", "ImageLabel", "ImageButton"];
const MOD_CLASSES = ["UICorner", "UIStroke", "UIGradient"];

/* ---------- Utilitaires de lecture ---------- */

function stripComment(line: string): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "-" && line[i + 1] === "-") {
      return line.slice(0, i);
    }
  }
  return line;
}

function args(s: string, fn: string): string[] | null {
  const prefix = fn + "(";
  if (!s.startsWith(prefix) || !s.endsWith(")")) return null;
  const inner = s.slice(prefix.length, -1).trim();
  return inner === "" ? [] : inner.split(",").map((x) => x.trim());
}

function toNum(s: string, line: number, prop: string): number {
  const n = Number(s);
  if (s.trim() === "" || !Number.isFinite(n)) throw new ParseError(line, `valeur invalide pour ${prop}`);
  return n;
}

function toStr(s: string, line: number, prop: string): string {
  const m = s.match(/^"((?:[^"\\]|\\.)*)"$/) || s.match(/^'((?:[^'\\]|\\.)*)'$/);
  if (!m) throw new ParseError(line, `texte attendu entre guillemets pour ${prop}`);
  return m[1].replace(/\\(.)/g, (_, c: string) => (c === "n" ? "\n" : c === "t" ? "\t" : c));
}

function toBool(s: string, line: number, prop: string): boolean {
  if (s === "true") return true;
  if (s === "false") return false;
  throw new ParseError(line, `true ou false attendu pour ${prop}`);
}

function toColor(s: string, line: number, prop: string): string {
  let a = args(s, "Color3.fromRGB");
  if (a && a.length === 3) {
    const v = a.map((x) => toNum(x, line, prop));
    return rgbToHex(v[0], v[1], v[2]);
  }
  a = args(s, "Color3.new");
  if (a && a.length === 3) {
    const v = a.map((x) => toNum(x, line, prop) * 255);
    return rgbToHex(v[0], v[1], v[2]);
  }
  a = args(s, "Color3.fromHex");
  if (a && a.length === 1) {
    const h = toStr(a[0], line, prop).replace("#", "");
    if (/^[0-9a-f]{6}$/i.test(h)) return "#" + h.toLowerCase();
  }
  throw new ParseError(line, `couleur non reconnue pour ${prop} (utilise Color3.fromRGB(r, g, b))`);
}

type UDim2Value = { xs: number; xo: number; ys: number; yo: number };

function toUDim2(s: string, line: number, prop: string): UDim2Value {
  let a = args(s, "UDim2.new");
  if (a && a.length === 4) {
    const v = a.map((x) => toNum(x, line, prop));
    return { xs: v[0], xo: v[1], ys: v[2], yo: v[3] };
  }
  a = args(s, "UDim2.fromScale");
  if (a && a.length === 2) {
    const v = a.map((x) => toNum(x, line, prop));
    return { xs: v[0], xo: 0, ys: v[1], yo: 0 };
  }
  a = args(s, "UDim2.fromOffset");
  if (a && a.length === 2) {
    const v = a.map((x) => toNum(x, line, prop));
    return { xs: 0, xo: v[0], ys: 0, yo: v[1] };
  }
  throw new ParseError(line, `UDim2.new(xScale, xOffset, yScale, yOffset) attendu pour ${prop}`);
}

function toEnum(s: string, family: string, line: number, prop: string): string {
  const m = s.match(new RegExp(`^Enum\\.${family}\\.(\\w+)$`));
  if (!m) throw new ParseError(line, `Enum.${family}.Nom attendu pour ${prop}`);
  return m[1];
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/* ---------- Parser principal ---------- */

type Inst = {
  cls: string;
  props: Map<string, { raw: string; line: number }>;
};

export function parseLuau(code: string, prev: UIElement[]): ParseResult {
  try {
    return { ok: true, ...build(code, prev) };
  } catch (e) {
    if (e instanceof ParseError) return { ok: false, error: `Ligne ${e.line} : ${e.message}` };
    return { ok: false, error: "Code illisible." };
  }
}

function build(code: string, prev: UIElement[]): { elements: UIElement[]; warnings: string[] } {
  const warnings: string[] = [];
  const insts = new Map<string, Inst>();
  const order: string[] = [];

  const decl = /^local\s+([A-Za-z_]\w*)\s*=\s*Instance\.new\(\s*["'](\w+)["']\s*(?:,\s*([A-Za-z_]\w*)\s*)?\)$/;
  const assign = /^([A-Za-z_]\w*)\.(\w+)\s*=\s*(.+)$/;

  code.split("\n").forEach((rawLine, idx) => {
    const line = idx + 1;
    const text = stripComment(rawLine).trim().replace(/;$/, "").trim();
    if (!text) return;

    const d = text.match(decl);
    if (d) {
      const props = new Map<string, { raw: string; line: number }>();
      if (d[3]) props.set("Parent", { raw: d[3], line });
      insts.set(d[1], { cls: d[2], props });
      if (!order.includes(d[1])) order.push(d[1]);
      return;
    }
    if (text.includes("Instance.new")) {
      throw new ParseError(line, 'Instance.new mal formé (exemple : local Bouton = Instance.new("TextButton"))');
    }
    const a = text.match(assign);
    if (a) {
      const inst = insts.get(a[1]);
      if (inst) inst.props.set(a[2], { raw: a[3].trim(), line });
    }
  });

  let offsetWarned = false;
  const noteOffset = (v: UDim2Value) => {
    if ((v.xo !== 0 || v.yo !== 0) && !offsetWarned) {
      offsetWarned = true;
      warnings.push("Offset (pixels) ignoré : seul le Scale est géré pour l'instant.");
    }
  };

  const base: UIElement = {
    ...ELEMENT_DEFAULTS,
    id: "",
    type: "Frame",
    name: "",
    // Valeurs par défaut de Roblox quand une propriété n'est pas écrite
    x: 0,
    y: 0,
    w: 0.2,
    h: 0.2,
    color: "#a3a2a5",
    textColor: "#1b2a35",
    font: "SourceSans",
    textScaled: false,
    textSize: 14,
  };

  const parsed: UIElement[] = [];
  const vars: string[] = []; // nom de variable de chaque élément de `parsed`
  const parentVars = new Map<string, string>(); // variable enfant → variable parent
  const byVar = new Map<string, UIElement>();

  for (const varName of order) {
    const inst = insts.get(varName)!;
    if (!ELEMENT_CLASSES.includes(inst.cls)) {
      if (inst.cls !== "ScreenGui" && !MOD_CLASSES.includes(inst.cls)) {
        warnings.push(`Instance « ${inst.cls} » ignorée (non gérée pour l'instant).`);
      }
      continue;
    }

    const parentRaw = inst.props.get("Parent")?.raw;
    const parentInst = parentRaw ? insts.get(parentRaw) : undefined;
    if (parentRaw && parentInst && ELEMENT_CLASSES.includes(parentInst.cls)) parentVars.set(varName, parentRaw);

    const el: UIElement = { ...base, type: inst.cls as ElementType, name: varName };

    for (const [prop, { raw, line }] of inst.props) {
      switch (prop) {
        case "Name":
          el.name = toStr(raw, line, prop);
          break;
        case "Position": {
          const v = toUDim2(raw, line, prop);
          noteOffset(v);
          el.x = round3(v.xs);
          el.y = round3(v.ys);
          break;
        }
        case "Size": {
          const v = toUDim2(raw, line, prop);
          noteOffset(v);
          el.w = round3(Math.max(0, v.xs));
          el.h = round3(Math.max(0, v.ys));
          break;
        }
        case "BackgroundColor3":
          el.color = toColor(raw, line, prop);
          break;
        case "BackgroundTransparency":
          el.transparency = Math.min(1, Math.max(0, toNum(raw, line, prop)));
          break;
        case "Rotation":
          el.rotation = toNum(raw, line, prop);
          break;
        case "Visible":
          el.visible = toBool(raw, line, prop);
          break;
        case "Text":
          el.text = toStr(raw, line, prop);
          break;
        case "TextColor3":
          el.textColor = toColor(raw, line, prop);
          break;
        case "TextScaled":
          el.textScaled = toBool(raw, line, prop);
          break;
        case "TextSize":
          el.textSize = toNum(raw, line, prop);
          break;
        case "Font":
          el.font = toEnum(raw, "Font", line, prop);
          break;
        case "Image": {
          const s = toStr(raw, line, prop);
          const m = s.match(/^rbxassetid:\/\/(\d+)$/);
          if (m) el.assetId = m[1];
          else if (s !== "") warnings.push(`Image « ${s} » ignorée : utilise le format rbxassetid://123456.`);
          break;
        }
        case "ScaleType": {
          const t = toEnum(raw, "ScaleType", line, prop);
          if (t === "Stretch" || t === "Fit" || t === "Crop") el.scaleType = t as ScaleType;
          else warnings.push(`ScaleType.${t} non géré, Stretch utilisé.`);
          break;
        }
        default:
          break; // Parent, BorderSizePixel, Visible, ZIndex... ignorés
      }
    }

    parsed.push(el);
    vars.push(varName);
    byVar.set(varName, el);
  }

  // UICorner / UIStroke / UIGradient rattachés à leur élément
  for (const varName of order) {
    const inst = insts.get(varName)!;
    if (!MOD_CLASSES.includes(inst.cls)) continue;
    const parentRaw = inst.props.get("Parent")?.raw;
    const target = parentRaw ? byVar.get(parentRaw) : undefined;
    if (!target) continue;

    if (inst.cls === "UICorner") {
      const p = inst.props.get("CornerRadius");
      if (p) {
        const a = args(p.raw, "UDim.new");
        if (!a || a.length !== 2) throw new ParseError(p.line, "UDim.new(scale, offset) attendu pour CornerRadius");
        const sc = toNum(a[0], p.line, "CornerRadius");
        const off = toNum(a[1], p.line, "CornerRadius");
        if (sc > 0) {
          target.cornerScale = Math.min(0.5, sc);
          target.radius = 0;
        } else {
          target.cornerScale = 0;
          target.radius = Math.max(0, off);
        }
      } else {
        target.radius = 8;
      }
    } else if (inst.cls === "UIStroke") {
      target.strokeThickness = 1;
      target.strokeColor = "#000000";
      for (const [prop, { raw, line }] of inst.props) {
        if (prop === "Color") target.strokeColor = toColor(raw, line, "Color");
        if (prop === "Thickness") target.strokeThickness = Math.max(0, toNum(raw, line, "Thickness"));
      }
    } else if (inst.cls === "UIGradient") {
      target.gradient = true;
      target.gradientRotation = 0;
      for (const [prop, { raw, line }] of inst.props) {
        if (prop === "Rotation") target.gradientRotation = toNum(raw, line, "Rotation");
        if (prop === "Color") {
          const found = raw.match(/Color3\.(?:fromRGB|new|fromHex)\([^)]*\)/g);
          if (!found) throw new ParseError(line, "ColorSequence.new(Color3..., Color3...) attendu pour Color");
          target.color = toColor(found[0], line, "Color");
          target.gradientColor = toColor(found[found.length - 1], line, "Color");
        }
      }
    }
  }

  // Retrouver les anciens éléments (garder id et aperçu d'image) : d'abord par nom, puis par position
  const used = new Set<number>();
  const match: number[] = parsed.map(() => -1);
  parsed.forEach((el, i) => {
    const j = prev.findIndex((p, k) => !used.has(k) && p.name === el.name);
    if (j >= 0) {
      used.add(j);
      match[i] = j;
    }
  });
  parsed.forEach((_, i) => {
    if (match[i] === -1 && i < prev.length && !used.has(i)) {
      used.add(i);
      match[i] = i;
    }
  });

  const withIds = parsed.map((el, i) => {
    const p = match[i] >= 0 ? prev[match[i]] : null;
    return {
      ...el,
      id: p ? p.id : uid(),
      image: p && IMAGE_TYPES.includes(el.type) ? p.image : "",
      locked: p ? p.locked : false,
    };
  });

  // Relier les parents (variable → id)
  const idByVar = new Map<string, string>(vars.map((v, i) => [v, withIds[i].id]));
  const elements: UIElement[] = withIds.map((el, i) => {
    const pv = parentVars.get(vars[i]);
    return { ...el, parentId: pv ? idByVar.get(pv) ?? null : null };
  });

  // Anti-boucle : un élément ne peut pas être son propre ancêtre
  elements.forEach((el, i) => {
    const seen = new Set<string>();
    let cur: UIElement | undefined = el;
    while (cur && cur.parentId) {
      if (seen.has(cur.id)) {
        elements[i] = { ...el, parentId: null };
        warnings.push(`Boucle de parents détectée sur « ${el.name} », parent ignoré.`);
        break;
      }
      seen.add(cur.id);
      const pid: string = cur.parentId;
      cur = elements.find((e) => e.id === pid);
    }
  });

  return { elements, warnings };
}
