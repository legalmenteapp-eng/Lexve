import { marked } from "marked";

/** Renderiza Markdown generado por la IA. El HTML crudo se escapa antes de convertir. */
export function Markdown({ texto }: { texto: string }) {
  const seguro = texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = marked.parse(seguro, { async: false, gfm: true, breaks: false }) as string;
  return <div className="prosa text-sm" dangerouslySetInnerHTML={{ __html: html }} />;
}
