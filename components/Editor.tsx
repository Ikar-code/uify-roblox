"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DEVICES, DeviceId, ElementType, FONTS, IMAGE_TYPES, Project, TEXT_TYPES, UIElement, deviceRatio } from "@/lib/types";
import { getProject, getUser, makeElement, saveProject } from "@/lib/store";
import { toLuau } from "@/lib/luau";
import { parseLuau } from "@/lib/parse";
import { fileToImage } from "@/lib/image";
import { OBJECT_FIT, elementBackground, fontStyle } from "@/lib/render";

/* ---------- Outils et valeurs par défaut ---------- */

const TOOLS: { type: ElementType; label: string; icon: string }[] = [
  { type: "Frame", label: "Frame", icon: "▭" },
  { type: "TextLabel", label: "TextLabel", icon: "T" },
  { type: "TextButton", label: "TextButton", icon: "⏍" },
  { type: "ImageLabel", label: "ImageLabel", icon: "🖼" },
  { type: "ImageButton", label: "ImageButton", icon: "🖱" },
];

const DEFAULTS: Record<ElementType, Partial<UIElement>> = {
  Frame: { color: "#3b3b52", radius: 8, w: 0.3, h: 0.3 },
  TextLabel: { color: "#1f1f2e", text: "Texte", w: 0.2, h: 0.1 },
  TextButton: { color: "#7d2ae8", text: "Bouton", w: 0.2, h: 0.1, radius: 12 },
  ImageLabel: { color: "#4b5563", w: 0.2, h: 0.25, radius: 8 },
  ImageButton: { color: "#4b5563", w: 0.2, h: 0.25, radius: 8 },
};

/* ---------- Disposition des panneaux ---------- */

type PanelId = "tools" | "code";
type PanelState = {
  side: "left" | "right";
  width: number;
  open: boolean;
  floating: boolean;
  fx: number;
  fy: number;
  fw: number;
  fh: number;
};
type Layout = Record<PanelId, PanelState>;

const DEFAULT_LAYOUT: Layout = {
  tools: { side: "left", width: 280, open: true, floating: false, fx: 40, fy: 90, fw: 300, fh: 560 },
  code: { side: "right", width: 380, open: true, floating: false, fx: 640, fy: 90, fw: 420, fh: 560 },
};
const LAYOUT_KEY = "rbxui:layout";

const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const guiName = (p: Project) => p.name.replace(/[^A-Za-z0-9_]/g, "") || "MonUI";

type DragState = { id: string; mode: "move" | "resize"; sx: number; sy: number; orig: UIElement };

/* ---------- Composant principal ---------- */

