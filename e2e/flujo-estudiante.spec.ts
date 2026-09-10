import { expect, test } from "@playwright/test";

const datosDisponibles = Boolean(
  process.env.E2E_GROUP_CODE && process.env.E2E_STUDENT_NAME && process.env.E2E_STUDENT_NIP,
);

test.describe("flujo autenticado de estudiante", () => {
  test.skip(!datosDisponibles, "Requiere un grupo y estudiante de una base efímera de pruebas.");

  test("permite ingresar y abrir la ruta del estudiante", async ({ page }) => {
    await page.goto("/ingreso/estudiante");
    await page.getByLabel("Código de grupo").fill(process.env.E2E_GROUP_CODE!);
    await page.getByLabel("Tu nombre completo").fill(process.env.E2E_STUDENT_NAME!);
    await page.getByLabel("Tu NIP (4 dígitos)").fill(process.env.E2E_STUDENT_NIP!);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/estudiante\/inicio(?:\?.*)?$/);
    await expect(page.getByRole("main")).toBeVisible();

    const primeraActividad = page.locator('a[href^="/estudiante/actividad/"]').first();
    if (await primeraActividad.count()) {
      await primeraActividad.click();
      await expect(page).toHaveURL(/\/estudiante\/actividad\//);
      await expect(page.getByRole("main")).toBeVisible();
    }
  });
});
