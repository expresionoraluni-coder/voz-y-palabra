export type ReglaContrasena = {
  etiqueta: string;
  cumple: boolean;
};

export function obtenerReglasContrasena(contrasena: string): ReglaContrasena[] {
  return [
    { etiqueta: "12 caracteres como mínimo", cumple: contrasena.length >= 12 },
    { etiqueta: "Una letra mayúscula", cumple: /[A-ZÁÉÍÓÚÜÑ]/.test(contrasena) },
    { etiqueta: "Una letra minúscula", cumple: /[a-záéíóúüñ]/.test(contrasena) },
    { etiqueta: "Un número", cumple: /\d/.test(contrasena) },
    { etiqueta: "Un símbolo", cumple: /[^\p{L}\p{N}\s]/u.test(contrasena) },
  ];
}

export function esContrasenaValida(contrasena: string) {
  return obtenerReglasContrasena(contrasena).every((regla) => regla.cumple);
}
