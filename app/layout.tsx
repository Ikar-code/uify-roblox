import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RbxUI Studio — Éditeur d'interfaces Roblox",
  description: "Crée visuellement ton UI Roblox et obtiens le code Luau en direct.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
