export const CATEGORIAS_REPORTE_ESTUDIANTE = [
  ["estudiante_acceso", "No puedo entrar"],
  ["estudiante_actividad", "No puedo completar una actividad"],
  ["estudiante_avance", "No puedo continuar"],
  ["estudiante_instruccion", "No entiendo qué hacer"],
  ["estudiante_video", "El video no funciona"],
  ["estudiante_tecnico", "La página no responde"],
  ["estudiante_contenido", "Hay algo incorrecto en el contenido"],
  ["estudiante_otro", "Otro problema"],
] as const;

export const CATEGORIAS_REPORTE_DOCENTE = [
  ["docente_acceso", "No puedo entrar al panel"],
  ["docente_grupo", "Tengo un problema con un grupo"],
  ["docente_estudiantes", "Problema con estudiantes o NIP"],
  ["docente_actividad", "Crear o editar una actividad"],
  ["docente_seguimiento", "No veo bien el avance del grupo"],
  ["docente_video", "Tengo un problema con un video"],
  ["docente_tecnico", "La página no responde"],
  ["docente_otro", "Otro problema"],
] as const;

// Se conservan para que la bandeja administrativa pueda mostrar casos
// históricos si existieran; ya no aparecen en los formularios de ayuda.
export const CATEGORIAS_REPORTE_LEGACY = [
  ["acceso", "Problema de acceso (anterior)"],
  ["actividad", "Actividad (anterior)"],
  ["avance", "Avance (anterior)"],
  ["video", "Video (anterior)"],
  ["carga", "Carga (anterior)"],
  ["contenido", "Contenido (anterior)"],
  ["orientacion", "Orientación (anterior)"],
  ["otro", "Otro problema (anterior)"],
] as const;

export const CATEGORIAS_REPORTE = [
  ...CATEGORIAS_REPORTE_ESTUDIANTE,
  ...CATEGORIAS_REPORTE_DOCENTE,
  ...CATEGORIAS_REPORTE_LEGACY,
] as const;

export type CategoriaReporte = (typeof CATEGORIAS_REPORTE)[number][0];

export const ETIQUETAS_CATEGORIA: Record<string, string> = Object.fromEntries(CATEGORIAS_REPORTE);

export const ESTADOS_REPORTE: Record<string, string> = {
  recibido: "Recibido",
  en_revision: "En revisión",
  necesita_informacion: "Necesita información",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

export const PRIORIDADES_REPORTE: Record<string, string> = {
  baja: "Baja",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

// Son ayudas para quien atiende el caso, no respuestas automáticas. La
// resolución siempre debe confirmar lo que se revisó realmente.
export const SUGERENCIAS_ATENCION: Record<string, string> = {
  estudiante_acceso: "Confirma que el código, el nombre y el NIP coincidan con la lista del grupo. Si el problema continúa, reinicia el NIP desde la ficha del estudiante.",
  estudiante_actividad: "Revisa el intento guardado, la actividad anterior y si la respuesta quedó pendiente de mejorar antes de continuar.",
  estudiante_avance: "Verifica la actividad que mantiene bloqueado el avance y confirma que la reflexión de la unidad esté guardada.",
  estudiante_instruccion: "Aclara el objetivo de la actividad con una indicación breve y señala qué debe guardar para continuar.",
  estudiante_video: "Comprueba que el enlace de YouTube siga disponible y que la actividad conserve la URL correcta.",
  estudiante_tecnico: "Comprueba si el problema se reproduce en otra pestaña o dispositivo y revisa la conexión antes de modificar datos.",
  estudiante_contenido: "Compara el contenido publicado con la versión validada de la actividad antes de corregirlo.",
  docente_acceso: "Confirma el correo, la cuenta docente y, si es la cuenta administrativa, la verificación TOTP antes de revisar otro dato.",
  docente_grupo: "Confirma el grupo visible, su nomenclatura y que la docente sea la responsable de ese grupo.",
  docente_estudiantes: "Revisa la boleta, el nombre normalizado y el estado activo antes de reiniciar un NIP.",
  docente_actividad: "Revisa la actividad y su tipo, instrucciones, respuesta esperada y dependencias antes de editarla.",
  docente_seguimiento: "Compara el avance mostrado con las entregas guardadas y evita interpretar una actividad pendiente como una calificación.",
  docente_video: "Comprueba que el enlace de YouTube sea público, corresponda al video indicado y esté guardado en la actividad correcta.",
  docente_tecnico: "Comprueba si el problema se reproduce en otra pestaña o dispositivo y revisa la conexión antes de modificar datos.",
  docente_otro: "Describe qué se revisó, qué se descartó y cuál es el siguiente paso recomendado.",
};
