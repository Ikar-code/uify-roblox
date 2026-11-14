import { DeviceId, Project, UIElement } from "./types";

const USER_KEY = "rbxui:user";
const PROJECTS_KEY = "rbxui:projects";

export type User = { email: string; name: string };

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* ---------- Auth (démo locale, à remplacer par Supabase) ---------- */

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function login(email: string): User {
  const name = email.split("@")[0] || "Utilisateur";
  const user = { email, name: name.charAt(0).toUpperCase() + name.slice(1) };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function logout() {
  localStorage.removeItem(USER_KEY);
}

/* ---------- Projets (localStorage pour l'instant) ---------- */

export function listProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    const list = raw ? (JSON.parse(raw) as Project[]) : [];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function writeAll(list: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
}

export function getProject(id: string): Project | null {
  return listProjects().find((p) => p.id === id) ?? null;
}

export function saveProject(project: Project) {
  const list = listProjects().filter((p) => p.id !== project.id);
  list.push({ ...project, updatedAt: Date.now() });
  writeAll(list);
}

export function deleteProject(id: string) {
  writeAll(listProjects().filter((p) => p.id !== id));
}

/* ---------- Modèles de départ ---------- */

export function makeElement(partial: Partial<UIElement> & Pick<UIElement, "type">): UIElement {
  const base: UIElement = {
    id: uid(),
    type: partial.type,
    name: partial.type + Math.floor(Math.random() * 90 + 10),
    x: 0.35,
    y: 0.35,
    w: 0.3,
    h: 0.3,
    color: "#2d2d3a",
    text: "",
    textColor: "#ffffff",
    radius: 0,
  };
  return { ...base, ...partial };
}

export type TemplateId = "blank" | "menu" | "inventory" | "hud" | "shop";

export const TEMPLATES: { id: TemplateId; label: string; emoji: string; gradient: string }[] = [
  { id: "blank", label: "Design vierge", emoji: "✨", gradient: "linear-gradient(135deg,#7d2ae8,#9b5cf0)" },
  { id: "menu", label: "Menu principal", emoji: "🎮", gradient: "linear-gradient(135deg,#ff6b6b,#ffa94d)" },
  { id: "inventory", label: "Inventaire", emoji: "🎒", gradient: "linear-gradient(135deg,#00c4cc,#3b82f6)" },
  { id: "hud", label: "HUD de jeu", emoji: "❤️", gradient: "linear-gradient(135deg,#22c55e,#14b8a6)" },
  { id: "shop", label: "Boutique", emoji: "🛒", gradient: "linear-gradient(135deg,#ec4899,#8b5cf6)" },
];

function templateElements(id: TemplateId): UIElement[] {
  switch (id) {
    case "menu":
      return [
        makeElement({ type: "Frame", name: "Fond", x: 0.3, y: 0.15, w: 0.4, h: 0.7, color: "#1f1f2e", radius: 16 }),
        makeElement({ type: "TextLabel", name: "Titre", x: 0.33, y: 0.2, w: 0.34, h: 0.12, color: "#1f1f2e", text: "MON JEU", radius: 0 }),
        makeElement({ type: "TextButton", name: "Jouer", x: 0.35, y: 0.4, w: 0.3, h: 0.1, color: "#7d2ae8", text: "Jouer", radius: 12 }),
        makeElement({ type: "TextButton", name: "Options", x: 0.35, y: 0.54, w: 0.3, h: 0.1, color: "#3b3b52", text: "Options", radius: 12 }),
        makeElement({ type: "TextButton", name: "Quitter", x: 0.35, y: 0.68, w: 0.3, h: 0.1, color: "#3b3b52", text: "Quitter", radius: 12 }),
      ];
    case "inventory": {
      const slots: UIElement[] = [];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 4; c++)
          slots.push(
            makeElement({
              type: "Frame",
              name: `Slot${r * 4 + c + 1}`,
              x: 0.29 + c * 0.1,
              y: 0.3 + r * 0.18,
              w: 0.09,
              h: 0.16,
              color: "#3b3b52",
              radius: 8,
            })
          );
      return [
        makeElement({ type: "Frame", name: "Panneau", x: 0.27, y: 0.12, w: 0.46, h: 0.76, color: "#1f1f2e", radius: 16 }),
        makeElement({ type: "TextLabel", name: "Titre", x: 0.29, y: 0.15, w: 0.2, h: 0.09, color: "#1f1f2e", text: "Inventaire" }),
        ...slots,
      ];
    }
    case "hud":
      return [
        makeElement({ type: "Frame", name: "BarreVieFond", x: 0.03, y: 0.04, w: 0.25, h: 0.05, color: "#3b3b52", radius: 10 }),
        makeElement({ type: "Frame", name: "BarreVie", x: 0.03, y: 0.04, w: 0.18, h: 0.05, color: "#ef4444", radius: 10 }),
        makeElement({ type: "TextLabel", name: "Argent", x: 0.78, y: 0.04, w: 0.19, h: 0.07, color: "#facc15", text: "💰 1250", radius: 10 }),
      ];
    case "shop":
      return [
        makeElement({ type: "Frame", name: "Fond", x: 0.2, y: 0.12, w: 0.6, h: 0.76, color: "#1f1f2e", radius: 16 }),
        makeElement({ type: "TextLabel", name: "Titre", x: 0.23, y: 0.15, w: 0.2, h: 0.09, color: "#1f1f2e", text: "Boutique" }),
        makeElement({ type: "ImageLabel", name: "Item1", x: 0.24, y: 0.3, w: 0.16, h: 0.3, color: "#3b3b52", radius: 12 }),
        makeElement({ type: "ImageLabel", name: "Item2", x: 0.42, y: 0.3, w: 0.16, h: 0.3, color: "#3b3b52", radius: 12 }),
        makeElement({ type: "ImageLabel", name: "Item3", x: 0.6, y: 0.3, w: 0.16, h: 0.3, color: "#3b3b52", radius: 12 }),
        makeElement({ type: "TextButton", name: "Acheter", x: 0.4, y: 0.7, w: 0.2, h: 0.09, color: "#22c55e", text: "Acheter", radius: 12 }),
      ];
    default:
      return [];
  }
}

export function createProject(template: TemplateId = "blank", device: DeviceId = "pc"): Project {
  const label = TEMPLATES.find((t) => t.id === template)?.label ?? "Design";
  const project: Project = {
    id: uid() + uid(),
    name: template === "blank" ? "Design sans titre" : label,
    device,
    elements: templateElements(template),
    updatedAt: Date.now(),
  };
  saveProject(project);
  return project;
}
