import { expect, test } from "@playwright/test";

test("la portada usa un enlace real para entrar", async ({ page }) => {
  await page.goto("/");

  const entrar = page.getByRole("link", { name: "Entrar" });
  await expect(entrar).toHaveAttribute("href", "/ingreso");
  await expect(entrar.locator("button")).toHaveCount(0);

  await Promise.all([
    page.waitForURL(/\/ingreso$/),
    entrar.click(),
  ]);
});

test("el acceso estudiantil detiene un correo puesto por autocompletado", async ({ page }) => {
  await page.goto("/ingreso/estudiante");

  await page.getByLabel("Código de grupo").fill("1IM4-2026");
  await page.getByLabel("Tu nombre completo").fill("docente@ejemplo.edu.mx");
  await page.getByLabel("Tu NIP (4 dígitos)").fill("1234");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.locator("form [role=\"alert\"]")).toContainText(
    "En “Tu nombre completo” aparece un correo.",
  );
});

test("la información pública explica el uso educativo, de investigación y los borradores", async ({ page }) => {
  await page.goto("/privacidad");

  await expect(page.getByText("M. en C. Monserrat Nieto Cuevas").first()).toBeVisible();
  await expect(page.getByText(/fines educativos/i)).toBeVisible();
  await expect(page.getByText(/investigación pedagógica/i)).toBeVisible();
  await expect(page.getByText(/Borradores antes de entregar/i)).toBeVisible();
});
