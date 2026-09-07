import test from "node:test";
import assert from "node:assert/strict";
import {
  requiereReintentoAlternativo,
  tieneReintentoAlternativo,
} from "../src/lib/intentos-auto.ts";

const variante = { reintento_alternativo: { elementos: [] } };
const respuestaPrimerIntento = { _meta: { intentos: 1, mejorPuntaje: 69, ejercicio: 1 } };
const respuestaSegundoIntento = { _meta: { intentos: 2, mejorPuntaje: 69, ejercicio: 2 } };

test("una variante reconoce el segundo ejercicio disponible", () => {
  assert.equal(tieneReintentoAlternativo(variante), true);
});

test("un resultado menor de 70 exige el ejercicio alternativo", () => {
  assert.equal(requiereReintentoAlternativo(variante, respuestaPrimerIntento, 69), true);
  assert.equal(requiereReintentoAlternativo(variante, respuestaPrimerIntento, 70), false);
});

test("un resultado bajo deja de exigirlo después del segundo intento", () => {
  assert.equal(requiereReintentoAlternativo(variante, respuestaSegundoIntento, 69), false);
});

test("sin variante nunca se exige un segundo intento", () => {
  assert.equal(requiereReintentoAlternativo({}, respuestaPrimerIntento, 20), false);
});
