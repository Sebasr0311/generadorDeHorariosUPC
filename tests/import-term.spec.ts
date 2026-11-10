import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const PDF_2027_1 = 'tests/fixtures/academusoft-sin-docentes.pdf';
const baseCatalog = JSON.parse(readFileSync('src/data/catalogo-base.json', 'utf8'));

function trazaHtml(term: string) {
  const catalog = { ...baseCatalog, id: `fixture-${term}`, term, label: `${term} · fixture` };
  const json = JSON.stringify(catalog).replace(/</g, '\\u003c');
  return Buffer.from(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Catálogo ${term}</title></head><body><script id="traza-catalog-json" type="application/json">${json}</script></body></html>`,
    'utf8'
  );
}

async function openImport(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto('./#planificador');
  await expect(page.locator('.catalog-header-tag')).toContainText('2026-2');
  await page.getByRole('button', { name: /importar PDF/i }).click();
  return errors;
}

test('PDF 2027-1: detects the term, infers probable teachers, and stays active after reload', async ({
  page,
}) => {
  const errors = await openImport(page);
  await page.getByRole('dialog').locator('input[type="file"]').setInputFiles(PDF_2027_1);

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Período que vas a importar')).toHaveValue('2027-1');
  await expect(dialog.locator('.term-check.ok')).toContainText('Período correcto');
  await expect(dialog.locator('.term-check.ok')).toContainText('siguiente a 2026-2');

  const diff = dialog.locator('.diff-grid');
  await expect(diff.locator('div', { hasText: 'Eliminados' }).locator('strong')).toHaveText('8');
  await expect(dialog.locator('.missing-subjects')).toContainText('51 materias de 2026-2 no aparecen');
  await expect(dialog.getByRole('button', { name: /advertencias? de interpretación/ })).toHaveCount(0);

  const summary = dialog.locator('.teacher-summary');
  await expect(summary).toContainText(/[1-9]\d* con profesor probable: mismo día y hora que en 2026-2/);
  await expect(summary).toContainText(/\d+ con profesor por confirmar/);
  await expect(dialog.locator('.diff-list')).toContainText(/profesor por confirmar|profesor probable/);

  await dialog.getByRole('button', { name: /^Confirmar catálogo/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.catalog-header-tag')).toContainText('2027-1');
  await expect(page.getByText(/Se cargó 2027-1/).first()).toBeVisible();

  await page.reload();
  await expect(page.locator('.catalog-header-tag')).toContainText('2027-1');
  await page.goto('./');
  await page.goto('./#planificador');
  await expect(page.locator('.catalog-header-tag')).toContainText('2027-1');
  expect(errors).toEqual([]);
});

test('HTML from an older term warns that it is not the next schedule', async ({ page }) => {
  const errors = await openImport(page);
  await page
    .getByRole('dialog')
    .locator('input[type="file"]')
    .setInputFiles({ name: 'Traza-Catalogo-2026-1.html', mimeType: 'text/html', buffer: trazaHtml('2026-1') });

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Período que vas a importar')).toHaveValue('2026-1');
  const alert = dialog.locator('.term-check.risk');
  await expect(alert).toContainText('Este no es el horario siguiente');
  await expect(alert).toContainText('No está actualizado');
  await expect(alert).toContainText('2027-1');
  await expect(dialog.getByRole('button', { name: /Importar de todas formas/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('HTML import re-evaluates the risk when the term is edited, and imports on demand', async ({
  page,
}) => {
  const errors = await openImport(page);
  await page
    .getByRole('dialog')
    .locator('input[type="file"]')
    .setInputFiles({ name: 'Traza-Catalogo-2026-2.html', mimeType: 'text/html', buffer: trazaHtml('2026-2') });

  const dialog = page.getByRole('dialog');
  const term = dialog.getByLabel('Período que vas a importar');
  await expect(dialog.locator('.term-check.risk')).toContainText('mismo período');

  await term.fill('2027-2');
  await expect(dialog.locator('.term-check.risk')).toContainText('el siguiente a 2026-2 es 2027-1');

  await term.fill('2027-1');
  await expect(dialog.locator('.term-check.ok')).toBeVisible();
  await dialog.getByRole('button', { name: /^Confirmar catálogo/ }).click();
  await expect(page.locator('.catalog-header-tag')).toContainText('2027-1');
  await expect(page.getByText(/Se cargó 2027-1/).first()).toBeVisible();
  await page.reload();
  await expect(page.locator('.catalog-header-tag')).toContainText('2027-1');
  expect(errors).toEqual([]);
});
