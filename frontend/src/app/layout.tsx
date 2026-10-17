import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bronzorienter",
  description:
    "Interactive Sinnoh Region town map for Pokémon Brilliant Diamond. Navigate routes with Bronzor to inspect wild Pokémon, time-of-day encounter rates, Poké Radar shiny odds, and track caught checklists.",
  icons: {
    icon: "/bronzor.png",
    shortcut: "/bronzor.png",
    apple: "/bronzor.png",
  },
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
