// Mismo criterio que normalizar_nombre() en la base de datos: mayúsculas,
// sin acentos, sin espacios de más. Se aplica también aquí (no solo en el
// servidor) para que la docente vea en la tabla exactamente lo que se va a
// guardar, antes de enviar.
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}
