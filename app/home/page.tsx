"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TEMPLATES,
  TemplateId,
  createProject,
  deleteProject,
  getUser,
  listProjects,
  logout,
  User,
} from "@/lib/store";
import { Project } from "@/lib/types";
import MiniPreview from "@/components/MiniPreview";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
    setProjects(listProjects());
    setReady(true);
  }, [router]);

  const filtered = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [projects, query]
  );

  function create(t: TemplateId) {
    const p = createProject(t);
    router.push(`/editor/${p.id}`);
  }

  function remove(id: string) {
    if (!confirm("Supprimer ce design ?")) return;
    deleteProject(id);
    setProjects(listProjects());
  }

  function signOut() {
    logout();
    router.replace("/login");
  }

  if (!ready || !user) return <div className="splash">Chargement…</div>;

  return (
    <div className="home">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">R</span> RbxUI
        </div>
        <button className="btn btn-primary btn-block" onClick={() => create("blank")}>
          + Créer un design
        </button>
        <nav>
          <a className="nav-item active">🏠 Accueil</a>
          <a className="nav-item">📁 Projets</a>
          <a className="nav-item">🧩 Modèles</a>
          <a className="nav-item">⭐ Favoris</a>
        </nav>
        <div className="sidebar-foot">
          <div className="muted small">Éditeur UI Roblox · v0.1</div>
        </div>
      </aside>

      <div className="home-main">
        <header className="topbar">
          <div className="search">
            <span>🔍</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher tes designs" />
          </div>
          <div className="avatar-wrap">
            <button className="avatar" onClick={() => setMenu(!menu)}>
              {user.name.charAt(0).toUpperCase()}
            </button>
            {menu && (
              <div className="dropdown">
                <div className="dd-user">
                  <strong>{user.name}</strong>
                  <span className="muted small">{user.email}</span>
                </div>
                <button onClick={signOut}>Se déconnecter</button>
              </div>
            )}
          </div>
        </header>

        <main className="home-content">
          <section className="banner">
            <h1>Que veux-tu concevoir aujourd&apos;hui ?</h1>
            <div className="chips">
              {TEMPLATES.filter((t) => t.id !== "blank").map((t) => (
                <button key={t.id} className="chip" onClick={() => create(t.id)}>
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>Commencer avec un modèle</h3>
            <div className="tpl-row">
              {TEMPLATES.map((t) => (
                <button key={t.id} className="tpl" onClick={() => create(t.id)}>
                  <div className="tpl-thumb" style={{ background: t.gradient }}>
                    <span>{t.emoji}</span>
                  </div>
                  <div className="tpl-label">{t.label}</div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>Tes designs</h3>
            {filtered.length === 0 ? (
              <div className="empty">
                <div className="empty-ico">🎨</div>
                <p>{projects.length === 0 ? "Aucun design pour l'instant. Crée le premier !" : "Aucun résultat."}</p>
                {projects.length === 0 && (
                  <button className="btn btn-primary" onClick={() => create("blank")}>
                    Créer un design
                  </button>
                )}
              </div>
            ) : (
              <div className="grid">
                {filtered.map((p) => (
                  <div key={p.id} className="card">
                    <button className="card-thumb" onClick={() => router.push(`/editor/${p.id}`)}>
                      <MiniPreview project={p} />
                    </button>
                    <div className="card-row">
                      <div>
                        <div className="card-name">{p.name}</div>
                        <div className="muted small">
                          {p.elements.length} élément{p.elements.length > 1 ? "s" : ""} ·{" "}
                          {new Date(p.updatedAt).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                      <button className="icon-btn" title="Supprimer" onClick={() => remove(p.id)}>
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
