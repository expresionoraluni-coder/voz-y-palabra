import test from "node:test";
import assert from "node:assert/strict";
import { actividadAbierta } from "../src/lib/fecha-mexico.ts";

test("una actividad sin fecha de apertura permanece cerrada", () => {
  assert.equal(actividadAbierta(null, "2026-09-15"), false);
  assert.equal(actividadAbierta(undefined, "2026-09-15"), false);
});

test("la actividad se abre durante el día indicado en México y permanece abierta", () => {
  assert.equal(actividadAbierta("2026-09-15", "2026-09-14"), false);
  assert.equal(actividadAbierta("2026-09-15", "2026-09-15"), true);
  assert.equal(actividadAbierta("2026-09-15", "2026-09-16"), true);
});
