<<<<<<< HEAD
# RbxUI Studio

Éditeur visuel d'interfaces Roblox (style Canva) : tu places tes éléments sur l'écran au milieu, le code Luau se génère en direct à droite, la boîte à outils est à gauche.

## Lancer

```bash
npm install
npm run dev
```

Ou déploie directement sur Vercel (framework détecté automatiquement : Next.js).

## Structure

- `app/login` : page de connexion (démo : n'importe quel e-mail marche, stocké en localStorage)
- `app/home` : accueil (modèles, recherche, tes designs)
- `app/editor/[id]` : éditeur à trois colonnes
- `components/Editor.tsx` : canvas, drag & resize, panneau de propriétés
- `lib/luau.ts` : générateur de code Luau (UDim2 en Scale)
- `lib/store.ts` : comptes et projets (localStorage pour l'instant, à brancher sur Supabase)
- `lib/types.ts` : types partagés

## Prochaines étapes possibles

- Auth + sauvegarde des projets avec Supabase
- Imbrication (déposer un élément dans un Frame, UIListLayout, etc.)
- Bascule Scale / Offset par élément
- Export `.rbxmx`
- Plus d'éléments (ScrollingFrame, TextBox, UIStroke, UIGradient...)
=======
# uify-roblox
>>>>>>> 4099a123f5e9853464c49cc0581a897e6a75f8a9
