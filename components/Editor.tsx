"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DEVICES, DeviceId, ElementType, Project, TEXT_TYPES, UIElement } from "@/lib/types";
import { getProject, getUser, makeElement, saveProject, uid } from "@/lib/store";
import { toLuau } from "@/lib/luau";

const TOOLS: { type: ElementType; label: string; icon: string }[] = [
  { type: "Frame", label: "Frame", icon: "▭" },
  { type: "TextLabel", label: "TextLabel", icon: "T" },
  { type: "TextButton", label: "TextButton", icon: "⏍" },
  { type: "ImageLabel", label: "ImageLabel", icon: "🖼" },
];

const DEFAULTS: Record<ElementType, Partial<UIElement>> = {
  Frame: { color: "#3b3b52", radius: 8, w: 0.3, h: 0.3 },
  TextLabel: { color: "#1f1f2e", text: "Texte", w: 0.2, h: 0.1 },
  TextButton: { color: "#7d2ae8", text: "Bouton", w: 0.2, h: 0.1, radius: 12 },
  ImageLabel: { color: "#4b5563", w: 0.2, h: 0.25, radius: 8 },
};

type DragState = {
  id: string;
  mode: "move" | "resize";
  sx: number;
  sy: number;
  orig: UIElement;
};

const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export default function Editor({ id }: { id: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);

  useEffect(() => {
    if (!getUser()) {
      router.replace("/login");
      return;
    }
    const p = getProject(id);
    if (!p) {
      router.replace("/home");
      return;
    }
    setProject(p);
  }, [id, router]);

  // Sauvegarde automatique
  useEffect(() => {
    if (!project) return;
    const t = setTimeout(() => saveProject(project), 300);
    return () => clearTimeout(t);
  }, [project]);

  const update = useCallback((elId: string, patch: Partial<UIElement>) => {
    setProject((p) =>
      p ? { ...p, elements: p.elements.map((e) => (e.id === elId ? { ...e, ...patch } : e)) } : p
    );
  }, []);

  function addElement(type: ElementType) {
    if (!project) return;
    const d = DEFAULTS[type];
    const w = d.w ?? 0.2;
    const h = d.h ?? 0.2;
    const count = project.elements.length;
    const el = makeElement({
      type,
      ...d,
      x: r3(clamp(0.5 - w / 2 + (count % 5) * 0.02, 0, 1 - w)),
      y: r3(clamp(0.5 - h / 2 + (count % 5) * 0.02, 0, 1 - h)),
    });
    setProject({ ...project, elements: [...project.elements, el] });
    setSelected(el.id);
  }

  function removeSelected() {
    if (!project || !selected) return;
    setProject({ ...project, elements: project.elements.filter((e) => e.id !== selected) });
    setSelected(null);
  }

  function duplicateSelected() {
    if (!project || !selected) return;
    const src = project.elements.find((e) => e.id === selected);
    if (!src) return;
    const copy: UIElement = {
      ...src,
      id: uid(),
      name: src.name + "Copie",
      x: r3(clamp(src.x + 0.02, 0, 1 - src.w)),
      y: r3(clamp(src.y + 0.02, 0, 1 - src.h)),
    };
    setProject({ ...project, elements: [...project.elements, copy] });
    setSelected(copy.id);
  }

  function moveLayer(dir: 1 | -1) {
    if (!project || !selected) return;
    const arr = [...project.elements];
    const i = arr.findIndex((e) => e.id === selected);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setProject({ ...project, elements: arr });
  }

  // Suppr au clavier
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        removeSelected();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ----- Drag & resize ----- */

  function startDrag(e: React.PointerEvent, el: UIElement, mode: "move" | "resize") {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelected(el.id);
    drag.current = { id: el.id, mode, sx: e.clientX, sy: e.clientY, orig: el };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const canvas = canvasRef.current;
    if (!d || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - d.sx) / rect.width;
    const dy = (e.clientY - d.sy) / rect.height;
    if (d.mode === "move") {
      update(d.id, {
        x: r3(clamp(d.orig.x + dx, 0, 1 - d.orig.w)),
        y: r3(clamp(d.orig.y + dy, 0, 1 - d.orig.h)),
      });
    } else {
      update(d.id, {
        w: r3(clamp(d.orig.w + dx, 0.02, 1 - d.orig.x)),
        h: r3(clamp(d.orig.h + dy, 0.02, 1 - d.orig.y)),
      });
    }
  }

  function endDrag() {
    drag.current = null;
  }

  /* ----- Code ----- */

  const code = useMemo(() => (project ? toLuau(project.elements, project.name.replace(/\s+/g, "")) : ""), [project]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  if (!project) return <div className="splash">Chargement…</div>;

  const sel = project.elements.find((e) => e.id === selected) ?? null;
  const ratio = DEVICES[project.device].ratio;

  return (
    <div className="editor">
      <header className="ed-top">
        <button className="btn btn-ghost" onClick={() => router.push("/home")}>
          ← Accueil
        </button>
        <input
          className="ed-title"
          value={project.name}
          onChange={(e) => setProject({ ...project, name: e.target.value })}
        />
        <div className="ed-top-right">
          <select
            value={project.device}
            onChange={(e) => setProject({ ...project, device: e.target.value as DeviceId })}
          >
            {Object.entries(DEVICES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <span className="saved">✓ Enregistré</span>
        </div>
      </header>

      <div className="ed-body">
        {/* ---- Boîte à outils ---- */}
        <aside className="ed-left">
          <h4>Éléments</h4>
          <div className="tools">
            {TOOLS.map((t) => (
              <button key={t.type} className="tool" onClick={() => addElement(t.type)}>
                <span className="tool-ico">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <h4>Propriétés</h4>
          {!sel ? (
            <p className="muted small">Sélectionne un élément sur l&apos;écran pour modifier ses propriétés.</p>
          ) : (
            <div className="props">
              <label>
                Nom
                <input value={sel.name} onChange={(e) => update(sel.id, { name: e.target.value })} />
              </label>
              {TEXT_TYPES.includes(sel.type) && (
                <label>
                  Texte
                  <input value={sel.text} onChange={(e) => update(sel.id, { text: e.target.value })} />
                </label>
              )}
              <div className="row2">
                <NumField label="X %" value={sel.x * 100} max={100 - sel.w * 100} onChange={(v) => update(sel.id, { x: r3(v / 100) })} />
                <NumField label="Y %" value={sel.y * 100} max={100 - sel.h * 100} onChange={(v) => update(sel.id, { y: r3(v / 100) })} />
                <NumField label="Larg. %" value={sel.w * 100} max={100 - sel.x * 100} onChange={(v) => update(sel.id, { w: r3(Math.max(v, 2) / 100) })} />
                <NumField label="Haut. %" value={sel.h * 100} max={100 - sel.y * 100} onChange={(v) => update(sel.id, { h: r3(Math.max(v, 2) / 100) })} />
              </div>
              <div className="row2">
                <label>
                  Couleur
                  <input type="color" value={sel.color} onChange={(e) => update(sel.id, { color: e.target.value })} />
                </label>
                {TEXT_TYPES.includes(sel.type) && (
                  <label>
                    Texte
                    <input type="color" value={sel.textColor} onChange={(e) => update(sel.id, { textColor: e.target.value })} />
                  </label>
                )}
              </div>
              <label>
                Coins arrondis (UICorner): {sel.radius}px
                <input type="range" min={0} max={80} value={sel.radius} onChange={(e) => update(sel.id, { radius: Number(e.target.value) })} />
              </label>
              <div className="btn-row">
                <button className="btn btn-outline btn-sm" onClick={() => moveLayer(1)}>↑ Avant</button>
                <button className="btn btn-outline btn-sm" onClick={() => moveLayer(-1)}>↓ Arrière</button>
              </div>
              <div className="btn-row">
                <button className="btn btn-outline btn-sm" onClick={duplicateSelected}>Dupliquer</button>
                <button className="btn btn-danger btn-sm" onClick={removeSelected}>Supprimer</button>
              </div>
            </div>
          )}
        </aside>

        {/* ---- Canvas ---- */}
        <main className="ed-center" onPointerDown={() => setSelected(null)}>
          <div
            ref={canvasRef}
            className="canvas"
            style={{
              aspectRatio: String(ratio),
              width: `min(100%, calc((100vh - 140px) * ${ratio}))`,
            }}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerDown={(e) => {
              e.stopPropagation();
              setSelected(null);
            }}
          >
            {project.elements.map((el) => (
              <div
                key={el.id}
                className={"el" + (el.id === selected ? " el-selected" : "")}
                onPointerDown={(e) => startDrag(e, el, "move")}
                style={{
                  left: `${el.x * 100}%`,
                  top: `${el.y * 100}%`,
                  width: `${el.w * 100}%`,
                  height: `${el.h * 100}%`,
                  background: el.color,
                  borderRadius: `${el.radius / 10.8}cqh`,
                  color: el.textColor,
                  fontSize: `${el.h * 45}cqh`,
                }}
              >
                {TEXT_TYPES.includes(el.type) && <span className="el-text">{el.text}</span>}
                {el.type === "ImageLabel" && <span className="el-img">🖼</span>}
                {el.id === selected && (
                  <div className="handle" onPointerDown={(e) => startDrag(e, el, "resize")} />
                )}
              </div>
            ))}
            {project.elements.length === 0 && (
              <div className="canvas-empty">Ajoute un élément depuis la boîte à outils ←</div>
            )}
          </div>
        </main>

        {/* ---- Code ---- */}
        <aside className="ed-right">
          <div className="code-head">
            <h4>Code Luau</h4>
            <button className="btn btn-primary btn-sm" onClick={copyCode}>
              {copied ? "Copié ✓" : "Copier"}
            </button>
          </div>
          <pre className="code">{code}</pre>
          <p className="muted small">
            Colle ce script dans un LocalScript (StarterPlayerScripts) dans Roblox Studio.
          </p>
        </aside>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        step={0.5}
        min={0}
        max={Math.max(0, Math.round(max * 10) / 10)}
        value={Math.round(value * 10) / 10}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0, 0, 100))}
      />
    </label>
  );
}
