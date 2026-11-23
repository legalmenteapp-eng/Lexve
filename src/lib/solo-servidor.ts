/**
 * Impide que estos módulos (con claves secretas) se usen en el navegador.
 * Sustituye a `import "server-only"`, que no funciona dentro de las funciones de Netlify
 * porque esas funciones no se compilan con la condición "react-server" de Next.js.
 */
if (typeof window !== "undefined") {
  throw new Error("Este módulo solo puede usarse en el servidor.");
}
export {};
