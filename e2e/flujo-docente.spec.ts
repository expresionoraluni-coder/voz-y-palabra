import { expect, test } from "@playwright/test";

const datosDisponibles = Boolean(process.env.E2E_TEACHER_EMAIL && process.env.E2E_TEACHER_PASSWORD);

test.describe("flujo autenticado de docente", () => {
  test.skip(!datosDisponibles, "Requiere una cuenta docente de una base efímera de pruebas.");

  test("permite iniciar sesión y abrir el panel docente", async ({ page }) => {
    await page.goto("/ingreso/profesora");
    await page.getByLabel("Correo").fill(process.env.E2E_TEACHER_EMAIL!);
    await page.getByLabel("Contraseña").fill(process.env.E2E_TEACHER_PASSWORD!);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/docente(?:\/.*)?$/);
    await expect(page.getByRole("main")).toBeVisible();
  });
});
