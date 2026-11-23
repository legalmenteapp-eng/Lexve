import { sesion } from "@/lib/auth";
import { Select, Titulo } from "@/components/ui";
import { ESTADOS_CASO, MATERIAS } from "@/lib/tipos";
import { crearCaso } from "../../acciones";

export default async function NuevoCaso({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  const { supabase } = await sesion();
  const { data: clientes } = await supabase.from("clientes").select("id, nombre").order("nombre");
  return (
    <>
      <Titulo>Nuevo caso</Titulo>
      <form action={crearCaso} className="tarjeta grid max-w-4xl gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="etiqueta">Título / asunto *</label>
          <input name="titulo" required className="input" placeholder="Ej.: Cobro de bolívares por intimación contra…" />
        </div>
        <div>
          <label className="etiqueta">Cliente *</label>
          <select name="cliente_id" required defaultValue={cliente ?? ""} className="input">
            <option value="">Seleccione…</option>
            {clientes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiqueta">Código interno (opcional)</label>
          <input name="codigo" className="input" placeholder="Se genera automáticamente: LEX-AAAA-NNN" />
        </div>
        <div>
          <label className="etiqueta">Materia</label>
          <Select name="materia" opciones={MATERIAS} defecto="civil" />
        </div>
        <div>
          <label className="etiqueta">Estado</label>
          <Select name="estado" opciones={ESTADOS_CASO} defecto="abierto" />
        </div>
        <div>
          <label className="etiqueta">N.º de expediente</label>
          <input name="numero_expediente" className="input" placeholder="AP11-V-2026-000123" />
        </div>
        <div>
          <label className="etiqueta">Etapa procesal</label>
          <input name="etapa" className="input" placeholder="Admisión, contestación, pruebas…" />
        </div>
        <div>
          <label className="etiqueta">Tribunal</label>
          <input name="tribunal" className="input" />
        </div>
        <div>
          <label className="etiqueta">Circunscripción judicial</label>
          <input name="circunscripcion" className="input" placeholder="Área Metropolitana de Caracas" />
        </div>
        <div>
          <label className="etiqueta">Contraparte</label>
          <input name="contraparte" className="input" />
        </div>
        <div>
          <label className="etiqueta">Cuantía (USD)</label>
          <input name="cuantia" type="number" step="0.01" className="input" />
        </div>
        <div>
          <label className="etiqueta">Prioridad</label>
          <Select name="prioridad" opciones={{ "1": "Alta", "2": "Media", "3": "Baja" }} defecto="2" />
        </div>
        <div>
          <label className="etiqueta">Modalidad de honorarios</label>
          <Select name="tarifa_tipo" opciones={{ por_hora: "Por hora", fija: "Monto fijo", cuota_litis: "Cuota litis (%)", iguala: "Iguala mensual" }} defecto="por_hora" />
        </div>
        <div>
          <label className="etiqueta">Monto / % de honorarios</label>
          <input name="tarifa_monto" type="number" step="0.01" className="input" />
        </div>
        <div>
          <label className="etiqueta">Carpeta de Google Drive del caso</label>
          <input name="drive_folder_url" className="input" placeholder="https://drive.google.com/drive/folders/…" />
        </div>
        <div className="md:col-span-2">
          <label className="etiqueta">Descripción / hechos</label>
          <textarea name="descripcion" rows={5} className="input" />
        </div>
        <div className="md:col-span-2">
          <button className="btn">Crear caso</button>
          <span className="ml-3 text-xs text-slate-500">Quedarás como abogado responsable; luego puedes añadir al equipo.</span>
        </div>
      </form>
    </>
  );
}
