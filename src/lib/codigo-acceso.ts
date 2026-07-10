const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para evitar confusiones

export function generarCodigoAcceso(nombreGrupo: string): string {
  const prefijo = nombreGrupo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase() || "GRUPO";

  let sufijo = "";
  for (let i = 0; i < 4; i++) {
    sufijo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }

  return `${prefijo}-${sufijo}`;
}
