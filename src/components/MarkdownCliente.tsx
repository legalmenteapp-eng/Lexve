"use client";
import { marked } from "marked";

export function Markdown({ texto }: { texto: string }) {
  const seguro = texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return <div className="prosa text-sm" dangerouslySetInnerHTML={{ __html: marked.parse(seguro, { async: false }) as string }} />;
}
