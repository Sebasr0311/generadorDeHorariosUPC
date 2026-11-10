import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const SUBJECTS = [/SS301 ESTRUCTURA DE DATOS/i, /ALGORITMOS Y FUNDAMENTOS DE PROGRAMACION/i];

async function buildSchedule(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('./#planificador');
  await page.getByRole('button', { name: /seleccionar materias/i }).first().click();
  for (const name of SUBJECTS) await page.getByRole('button', { name }).first().click();
  await page.getByRole('button', { name: /listo, ver horario/i }).click();
  await expect(page.getByText(/opción 1/i).first()).toBeVisible();
  return errors;
}

async function downloadFrom(page: Page, trigger: () => Promise<void>) {
  const [download] = await Promise.all([page.waitForEvent('download'), trigger()]);
  const path = await download.path();
  return { name: download.suggestedFilename(), bytes: await readFile(path) };
}

async function pdfPagesText(bytes: Buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map(item => ('str' in item ? item.str : '')).join(' '));
  }
  return pages;
}

test('exportación PDF: cada materia aparece una sola vez en el detalle aunque se dicte dos veces por semana', async ({
  page,
}) => {
  const errors = await buildSchedule(page);
  const file = await downloadFrom(page, () => page.getByRole('button', { name: /^PDF$/i }).click());
  expect(file.name).toMatch(/^Traza-Horario-.+\.pdf$/);

  const [grid, ...detailPages] = await pdfPagesText(file.bytes);
  const detail = detailPages.join(' ');
  expect(grid).toContain('TRAZA');
  expect(detail).toContain('Detalle de asignaturas y grupos');
  for (const code of ['SS301', 'SS407']) {
    // The weekly grid shows one block per session; the detail table must show one row per subject.
    expect(grid.split(code).length - 1, `${code} en la cuadrícula`).toBeGreaterThanOrEqual(2);
    expect(detail.split(code).length - 1, `${code} en el detalle`).toBe(1);
  }
  expect(detail).toMatch(/(Lun|Mar|Mié|Jue|Vie|Sáb|Dom) \d{2}:\d{2}.\d{2}:\d{2}, (Lun|Mar|Mié|Jue|Vie|Sáb|Dom) \d{2}:\d{2}/);
  expect(errors).toEqual([]);
});

test('exportación Excel: hoja de detalle con una fila por materia y grupo', async ({ page }) => {
  const errors = await buildSchedule(page);
  const file = await downloadFrom(page, () => page.getByRole('button', { name: /^Excel$/i }).click());
  expect(file.name).toMatch(/^Traza-Horario-.+\.xlsx$/);

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(file.bytes);
  expect(wb.getWorksheet('Horario semanal')).toBeTruthy();
  const details = wb.getWorksheet('Detalle de asignaturas')!;
  const codes: string[] = [];
  details.eachRow((row, n) => {
    if (n > 1) codes.push(String(row.getCell(1).value));
  });
  expect(codes.sort()).toEqual(['SS301', 'SS407']);
  const schedules = codes.map((_, i) => String(details.getRow(i + 2).getCell(4).value));
  for (const s of schedules) expect(s).toMatch(/^\S+ \d{2}:\d{2}–\d{2}:\d{2}(, \S+ \d{2}:\d{2}–\d{2}:\d{2})*$/);
  expect(errors).toEqual([]);
});

test('respaldo JSON y HTML del catálogo se descargan y se pueden reimportar', async ({ page }) => {
  const errors = await buildSchedule(page);
  const json = await downloadFrom(page, () => page.getByRole('button', { name: /Respaldar JSON/i }).click());
  expect(json.name).toMatch(/^Traza-Catalogo-.+\.json$/);
  const catalog = JSON.parse(json.bytes.toString('utf8'));
  expect(catalog.subjects.length).toBeGreaterThan(10);

  const html = await downloadFrom(page, () => page.getByRole('button', { name: /Exportar HTML/i }).click());
  expect(html.name).toMatch(/^Traza-Catalogo-.+\.html$/);
  const embedded = html.bytes.toString('utf8').match(
    /<script id="traza-catalog-json" type="application\/json">([\s\S]*?)<\/script>/
  );
  expect(embedded).not.toBeNull();
  expect(JSON.parse(embedded![1]).subjects.length).toBe(catalog.subjects.length);

  for (const file of [
    { name: json.name, mimeType: 'application/json', buffer: json.bytes },
    { name: html.name, mimeType: 'text/html', buffer: html.bytes },
  ]) {
    await page.getByRole('button', { name: /importar PDF/i }).click();
    await page.getByRole('dialog').locator('input[type="file"]').setInputFiles(file);
    await expect(
      page.getByRole('dialog').getByText(String(catalog.subjects.length), { exact: true }).first()
    ).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /^Cerrar$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('guardar, persistir tras recargar, abrir y eliminar un horario', async ({ page }) => {
  const errors = await buildSchedule(page);
  await page.getByRole('button', { name: /Guardar horario actual/i }).click();
  await page.getByRole('tab', { name: /guardados/i }).click();
  const item = page.locator('.saved-item');
  await expect(item).toHaveCount(1);
  await expect(item).toContainText('2 materias');

  await page.reload();
  await page.getByRole('tab', { name: /guardados/i }).click();
  await expect(page.locator('.saved-item')).toHaveCount(1);
  await page.locator('.saved-item').getByRole('button', { name: /^Abrir$/ }).click();
  await expect(page.getByText(/opción 1/i).first()).toBeVisible();

  await page.getByRole('tab', { name: /guardados/i }).click();
  await page.locator('.saved-item').getByRole('button', { name: /^Eliminar / }).click();
  await expect(page.locator('.saved-item')).toHaveCount(0);
  await expect(page.getByText('Aún no tienes favoritos')).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: /guardados/i }).click();
  await expect(page.getByText('Aún no tienes favoritos')).toBeVisible();
  expect(errors).toEqual([]);
});
