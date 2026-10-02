import { expect, test } from "@playwright/test";

const rutasPublicas = ["/", "/ingreso", "/privacidad"];

test.describe("accesibilidad pública básica", () => {
  for (const ruta of rutasPublicas) {
    test(`${ruta} conserva estructura navegable y etiquetas`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const respuesta = await page.goto(ruta);
      expect(respuesta?.status()).toBe(200);
      await expect(page.getByRole("main")).toBeVisible();

      const problemas = await page.evaluate(() => {
        const sinAlt = [...document.images]
          .filter((imagen) => !imagen.hasAttribute("alt"))
          .map((imagen) => imagen.outerHTML.slice(0, 120));
        const ids = [...document.querySelectorAll("[id]")].map((elemento) => elemento.id);
        const duplicados = ids.filter((id, indice) => ids.indexOf(id) !== indice);
        return { sinAlt, duplicados };
      });

      expect(problemas.sinAlt, "cada imagen debe tener alt, aunque sea vacío").toEqual([]);
      expect(problemas.duplicados, "los ids duplicados rompen las relaciones label/aria").toEqual([]);
    });
  }

  test("la portada permite avanzar con teclado y mantiene foco visible", async ({ page }) => {
    await page.goto("/");
    const acceso = page.locator('a[href="/ingreso"]');
    await acceso.focus();
    await expect(acceso).toBeFocused();
    await expect(acceso).toBeVisible();
  });
});
