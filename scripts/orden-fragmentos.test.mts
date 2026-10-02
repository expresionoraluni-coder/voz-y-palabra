import test from "node:test";
import assert from "node:assert/strict";
import { calificarOrden } from "../src/lib/calificacion-ordenar-fragmentos.ts";

const contenido = {
  fragmentos: ["A", "B", "C", "Distractor"],
  orden_correcto: [0, 1, 2],
};

test("una secuencia completa y correcta obtiene 100", () => {
  assert.deepEqual(calificarOrden(contenido, [0, 1, 2]), {
    puntajeAuto: 100,
    resultadoPorPosicion: [true, true, true],
  });
});

test("un distractor extra se penaliza y no permite un falso 100", () => {
  assert.deepEqual(calificarOrden(contenido, [0, 1, 2, 3]), {
    puntajeAuto: 75,
    resultadoPorPosicion: [true, true, true, false],
  });
});

test("fragmentos omitidos también cuentan en el denominador", () => {
  assert.deepEqual(calificarOrden(contenido, [0, 1]), {
    puntajeAuto: 67,
    resultadoPorPosicion: [true, true],
  });
});

test("un fragmento fuera de posición aparece como error", () => {
  assert.deepEqual(calificarOrden(contenido, [0, 2, 1]), {
    puntajeAuto: 33,
    resultadoPorPosicion: [true, false, false],
  });
});
