// Mismo criterio que normalizar_nombre() en la base de datos: mayúsculas,
// sin acentos, sin espacios de más. Se aplica al pegar, comparar y guardar;
// mientras la docente escribe se conserva el texto tal como lo tecleó para
// no borrar el espacio que necesita antes de la siguiente palabra.
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}
