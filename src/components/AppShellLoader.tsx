"use client";

import dynamic from "next/dynamic";

// Kein SSR: die App hält ihren Zustand in localStorage und ist rein clientseitig,
// ein serverseitig vorgerenderter Leerzustand würde nur unnötig Hydration-Mismatches riskieren.
const AppShell = dynamic(() => import("./AppShell").then((m) => m.AppShell), {
  ssr: false,
  loading: () => (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-1 items-center justify-center px-4 py-4 text-neutral-400">
      Lädt…
    </div>
  ),
});

export function AppShellLoader() {
  return <AppShell />;
}
