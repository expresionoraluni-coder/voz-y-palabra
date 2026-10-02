import test from "node:test";
import assert from "node:assert/strict";
import {
  calibracionEsSolida,
  casoCalibracion,
  mensajeCalibracion,
} from "../src/lib/calibracion-confianza.ts";

test("una calibración cercana con resultado bajo no es sólida", () => {
  assert.equal(casoCalibracion(3, 50), "bien_calibrado_bajo");
  assert.equal(calibracionEsSolida(casoCalibracion(3, 50)), false);
  assert.match(mensajeCalibracion(3, 50) ?? "", /repasar/);
});

test("solo la calibración alineada con resultado suficiente es sólida", () => {
  assert.equal(casoCalibracion(3, 70), "bien_calibrado_alto");
  assert.equal(calibracionEsSolida(casoCalibracion(3, 70)), true);
});

test("los límites de confianza conservan sobreconfianza y subconfianza", () => {
  assert.equal(casoCalibracion(1, 25), "bien_calibrado_bajo");
  assert.equal(casoCalibracion(1, 26), "subconfianza");
  assert.equal(casoCalibracion(5, 75), "bien_calibrado_alto");
  assert.equal(casoCalibracion(5, 74), "sobreconfianza");
});
