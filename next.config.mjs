/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  // Netlify define NETLIFY=true durante el build: así la app sabe que debe usar
  // la función en segundo plano para la IA (ver src/lib/lanzar-trabajo.ts).
  env: { LEXVE_EJECUTOR: process.env.NETLIFY === "true" ? "netlify" : "local" },
};

export default nextConfig;
