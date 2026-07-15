const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para evitar confusiones

export function generarCodigoAcceso(nombreGrupo: string): string {
  const prefijo = nombreGrupo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase() || "GRUPO";

  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let sufijo = "";
  for (let i = 0; i < 4; i++) {
    sufijo += ALFABETO[bytes[i] % ALFABETO.length];
  }

  return `${prefijo}-${sufijo}`;
}
