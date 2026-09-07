import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function literal(valor) {
  if (valor === null || valor === undefined) return "null";
  return `'${String(valor).replaceAll("'", "''")}'`;
}

function jsonb(valor) {
  return `${literal(JSON.stringify(valor ?? {}))}::jsonb`;
}

function listaValores(filas, columnas) {
  return filas
    .map((fila) => `  (${columnas.map((columna) => columna.valor(fila[columna.nombre])).join(", ")})`)
    .join(",\n");
}

function corregirContenido(contenido) {
  const copia = structuredClone(contenido ?? {});
  if (!Array.isArray(copia.elementos)) return copia;
  copia.elementos = copia.elementos.map((elemento) => {
    if (
      elemento &&
      typeof elemento === "object" &&
      typeof elemento.texto === "string" &&
      elemento.texto === "No profe, yo no quero revisar la acentuación; solo sé que algunas palabras llevan un palito." &&
      elemento.categoria_correcta === "Inculto formal"
    ) {
      return { ...elemento, categoria_correcta: "Inculto informal" };
    }
    return elemento;
  });
  return copia;
}

async function consultar(tabla, columnas) {
  const { data, error } = await supabase.from(tabla).select(columnas);
  if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`);
  return data ?? [];
}

const [tipos, unidadesOriginales, actividadesOriginales, insignias] = await Promise.all([
  consultar("tipos_actividad", "id,nombre,descripcion"),
  consultar("unidades", "id,nombre,orden,descripcion,reto_comunicativo,unidad_competencia"),
  consultar("actividades", "id,unidad_id,tipo_id,titulo,instrucciones,contenido,orden,aprendizaje_esperado,video_url,requiere_actividad_id"),
  consultar("insignias", "id,nombre,descripcion,icono"),
]);

const unidades = unidadesOriginales
  .map((unidad) => ({
    ...unidad,
    reto_comunicativo:
      unidad.orden === 1
        ? "Sintetizar la idea central de un texto extenso en cinco líneas."
        : unidad.reto_comunicativo,
  }))
  .sort((a, b) => a.orden - b.orden);
const ordenUnidad = new Map(unidades.map((unidad) => [unidad.id, unidad.orden]));
const actividades = actividadesOriginales
  .map((actividad) => ({
    ...actividad,
    titulo: actividad.titulo.replace(
      "Ideas principal, secundaria y terciaria",
      "Ideas principales, secundarias y terciarias",
    ),
    contenido: corregirContenido(actividad.contenido),
  }))
  .sort(
    (a, b) =>
      (ordenUnidad.get(a.unidad_id) ?? 0) - (ordenUnidad.get(b.unidad_id) ?? 0) ||
      a.orden - b.orden ||
      a.titulo.localeCompare(b.titulo, "es"),
  );
tipos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
insignias.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

if (unidades.length === 0 || actividades.length === 0 || tipos.length === 0) {
  throw new Error("El catálogo remoto está vacío; no se generó el seed.");
}

const sql = `-- Catálogo curricular completo y reproducible.
-- Generado por scripts/export-catalog-seed.mjs. No incluye cuentas, grupos,
-- entregas ni otros datos personales.

begin;

insert into public.tipos_actividad (id, nombre, descripcion) values
${listaValores(tipos, [
  { nombre: "id", valor: literal },
  { nombre: "nombre", valor: literal },
  { nombre: "descripcion", valor: literal },
])}
on conflict (id) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion;

insert into public.unidades (id, nombre, orden, descripcion, reto_comunicativo, unidad_competencia) values
${listaValores(unidades, [
  { nombre: "id", valor: literal },
  { nombre: "nombre", valor: literal },
  { nombre: "orden", valor: Number },
  { nombre: "descripcion", valor: literal },
  { nombre: "reto_comunicativo", valor: literal },
  { nombre: "unidad_competencia", valor: literal },
])}
on conflict (id) do update set
  nombre = excluded.nombre,
  orden = excluded.orden,
  descripcion = excluded.descripcion,
  reto_comunicativo = excluded.reto_comunicativo,
  unidad_competencia = excluded.unidad_competencia;

-- Los prerrequisitos se asignan después del upsert para admitir referencias
-- entre actividades del mismo catálogo sin depender del orden de inserción.
insert into public.actividades (
  id, unidad_id, tipo_id, titulo, instrucciones, contenido, orden,
  aprendizaje_esperado, video_url, requiere_actividad_id
) values
${listaValores(actividades.map((actividad) => ({ ...actividad, requiere_actividad_id: null })), [
  { nombre: "id", valor: literal },
  { nombre: "unidad_id", valor: literal },
  { nombre: "tipo_id", valor: literal },
  { nombre: "titulo", valor: literal },
  { nombre: "instrucciones", valor: literal },
  { nombre: "contenido", valor: jsonb },
  { nombre: "orden", valor: Number },
  { nombre: "aprendizaje_esperado", valor: literal },
  { nombre: "video_url", valor: literal },
  { nombre: "requiere_actividad_id", valor: literal },
])}
on conflict (id) do update set
  unidad_id = excluded.unidad_id,
  tipo_id = excluded.tipo_id,
  titulo = excluded.titulo,
  instrucciones = excluded.instrucciones,
  contenido = excluded.contenido,
  orden = excluded.orden,
  aprendizaje_esperado = excluded.aprendizaje_esperado,
  video_url = excluded.video_url,
  requiere_actividad_id = null;

update public.actividades as actividad
set requiere_actividad_id = prerequisitos.requiere_actividad_id
from (values
${actividades
  .filter((actividad) => actividad.requiere_actividad_id)
  .map((actividad) => `  (${literal(actividad.id)}::uuid, ${literal(actividad.requiere_actividad_id)}::uuid)`)
  .join(",\n") || "  (null::uuid, null::uuid)"}
) as prerequisitos(id, requiere_actividad_id)
where actividad.id = prerequisitos.id;

insert into public.insignias (id, nombre, descripcion, icono) values
${listaValores(insignias, [
  { nombre: "id", valor: literal },
  { nombre: "nombre", valor: literal },
  { nombre: "descripcion", valor: literal },
  { nombre: "icono", valor: literal },
])}
on conflict (id) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  icono = excluded.icono;

commit;
`;

const destino = resolve(process.cwd(), "supabase", "seed.sql");
await writeFile(destino, sql, "utf8");
console.log(`Seed generado: ${tipos.length} tipos, ${unidades.length} unidades, ${actividades.length} actividades y ${insignias.length} insignias.`);
