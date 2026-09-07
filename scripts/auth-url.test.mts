import assert from "node:assert/strict";
import test from "node:test";
import { callbackConfirmacionDocente, destinoConfirmacionSeguro } from "../src/lib/auth-url.ts";

const base = "https://voz-y-palabra.netlify.app/auth/confirm";

test("conserva únicamente destinos internos de confirmación", () => {
  assert.equal(destinoConfirmacionSeguro("/ingreso/profesora", base).href, "https://voz-y-palabra.netlify.app/ingreso/profesora");
  assert.equal(
    destinoConfirmacionSeguro("/ingreso/profesora/verificar?paso=perfil#nombre", base).href,
    "https://voz-y-palabra.netlify.app/ingreso/profesora/verificar?paso=perfil#nombre",
  );
});

test("rechaza autoridades encubiertas y destinos no autorizados", () => {
  const casos = [
    null,
    "",
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example/",
    "/\\\\evil.example/",
    "/\t/evil.example/",
    "/\r/evil.example/",
    "/\n/evil.example/",
    "/admin",
  ];
  for (const caso of casos) {
    assert.equal(destinoConfirmacionSeguro(caso, base).href, "https://voz-y-palabra.netlify.app/ingreso/profesora");
  }
});

test("rechaza las variantes después de decodificarlas como query string", () => {
  for (const codificado of ["%2F%5Cevil.example", "%2F%09%2Fevil.example", "%2F%0A%2Fevil.example", "%2F%0D%2Fevil.example"]) {
    const valor = new URL(`https://sitio.test/?next=${codificado}`).searchParams.get("next");
    assert.equal(destinoConfirmacionSeguro(valor, base).href, "https://voz-y-palabra.netlify.app/ingreso/profesora");
  }
});

test("no confía en un origen base o de callback ajeno a la aplicación", () => {
  assert.equal(
    destinoConfirmacionSeguro("/ingreso/profesora/verificar", "https://evil.example/auth/confirm").href,
    "https://voz-y-palabra.netlify.app/ingreso/profesora/verificar",
  );
  assert.equal(
    callbackConfirmacionDocente("https://evil.example"),
    "https://voz-y-palabra.netlify.app/auth/confirm?next=%2Fingreso%2Fprofesora%2Fverificar",
  );
});
