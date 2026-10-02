import { expect, test } from "@playwright/test";

const credencialesDisponibles = Boolean(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);

test.describe("flujo autenticado de administración", () => {
  test.skip(!credencialesDisponibles, "Requiere una cuenta administrativa de una base efímera de pruebas.");

  test("exige MFA antes de mostrar el panel", async ({ page }) => {
    await page.goto("/ingreso/profesora");
    await page.getByLabel("Correo").fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel("Contraseña").fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/ingreso\/admin\/verificar|\/admin/);

    const codigoMfa = process.env.E2E_ADMIN_MFA_CODE;
    if (!codigoMfa) {
      await expect(page).toHaveURL(/\/ingreso\/admin\/verificar/);
      await expect(page.getByRole("heading", { name: "Confirma tu identidad" })).toBeVisible();
      return;
    }

    await page.getByLabel("Código de seguridad").fill(codigoMfa);
    await page.getByRole("button", { name: "Entrar al panel" }).click();
    await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
    await expect(page.getByRole("main")).toBeVisible();
  });
});
