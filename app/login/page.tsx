"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, login } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (getUser()) router.replace("/home");
  }, [router]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return setError("Entre une adresse e-mail valide.");
    if (password.length < 4) return setError("Le mot de passe doit faire au moins 4 caractères.");
    // Démo : n'importe quel compte fonctionne. À remplacer par Supabase Auth.
    login(email);
    router.push("/home");
  }

  function fake(provider: string) {
    login(`${provider.toLowerCase()}@demo.com`);
    router.push("/home");
  }

  return (
    <main className="login">
      <section className="login-hero">
        <div className="brand brand-light">
          <span className="brand-logo">R</span> RbxUI Studio
        </div>
        <div className="login-hero-text">
          <h1>Dessine ton interface Roblox.<br />Récupère le code Luau.</h1>
          <p>Place tes éléments sur l&apos;écran, on génère le script en direct. Zéro Instance.new à écrire à la main.</p>
        </div>
        <div className="hero-cards" aria-hidden>
          <div className="hc hc1" />
          <div className="hc hc2"><span /><span /><span /></div>
          <div className="hc hc3" />
        </div>
      </section>

      <section className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <h2>{mode === "login" ? "Connecte-toi" : "Crée ton compte"}</h2>
          <p className="muted">
            {mode === "login" ? "Content de te revoir 👋" : "C'est gratuit et ça prend 10 secondes."}
          </p>

          <button type="button" className="btn btn-outline btn-block" onClick={() => fake("Google")}>
            <span className="g-dot">G</span> Continuer avec Google
          </button>
          <button type="button" className="btn btn-outline btn-block" onClick={() => fake("Discord")}>
            <span className="g-dot d">D</span> Continuer avec Discord
          </button>

          <div className="sep"><span>ou</span></div>

          <label>
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" autoFocus />
          </label>
          <label>
            Mot de passe
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="btn btn-primary btn-block btn-lg">
            {mode === "login" ? "Se connecter" : "S'inscrire"}
          </button>

          <p className="switch">
            {mode === "login" ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
            <button type="button" className="link" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
              {mode === "login" ? "Inscris-toi" : "Connecte-toi"}
            </button>
          </p>
          <p className="demo-note">Mode démo : n&apos;importe quel e-mail fonctionne pour l&apos;instant.</p>
        </form>
      </section>
    </main>
  );
}