export default function Editor({ id }: { id: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveOk, setSaveOk] = useState(true);
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);
  const [layoutReady, setLayoutReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const resize = useRef<{ id: PanelId; sx: number; w: number; side: "left" | "right" } | null>(null);
  const projectRef = useRef<Project | null>(null);
  const codeRef = useRef("");
  const skipSync = useRef(false);
  const parseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  projectRef.current = project;

  /* ----- Chargement ----- */

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      if (raw) {
        const l = JSON.parse(raw) as Partial<Layout>;
        setLayout({
          tools: { ...DEFAULT_LAYOUT.tools, ...l.tools },
          code: { ...DEFAULT_LAYOUT.code, ...l.code },
        });
      }
    } catch {
      /* ignore */
    }
    setLayoutReady(true);
  }, []);

  useEffect(() => {
    if (!layoutReady) return;
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch {
      /* ignore */
    }
  }, [layout, layoutReady]);

  // Sauvegarde automatique
  useEffect(() => {
    if (!project) return;
    const t = setTimeout(() => setSaveOk(saveProject(project)), 300);
    return () => clearTimeout(t);
  }, [project]);

  /* ----- Code généré et synchro ----- */

  const code = useMemo(() => (project ? toLuau(project.elements, guiName(project)) : ""), [project]);
  codeRef.current = code;

  // Quand le canvas change, on réécrit le code (sauf si le changement vient du code lui-même)
  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    setDraft(code);
    setCodeError(null);
  }, [code]);

  const applyCode = useCallback((text: string) => {
    const p = projectRef.current;
    if (!p) return;
    const res = parseLuau(text, p.elements);
    if (!res.ok) {
      setCodeError(res.error);
      return;
    }
    setCodeError(null);
    setWarnings(res.warnings);
    const newCode = toLuau(res.elements, guiName(p));
    if (newCode !== codeRef.current) skipSync.current = true;
    setProject((cur) => (cur ? { ...cur, elements: res.elements } : cur));
  }, []);

  function onCodeChange(v: string) {
    setDraft(v);
    if (parseTimer.current) clearTimeout(parseTimer.current);
    parseTimer.current = setTimeout(() => applyCode(v), 500);
  }

  function onCodeKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const t = e.currentTarget;
    const s = t.selectionStart;
    const next = t.value.slice(0, s) + "  " + t.value.slice(t.selectionEnd);
    onCodeChange(next);
    requestAnimationFrame(() => {
      t.selectionStart = t.selectionEnd = s + 2;
    });
  }

  function reformat() {
    if (parseTimer.current) clearTimeout(parseTimer.current);
    setDraft(codeRef.current);
    setCodeError(null);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  /* ----- Éléments ----- */

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
    const copy = makeElement({
      ...src,
      id: undefined,
      name: src.name + "Copie",
      x: r3(clamp(src.x + 0.02, 0, 1 - src.w)),
      y: r3(clamp(src.y + 0.02, 0, 1 - src.h)),
    });
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
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        removeSelected();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ----- Images ----- */

  function setImage(elId: string, url: string) {
    setProject((p) =>
      p
        ? {
            ...p,
            elements: p.elements.map((e) =>
              e.id === elId ? { ...e, image: url, transparency: url && e.transparency === 0 ? 1 : e.transparency } : e
            ),
          }
        : p
    );
  }

  async function importImage(file: File, elId: string) {
    try {
      const { url } = await fileToImage(file);
      setImage(elId, url);
    } catch {
      alert("Impossible de lire cette image.");
    }
  }

  async function onCanvasDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    const canvas = canvasRef.current;
    if (!f || !f.type.startsWith("image/") || !project || !canvas) return;
    try {
      const { url, aspect } = await fileToImage(f);
      const rect = canvas.getBoundingClientRect();
      const ratio = deviceRatio(project);
      const w = 0.25;
      const h = clamp((w * ratio) / aspect, 0.03, 0.9);
      const x = clamp((e.clientX - rect.left) / rect.width - w / 2, 0, 1 - w);
      const y = clamp((e.clientY - rect.top) / rect.height - h / 2, 0, 1 - h);
      const el = makeElement({
        type: "ImageLabel",
        name: "Image" + (project.elements.length + 1),
        color: "#4b5563",
        transparency: 1,
        w,
        h: r3(h),
        x: r3(x),
        y: r3(y),
        image: url,
      });
      setProject({ ...project, elements: [...project.elements, el] });
      setSelected(el.id);
    } catch {
      alert("Impossible de lire cette image.");
    }
  }

  /* ----- Drag & resize des éléments ----- */

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

  /* ----- Panneaux ----- */

  const setPanel = useCallback((pid: PanelId, patch: Partial<PanelState>) => {
    setLayout((l) => ({ ...l, [pid]: { ...l[pid], ...patch } }));
  }, []);

  function resizerDown(e: React.PointerEvent, pid: PanelId) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resize.current = { id: pid, sx: e.clientX, w: layout[pid].width, side: layout[pid].side };
  }

  function resizerMove(e: React.PointerEvent) {
    const r = resize.current;
    if (!r) return;
    const dx = e.clientX - r.sx;
    setPanel(r.id, { width: clamp(r.side === "left" ? r.w + dx : r.w - dx, 220, 700) });
  }

  function resizerUp() {
    resize.current = null;
  }

  if (!project) return <div className="splash">Chargement…</div>;

  const sel = project.elements.find((e) => e.id === selected) ?? null;
  const ratio = deviceRatio(project);
  const portrait = project.orientation === "portrait";

  /* ----- Contenu des panneaux ----- */

  const toolsContent = (
    <>
      <h5 className="sect first">Éléments</h5>
      <div className="tools">
        {TOOLS.map((t) => (
          <button key={t.type} className="tool" onClick={() => addElement(t.type)}>
            <span className="tool-ico">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted small">Astuce : glisse une image depuis ton PC directement sur l&apos;écran.</p>

      <h5 className="sect">Propriétés</h5>
      {!sel ? (
        <p className="muted small">Sélectionne un élément sur l&apos;écran pour modifier ses propriétés.</p>
      ) : (
        <div className="props">
          <label>
            Nom
            <input value={sel.name} onChange={(e) => update(sel.id, { name: e.target.value })} />
          </label>

          <h5 className="sect">Position et taille</h5>
          <div className="row2">
            <NumField label="X %" value={sel.x * 100} max={100 - sel.w * 100} onChange={(v) => update(sel.id, { x: r3(v / 100) })} />
            <NumField label="Y %" value={sel.y * 100} max={100 - sel.h * 100} onChange={(v) => update(sel.id, { y: r3(v / 100) })} />
            <NumField label="Larg. %" value={sel.w * 100} max={100 - sel.x * 100} onChange={(v) => update(sel.id, { w: r3(Math.max(v, 2) / 100) })} />
            <NumField label="Haut. %" value={sel.h * 100} max={100 - sel.y * 100} onChange={(v) => update(sel.id, { h: r3(Math.max(v, 2) / 100) })} />
          </div>
          <div className="row2">
            <NumField label="Rotation °" value={sel.rotation} min={-360} max={360} step={1} onChange={(v) => update(sel.id, { rotation: v })} />
            <label>
              Transparence : {Math.round(sel.transparency * 100)}%
              <input type="range" min={0} max={1} step={0.05} value={sel.transparency} onChange={(e) => update(sel.id, { transparency: Number(e.target.value) })} />
            </label>
          </div>

          <h5 className="sect">Apparence</h5>
          <label>
            Couleur {sel.gradient ? "de départ" : "de fond"}
            <input type="color" value={sel.color} onChange={(e) => update(sel.id, { color: e.target.value })} />
          </label>
          <label className="check">
            <input type="checkbox" checked={sel.gradient} onChange={(e) => update(sel.id, { gradient: e.target.checked })} />
            Dégradé (UIGradient)
          </label>
          {sel.gradient && (
            <div className="row2">
              <label>
                Couleur d&apos;arrivée
                <input type="color" value={sel.gradientColor} onChange={(e) => update(sel.id, { gradientColor: e.target.value })} />
              </label>
              <label>
                Angle : {sel.gradientRotation}°
                <input type="range" min={0} max={360} value={sel.gradientRotation} onChange={(e) => update(sel.id, { gradientRotation: Number(e.target.value) })} />
              </label>
            </div>
          )}
          <label>
            Coins arrondis (UICorner) : {sel.radius}px
            <input type="range" min={0} max={120} value={sel.radius} onChange={(e) => update(sel.id, { radius: Number(e.target.value) })} />
          </label>
          <div className="row2">
            <label>
              Bordure (UIStroke) : {sel.strokeThickness}px
              <input type="range" min={0} max={20} step={0.5} value={sel.strokeThickness} onChange={(e) => update(sel.id, { strokeThickness: Number(e.target.value) })} />
            </label>
            <label>
              Couleur bordure
              <input type="color" value={sel.strokeColor} onChange={(e) => update(sel.id, { strokeColor: e.target.value })} />
            </label>
          </div>

          {TEXT_TYPES.includes(sel.type) && (
            <>
              <h5 className="sect">Texte</h5>
              <label>
                Contenu
                <input value={sel.text} onChange={(e) => update(sel.id, { text: e.target.value })} />
              </label>
              <label>
                Police
                <select value={sel.font} onChange={(e) => update(sel.id, { font: e.target.value })}>
                  {(FONTS.includes(sel.font) ? FONTS : [sel.font, ...FONTS]).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Couleur du texte
                <input type="color" value={sel.textColor} onChange={(e) => update(sel.id, { textColor: e.target.value })} />
              </label>
              <label className="check">
                <input type="checkbox" checked={sel.textScaled} onChange={(e) => update(sel.id, { textScaled: e.target.checked })} />
                Taille automatique (TextScaled)
              </label>
              {!sel.textScaled && (
                <NumField label="Taille du texte (px)" value={sel.textSize} min={4} max={200} step={1} onChange={(v) => update(sel.id, { textSize: v })} />
              )}
            </>
          )}

          {IMAGE_TYPES.includes(sel.type) && (
            <>
              <h5 className="sect">Image</h5>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) await importImage(f, sel.id);
                }}
              />
              <button className="btn btn-outline btn-sm" onClick={() => fileInput.current?.click()}>
                📁 Importer une image
              </button>
              <label>
                Ou une URL (aperçu)
                <input
                  value={sel.image.startsWith("data:") ? "" : sel.image}
                  placeholder={sel.image.startsWith("data:") ? "(image importée)" : "https://..."}
                  onChange={(e) => setImage(sel.id, e.target.value.trim())}
                />
              </label>
              <label>
                ID Roblox (rbxassetid)
                <input value={sel.assetId} placeholder="123456789" onChange={(e) => update(sel.id, { assetId: e.target.value.replace(/\D/g, "") })} />
              </label>
              <label>
                Mode d&apos;affichage
                <select value={sel.scaleType} onChange={(e) => update(sel.id, { scaleType: e.target.value as UIElement["scaleType"] })}>
                  <option value="Stretch">Stretch (étirer)</option>
                  <option value="Fit">Fit (contenir)</option>
                  <option value="Crop">Crop (remplir)</option>
                </select>
              </label>
              {sel.image && (
                <button className="btn btn-outline btn-sm" onClick={() => setImage(sel.id, "")}>
                  Retirer l&apos;aperçu
                </button>
              )}
              <p className="muted small">
                L&apos;image importée ne sert que d&apos;aperçu ici. Dans Roblox, il faut l&apos;uploader sur le Creator Hub puis coller son ID ci-dessus.
              </p>
            </>
          )}

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
    </>
  );

  const codeContent = (
    <div className="code-wrap">
      <div className="code-toolbar">
        <button className="btn btn-primary btn-sm" onClick={copyCode}>
          {copied ? "Copié ✓" : "Copier"}
        </button>
        <button className="btn btn-outline btn-sm" onClick={reformat} title="Réécrire le code proprement depuis l'écran">
          Reformater
        </button>
      </div>
      <textarea
        className="code-area"
        value={draft}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        onChange={(e) => onCodeChange(e.target.value)}
        onKeyDown={onCodeKeyDown}
      />
      {codeError ? (
        <div className="code-status err">⚠ {codeError}. L&apos;écran garde la dernière version valide.</div>
      ) : (
        <div className="code-status ok">✓ Code synchronisé avec l&apos;écran</div>
      )}
      {warnings.length > 0 && !codeError && (
        <div className="code-warn">
          {warnings.map((w, i) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      )}
      <p className="muted small">
        Tu peux modifier le code : l&apos;écran se met à jour tout seul. Une instruction par ligne (<code>X.Propriété = valeur</code>). Les commentaires sont perdus quand tu modifies l&apos;écran. À coller dans un LocalScript (StarterPlayerScripts).
      </p>
    </div>
  );

  const panels: { id: PanelId; title: string; content: ReactNode }[] = [
    { id: "tools", title: "Outils", content: toolsContent },
    { id: "code", title: "Code Luau", content: codeContent },
  ];
  const byId = (pid: PanelId) => panels.find((p) => p.id === pid)!;
  const docked = (side: "left" | "right") =>
    panels.filter((p) => layout[p.id].open && !layout[p.id].floating && layout[p.id].side === side);
  const floating = panels.filter((p) => layout[p.id].open && layout[p.id].floating);

  const resizerEl = (pid: PanelId) => (
    <div
      className="resizer"
      title="Glisse pour redimensionner"
      onPointerDown={(e) => resizerDown(e, pid)}
      onPointerMove={resizerMove}
      onPointerUp={resizerUp}
      onPointerCancel={resizerUp}
    />
  );

  return (
    <div className="editor">
      <header className="ed-top">
        <button className="btn btn-ghost" onClick={() => router.push("/home")}>
          ← Accueil
        </button>
        <input className="ed-title" value={project.name} onChange={(e) => setProject({ ...project, name: e.target.value })} />
        <div className="ed-top-right">
          <button
            className={"btn btn-sm " + (layout.tools.open ? "btn-primary" : "btn-outline")}
            onClick={() => setPanel("tools", { open: !layout.tools.open })}
          >
            Outils
          </button>
          <button
            className={"btn btn-sm " + (layout.code.open ? "btn-primary" : "btn-outline")}
            onClick={() => setPanel("code", { open: !layout.code.open })}
          >
            Code
          </button>
          <button className="btn btn-ghost btn-sm" title="Remettre les panneaux par défaut" onClick={() => setLayout(DEFAULT_LAYOUT)}>
            ↺ Disposition
          </button>
          <select value={project.device} onChange={(e) => setProject({ ...project, device: e.target.value as DeviceId })}>
            {Object.entries(DEVICES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <button
            className="btn btn-outline btn-sm"
            title={portrait ? "Passer en paysage" : "Tourner l'écran en portrait"}
            onClick={() => setProject({ ...project, orientation: portrait ? "landscape" : "portrait" })}
          >
            ⟳ {portrait ? "Portrait" : "Paysage"}
          </button>
          {saveOk ? <span className="saved">✓ Enregistré</span> : <span className="saved bad">⚠ Stockage plein (image trop lourde ?)</span>}
        </div>
      </header>

      <div className="ed-body">
        {docked("left").map((p) => (
          <Fragment key={p.id}>
            <Panel title={p.title} st={layout[p.id]} onChange={(patch) => setPanel(p.id, patch)}>
              {p.content}
            </Panel>
            {resizerEl(p.id)}
          </Fragment>
        ))}

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
            onDragOver={(e) => e.preventDefault()}
            onDrop={onCanvasDrop}
          >
            {project.elements.map((el) => {
              const isText = TEXT_TYPES.includes(el.type);
              const isImage = IMAGE_TYPES.includes(el.type);
              const innerStyle: CSSProperties = {
                background: elementBackground(el),
                borderRadius: `${el.radius / 10.8}cqh`,
                color: el.textColor,
                boxShadow: el.strokeThickness > 0 ? `inset 0 0 0 ${el.strokeThickness / 10.8}cqh ${el.strokeColor}` : undefined,
                ...(isText
                  ? {
                      fontSize: el.textScaled ? `${el.h * 45}cqh` : `${el.textSize / 10.8}cqh`,
                      ...fontStyle(el.font),
                    }
                  : {}),
              };
              return (
                <div
                  key={el.id}
                  className={"el" + (el.id === selected ? " el-selected" : "")}
                  onPointerDown={(e) => startDrag(e, el, "move")}
                  style={{
                    left: `${el.x * 100}%`,
                    top: `${el.y * 100}%`,
                    width: `${el.w * 100}%`,
                    height: `${el.h * 100}%`,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                  }}
                >
                  <div className="el-inner" style={innerStyle}>
                    {isText && <span className="el-text">{el.text}</span>}
                    {isImage && el.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={el.image} alt="" draggable={false} className="el-photo" style={{ objectFit: OBJECT_FIT[el.scaleType] }} />
                    )}
                    {isImage && !el.image && <span className="el-img">🖼</span>}
                  </div>
                  {el.id === selected && <div className="handle" onPointerDown={(e) => startDrag(e, el, "resize")} />}
                </div>
              );
            })}
            {project.elements.length === 0 && <div className="canvas-empty">Ajoute un élément depuis la boîte à outils</div>}
          </div>
        </main>

        {docked("right").map((p) => (
          <Fragment key={p.id}>
            {resizerEl(p.id)}
            <Panel title={p.title} st={layout[p.id]} onChange={(patch) => setPanel(p.id, patch)}>
              {p.content}
            </Panel>
          </Fragment>
        ))}
      </div>

      {floating.map((p) => (
        <Panel key={p.id} title={byId(p.id).title} st={layout[p.id]} onChange={(patch) => setPanel(p.id, patch)}>
          {p.content}
        </Panel>
      ))}
    </div>
  );
}

/* ---------- Panneau (ancré ou flottant) ---------- */

function Panel({
  title,
  st,
  onChange,
  children,
}: {
  title: string;
  st: PanelState;
  onChange: (patch: Partial<PanelState>) => void;
  children: ReactNode;
}) {
  const dragRef = useRef<{ sx: number; sy: number; fx: number; fy: number } | null>(null);

  function down(e: React.PointerEvent) {
    if (!st.floating) return;
    if ((e.target as HTMLElement).closest("button")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, fx: st.fx, fy: st.fy };
  }
  function move(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    onChange({
      fx: clamp(d.fx + e.clientX - d.sx, 0, window.innerWidth - 120),
      fy: clamp(d.fy + e.clientY - d.sy, 56, window.innerHeight - 60),
    });
  }
  function up() {
    dragRef.current = null;
  }

  const style: CSSProperties = st.floating
    ? { left: st.fx, top: st.fy, width: st.fw, height: st.fh }
    : { width: st.width };

  return (
    <aside className={"panel" + (st.floating ? " floating" : "")} style={style}>
      <div className="panel-head" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <span className="grip">⠿</span>
        <h4>{title}</h4>
        <div className="panel-btns">
          {!st.floating && (
            <button title="Changer de côté" onClick={() => onChange({ side: st.side === "left" ? "right" : "left" })}>
              ⇄
            </button>
          )}
          <button title={st.floating ? "Ancrer sur le côté" : "Détacher (flottant)"} onClick={() => onChange({ floating: !st.floating })}>
            {st.floating ? "⚓" : "⧉"}
          </button>
          <button title="Fermer" onClick={() => onChange({ open: false })}>
            ✕
          </button>
        </div>
      </div>
      <div className="panel-body">{children}</div>
    </aside>
  );
}

function NumField({
  label,
  value,
  min = 0,
  max = 100,
  step = 0.5,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        step={step}
        min={min}
        max={Math.max(min, Math.round(max * 10) / 10)}
        value={Math.round(value * 10) / 10}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0, min, max))}
      />
    </label>
  );
}
