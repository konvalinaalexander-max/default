import type { NextConfig } from "next";

/**
 * Kurzkennung des gebauten Stands. Vercel stellt beim Bauen die Commit-Kennung bereit;
 * sie wird hier fest in die App eingebaut, damit man auf dem Handy ablesen kann, welche
 * Version gerade läuft - sonst lässt sich nicht unterscheiden, ob eine Änderung schon
 * ausgeliefert ist oder ob der Browser noch die alte Fassung zeigt.
 */
const buildKennung =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "lokal";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: buildKennung,
  },
};

export default nextConfig;
