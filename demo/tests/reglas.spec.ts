import { test, expect, type Page } from '@playwright/test';

// La IA puede responder distinto cada vez: por eso se comprueban reglas, no una pantalla exacta.
const modo = process.env.MODO ?? 'preparada';

async function responder(page: Page) {
  await page.goto(`/ui/?modo=${modo}&motor=grabacion&inyectar=1`);
  await page.waitForFunction(() => document.body.dataset.motor);
  const fin = page.evaluate(() => (window as any).uiDemo.pedir('Arma un mercado para 4 personas con 120 mil'));
  const papa = page.locator('[data-cantidad="papa-pastusa"]');
  await papa.waitFor();
  await papa.evaluate((i: HTMLInputElement) => { i.value = '5'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await fin;
  return page.evaluate(() => (window as any).uiDemo.medidas());
}

test('renderizado: no ejecuta HTML del modelo ni salta', async ({ page }) => {
  const m = await responder(page);
  expect(m.xss).toBe(0);
  expect(m.cls).toBeLessThanOrEqual(0.1);
});
test('streaming: actualiza la pantalla por tandas', async ({ page }) => {
  expect((await responder(page)).pintadas).toBeLessThanOrEqual(120);
});
test('DOM: crea solo lo necesario', async ({ page }) => {
  expect((await responder(page)).nodos).toBeLessThanOrEqual(100);
});
test('estado: lo que cambia la persona gana', async ({ page }) => {
  await responder(page);
  await expect(page.locator('[data-cantidad="papa-pastusa"]')).toHaveValue('5');
});
test('accesibilidad: anuncia sin saturar y nombra cada campo', async ({ page }) => {
  expect((await responder(page)).anuncios).toBeLessThanOrEqual(3);
  await expect(page.locator('[data-superficie]')).toHaveAttribute('aria-busy', 'false');
  for (const campo of await page.locator('[data-superficie] input').all()) await expect(campo).toHaveAttribute('aria-label', /.+/);
});
