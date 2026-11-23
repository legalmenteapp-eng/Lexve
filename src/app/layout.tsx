import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LexVE · Backoffice jurídico",
  description: "Gestión de casos, IA jurídica, jurisprudencia del TSJ y facturación para despachos venezolanos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-VE">
      <body>{children}</body>
    </html>
  );
}
