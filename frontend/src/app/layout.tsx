import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pokémon Brilliant Diamond — Interactive Sinnoh Route & Shiny Map",
  description:
    "Interactive Sinnoh Region map for Pokémon Brilliant Diamond. Zoom into routes to inspect catchable Pokémon, Morning/Day/Night encounter rates, Poké Radar shiny odds, and track your Sinnoh checklist.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
