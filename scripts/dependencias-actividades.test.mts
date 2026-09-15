import test from "node:test";
import assert from "node:assert/strict";
import { esDependenciaDosNiveles } from "../src/lib/dependencias-actividades.ts";

test("conserva el requisito entre actividades de clasificación de dos niveles", () => {
  assert.equal(esDependenciaDosNiveles("clasificacion", "clasificacion"), true);
});

test("no convierte una secuencia ordinaria en bloqueo entre actividades", () => {
  assert.equal(esDependenciaDosNiveles("corregir_ortografia", "corregir_ortografia"), false);
  assert.equal(esDependenciaDosNiveles("clasificacion", "corregir_ortografia"), false);
  assert.equal(esDependenciaDosNiveles(null, "clasificacion"), false);
});
