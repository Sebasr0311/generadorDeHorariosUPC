import { test, expect } from '@playwright/test';

test('landing pública, sección Mi pensum, navegación y ausencia de desbordamiento horizontal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: /tu semestre/i })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /Explora el pensum, elige materias y genera horarios/i })
  ).toBeVisible();
  await expect(page.getByText('De un PDF a tu horario ideal', { exact: false })).toBeVisible();
  await expect(page.getByText('No es un sitio oficial', { exact: false })).toBeVisible();
  const width = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(width, `Desbordamiento de ${width}px`).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

test('módulo Mi pensum: búsqueda global, por semestre, prerrequisitos por nombre, advertencia sin grupos y transferencia al planificador', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('./');

  // Entrar a Mi pensum desde la landing
  await page.getByRole('button', { name: /Explorar mi pensum/i }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: /Explora tu pensum/i })
  ).toBeVisible();
  await expect(page.getByText('El período 10 no tiene información en la fuente suministrada').first()).toBeVisible();

  // Verificar vista "Todas las materias" (paginada de a 8 tarjetas por página, 62 totales en 8 páginas)
  await expect(page.locator('.pensum-course-card')).toHaveCount(8);
  await expect(page.locator('.pensum-pagination-top')).toBeVisible();
  await expect(page.locator('.pensum-pagination-top .pensum-page-num-btn')).toHaveCount(8);

  // Búsqueda acento-insensible y por código para FS400 (Electromagnetismo)
  const searchInput = page.getByLabel('Buscar materia en el pensum');
  for (const term of ['electromagnetismo', 'ELECTROMAGNETISMO', 'electromagnétismo', 'FS400']) {
    await searchInput.fill(term);
    await expect(page.locator('.pensum-course-card')).toHaveCount(1);
    await expect(page.locator('.pensum-course-card').first()).toContainText('ELECTROMAGNETISMO');
    await expect(page.locator('.pensum-course-card').first()).toContainText(
      'Debes haber aprobado MECANICA'
    );
  }

  // Seleccionar FS400 desde "Todas las materias"
  await page.getByRole('button', { name: /Seleccionar FS400 ELECTROMAGNETISMO/i }).click();
  await expect(page.locator('.pensum-tray-panel')).toContainText('FS400');

  // Limpiar búsqueda y verificar prerrequisitos por nombre en SS301, SS463 y requisito numérico en SS802
  await searchInput.fill('SS301');
  await expect(page.locator('.pensum-course-card').first()).toContainText(
    'Debes haber aprobado PROGRAMACION DE COMPUTADORES I'
  );
  await searchInput.fill('SS463');
  await expect(page.locator('.pensum-course-card').first()).toContainText(
    'Debes haber aprobado ESTRUCTURA DE DATOS'
  );
  await searchInput.fill('SS802');
  await expect(page.locator('.pensum-course-card').first()).toContainText('Requiere 70 créditos');
  await searchInput.fill('');

  // Cambiar a "Por semestre" y navegar a Semestre III
  await page.getByRole('tab', { name: /Por semestre/i }).click();
  await page.getByRole('button', { name: /^Semestre III \(/i }).click();
  await expect(page.locator('.pensum-course-card')).toHaveCount(8);

  // Seleccionar y deseleccionar sin duplicados SS301 (Estructura de Datos)
  const ss301Btn = page.getByRole('button', { name: /Seleccionar SS301 ESTRUCTURA DE DATOS/i });
  await ss301Btn.click();
  await expect(page.getByRole('button', { name: /Quitar SS301 ESTRUCTURA DE DATOS$/i })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  // Cambiar a Semestre V y elegir SS802 (Base de Datos Avanzadas)
  await page.getByRole('button', { name: /^Semestre V \(/i }).click();
  await expect(page.locator('.pensum-course-card')).toHaveCount(7);
  await page.getByRole('button', { name: /Seleccionar SS802 BASE DE DATOS AVANZADAS/i }).click();

  // Cambiar a Semestre IX y elegir SS909 (Trabajo de Grado II - sin grupos publicados)
  await page.getByRole('button', { name: /^Semestre IX \(/i }).click();
  await expect(page.locator('.pensum-course-card')).toHaveCount(4);
  await expect(page.locator('.pensum-course-card').filter({ hasText: 'SS909' })).toContainText(
    'Debes haber aprobado PROYECTO DE GRADO I'
  );
  await page.getByRole('button', { name: /Seleccionar SS909 TRABAJO DE GRADO II/i }).click();

  // Debe mostrarse advertencia explícita por materia sin grupos publicados
  await expect(page.locator('.pensum-unoffered-alert')).toContainText('SS909');

  // Pulsar "Armar mi horario" activa compuerta explícita para decidir sobre la materia sin grupo
  await page.locator('.pensum-cta-build').click();
  await expect(page.getByRole('button', { name: /Generar con las 3 con grupo/i })).toBeVisible();
  await page.getByRole('button', { name: /Generar con las 3 con grupo/i }).click();

  // Ya en el planificador: las 3 materias con grupo generan horario y la 4ta (SS909) muestra alerta explícita (no se omite silenciosamente)
  await expect(page.getByRole('heading', { name: /construye tu horario/i })).toBeVisible();
  await expect(page.locator('.planner-unoffered-banner')).toContainText('SS909');
  await expect(page.getByText(/opción 1/i).first()).toBeVisible();

  // Volver a Mi pensum desde el planificador: la selección permanece intacta
  await page.getByRole('button', { name: /Mi pensum/i }).first().click();
  await expect(page.locator('.pensum-tray-item')).toHaveCount(4);

  // Limpiar selección con confirmación
  await page.locator('.pensum-clear-trigger').click();
  await expect(page.locator('.pensum-clear-confirm')).toBeVisible();
  await page.getByRole('button', { name: /Sí, limpiar/i }).click();
  await expect(page.locator('.pensum-tray-item')).toHaveCount(0);

  // Verificar responsive en todos los tamaños requeridos: 320, 375, 390, 430, 768, 1024, 1280, 1440
  for (const w of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width: w, height: 800 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `Overflow en Mi pensum a ${w}px: ${overflow}px`).toBeLessThanOrEqual(2);
  }
  expect(errors).toEqual([]);
});

test('selección y generación de horario desde catálogo de ejemplo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('./');
  await page.getByRole('button', { name: /crear mi horario gratis/i }).click();
  await expect(page.getByRole('heading', { name: /construye tu horario/i })).toBeVisible();
  await page.getByRole('button', { name: /seleccionar materias/i }).first().click();
  await page.getByRole('button', { name: /ESTRUCTURA DE DATOS/i }).first().click();
  await page.getByRole('button', { name: /listo, ver horario/i }).click();
  await expect(page.getByRole('heading', { name: /combinaciones disponibles/i })).toBeVisible();
  await expect(page.getByText(/opción 1/i).first()).toBeVisible();

  const resultsBox = await page.locator('.results-panel').boundingBox();
  const calendarBox = await page.locator('.calendar-panel').boundingBox();
  expect(resultsBox).not.toBeNull();
  expect(calendarBox).not.toBeNull();
  expect(resultsBox!.y).toBeLessThan(calendarBox!.y);

  const groupSelect = page.getByLabel(/Grupo para ESTRUCTURA DE DATOS/i);
  const allGroupOptions = await groupSelect.locator('option').allTextContents();
  expect(allGroupOptions.length).toBeGreaterThan(1);
  for (const optText of allGroupOptions.slice(1)) {
    expect(optText).toMatch(/^Grupo\s+.+\s·\s.+\s·\s.+\d{2}:\d{2}–\d{2}:\d{2}/);
  }

  const teacherSelect = page.getByLabel(/Profesor para ESTRUCTURA DE DATOS/i);
  const teacherVal = await teacherSelect.locator('option').nth(1).getAttribute('value');
  const teacherName = (await teacherSelect.locator('option').nth(1).textContent())?.trim() || '';
  if (teacherVal) {
    await teacherSelect.selectOption(teacherVal);
    const filteredOptions = await groupSelect.locator('option').allTextContents();
    expect(filteredOptions.length).toBeGreaterThan(1);
    for (const optText of filteredOptions.slice(1)) {
      expect(optText).toContain(teacherName);
      expect(optText).toMatch(/\d{2}:\d{2}–\d{2}:\d{2}/);
    }
    const groupButtons = page
      .getByRole('group', { name: /Grupos del docente en ESTRUCTURA DE DATOS/i })
      .locator('button');
    await expect(groupButtons.first()).toBeVisible();
    await expect(groupButtons.first()).toContainText(teacherName);
    await expect(groupButtons.first()).toContainText(/Grupo\s+/);
    await expect(groupButtons.first()).toContainText(/\d{2}:\d{2}–\d{2}:\d{2}/);
  }

  // Verificar validación de no cruce entre materias al elegir grupo:
  await page.getByRole('button', { name: /editar materias/i }).click();
  await page.getByRole('button', { name: /INVESTIGACION DE OPERACIONES/i }).first().click();
  await page.getByRole('button', { name: /MECANICA/i }).first().click();
  await page.getByRole('button', { name: /listo, ver horario/i }).click();
  await page
    .getByLabel(/Grupo para INVESTIGACION DE OPERACIONES/i)
    .selectOption('AI432::01-CAMPUS');
  const mecanicaConflictOpt = page
    .getByLabel(/Grupo para MECANICA/i)
    .locator('option[value="FS202::06-CAMPUS"]');
  await expect(mecanicaConflictOpt).toHaveAttribute('disabled', '');
  await expect(mecanicaConflictOpt).toContainText(/Cruza con INVESTIGACION DE OPERACIONES/i);
  await page.getByRole('button', { name: /guardar/i }).first().click();
  await page.getByRole('tab', { name: /guardados/i }).click();
  await expect(page.getByText(/mi horario 2026-2/i).first()).toBeVisible();
  const width = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(width, `Desbordamiento de ${width}px`).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

test('exportación PDF desde horario válido', async ({ page }) => {
  await page.goto('./#planificador');
  await page.getByRole('button', { name: /seleccionar materias/i }).first().click();
  await page.getByRole('button', { name: /ESTRUCTURA DE DATOS/i }).first().click();
  await page.getByRole('button', { name: /listo, ver horario/i }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /^PDF$/i }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});

test('importa un PDF Academusoft sin docentes, reconoce nuevos grupos y compara semestres', async ({
  page,
}) => {
  await page.goto('./#planificador');
  await page.getByRole('button', { name: /importar PDF/i }).click();
  await page
    .locator('input[type="file"]')
    .setInputFiles('tests/fixtures/academusoft-sin-docentes.pdf');
  await expect(page.getByRole('dialog').getByText('2', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Grupos nuevos')).toBeVisible();
  await page.getByLabel('Período que vas a importar').fill('2027-1');
  await page.getByRole('button', { name: /confirmar catálogo/i }).click();
  await expect(page.getByRole('heading', { name: /construye tu horario/i })).toBeVisible();
  await expect(page.getByText('2027-1', { exact: false }).first()).toBeVisible();
});

test('botones legibles (contraste >= 4.5 y texto visible) y sin textos o iconos superpuestos en ningún dispositivo', async ({
  page,
}) => {
  const checkVisualIntegrity = async () => {
    return page.evaluate(() => {
      const issues: string[] = [];

      function parseRgba(str: string) {
        const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!m) return { r: 255, g: 255, b: 255, a: 1 };
        return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
      }

      function blend(
        fg: { r: number; g: number; b: number; a: number },
        bg: { r: number; g: number; b: number; a: number }
      ) {
        const a = fg.a + bg.a * (1 - fg.a);
        if (a === 0) return { r: 255, g: 255, b: 255, a: 0 };
        return {
          r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
          g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
          b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
          a,
        };
      }

      function getEffectiveBg(el: Element) {
        const chain: { bg: { r: number; g: number; b: number; a: number }; op: number }[] = [];
        let cur: Element | null = el;
        while (cur && cur.nodeType === 1) {
          const cs = getComputedStyle(cur);
          const bg = parseRgba(cs.backgroundColor);
          const op = parseFloat(cs.opacity || '1');
          chain.unshift({ bg, op });
          cur = cur.parentElement;
        }
        let current = { r: 251, g: 252, b: 255, a: 1 };
        for (const item of chain) {
          current = blend({ ...item.bg, a: item.bg.a * item.op }, current);
        }
        return current;
      }

      function getEffectiveOpacity(el: Element) {
        let op = 1;
        let cur: Element | null = el;
        while (cur && cur.nodeType === 1) {
          op *= parseFloat(getComputedStyle(cur).opacity || '1');
          cur = cur.parentElement;
        }
        return op;
      }

      function lum({ r, g, b }: { r: number; g: number; b: number }) {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      }

      function contrast(
        c1: { r: number; g: number; b: number },
        c2: { r: number; g: number; b: number }
      ) {
        const l1 = lum(c1);
        const l2 = lum(c2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }

      function isVisible(el: Element) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0)
          return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }

      const hasOwnText = (el: Element) =>
        Array.from(el.childNodes).some(n => n.nodeType === 3 && (n.textContent || '').trim().length > 0);
      const controls = Array.from(
        document.querySelectorAll('button, a.btn-text, a.btn-primary, [role="tab"], summary')
      );
      const nested = controls.flatMap(c =>
        Array.from(c.querySelectorAll('span, strong, small')).filter(hasOwnText)
      );
      const badges = Array.from(
        document.querySelectorAll(
          '.avatar-stack span, .step-card > span, .mock-avatars, .status, .catalog-header-tag'
        )
      );
      for (const btn of [...controls, ...nested, ...badges]) {
        if (!isVisible(btn)) continue;
        const cs = getComputedStyle(btn);
        const fs = parseFloat(cs.fontSize);
        const large = fs >= 24 || (fs >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
        const text = ((btn as HTMLElement).innerText || btn.textContent || '')
          .trim()
          .replace(/\s+/g, ' ');
        if (fs === 0 && text.length > 0) {
          issues.push(`Texto oculto con font-size:0 en botón "${text}"`);
        }
        const bg = getEffectiveBg(btn);
        const rawFg = parseRgba(cs.color);
        const effOp = getEffectiveOpacity(btn);
        if (effOp < 0.1) continue;
        const fg = blend({ ...rawFg, a: rawFg.a * effOp }, bg);
        const cr = contrast(fg, bg);
        if (cr < (large ? 3 : 4.5)) {
          issues.push(`Contraste bajo (${cr.toFixed(2)}) en "${text || btn.getAttribute('aria-label')}"`);
        }
      }

      const containers = document.querySelectorAll(
        '.calendar-event, .mock-event, .hero-visual-stack, .planner-header, .topnav, .sidebar-search, .feature-card, .step-card, .choice-control, .result-item, .saved-item, .calendar-toolbar, .pensum-course-card'
      );
      for (const container of containers) {
        if (!isVisible(container)) continue;
        if (
          container.classList.contains('calendar-event') ||
          container.classList.contains('mock-event')
        ) {
          const cr = container.getBoundingClientRect();
          const kids = Array.from(container.children).filter(isVisible);
          for (let i = 0; i < kids.length; i++) {
            const r1 = kids[i].getBoundingClientRect();
            if (r1.bottom > cr.bottom + 1.5) {
              issues.push(
                `Desborde vertical en bloque de horario: "${(kids[i].textContent || '').trim()}"`
              );
            }
            for (let j = i + 1; j < kids.length; j++) {
              const r2 = kids[j].getBoundingClientRect();
              const xo = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
              const yo = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
              if (xo > 1 && yo > 1) {
                issues.push(
                  `Superposición en bloque de horario entre "${(kids[i].textContent || '').trim()}" y "${(kids[j].textContent || '').trim()}"`
                );
              }
            }
          }
        }
        const children = Array.from(container.querySelectorAll('*')).filter(el => {
          if (!isVisible(el)) return false;
          if (el.tagName.toLowerCase() === 'option') return false;
          if (el.tagName.toLowerCase() === 'svg') return true;
          return Array.from(el.childNodes).some(
            n => n.nodeType === 3 && (n.textContent || '').trim().length > 0
          );
        });
        for (let i = 0; i < children.length; i++) {
          for (let j = i + 1; j < children.length; j++) {
            const a = children[i];
            const b = children[j];
            if (a.contains(b) || b.contains(a)) continue;
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            const xo = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
            const yo = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
            if (xo > 2 && yo > 2) {
              issues.push(
                `Superposición en ${container.className}: "${(a.textContent || a.tagName).trim().slice(0, 20)}" sobre "${(b.textContent || b.tagName).trim().slice(0, 20)}"`
              );
            }
          }
        }
      }

      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      if (overflow > 1) {
        issues.push(`Desbordamiento horizontal de ${overflow}px`);
      }
      return issues;
    });
  };

  await page.goto('./');
  expect(await checkVisualIntegrity()).toEqual([]);

  await page.goto('./#pensum');
  expect(await checkVisualIntegrity()).toEqual([]);

  await page.goto('./#planificador');
  expect(await checkVisualIntegrity()).toEqual([]);

  await page.getByRole('button', { name: /seleccionar materias/i }).first().click();
  const rows = page.locator('.subject-row');
  for (let i = 0; i < 5; i++) {
    await rows.nth(i).click();
  }
  await page.getByRole('button', { name: /listo, ver horario/i }).click();
  await expect(page.getByText(/opción 1/i).first()).toBeVisible();
  expect(await checkVisualIntegrity()).toEqual([]);

  await page.locator('.group-drawer-toggle').first().click();
  expect(await checkVisualIntegrity()).toEqual([]);

  await page.getByRole('tab', { name: /preferencias/i }).click();
  expect(await checkVisualIntegrity()).toEqual([]);

  for (const name of [/asignaturas/i, /guardados/i]) {
    await page.getByRole('tab', { name }).hover();
    expect(await checkVisualIntegrity()).toEqual([]);
  }
  await page.getByRole('button', { name: /guardar/i }).first().hover();
  expect(await checkVisualIntegrity()).toEqual([]);
});

test('objetivos táctiles de al menos 32px en teléfonos', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Solo aplica a viewports de teléfono');
  const smallTargets = () =>
    page.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll('button, a[href], [role="tab"], summary, select')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.display === 'inline')
          continue;
        if (el.closest('details:not([open])') && !el.closest('summary')) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.width <= 1) continue;
        if (r.width < 32 || r.height < 32)
          out.push(
            `${((el as HTMLElement).innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`
          );
      }
      return out;
    });
  await page.goto('./');
  expect(await smallTargets()).toEqual([]);
  await page.goto('./#pensum');
  expect(await smallTargets()).toEqual([]);
  await page.goto('./#planificador');
  await page.getByRole('button', { name: /seleccionar materias/i }).first().click();
  const rows = page.locator('.subject-row');
  for (let i = 0; i < 3; i++) await rows.nth(i).click();
  await page.getByRole('button', { name: /listo, ver horario/i }).click();
  await expect(page.getByText(/opción 1/i).first()).toBeVisible();
  await page.getByRole('button', { name: /guardar/i }).first().click();
  expect(await smallTargets()).toEqual([]);
});

test('filtro por semestre curricular en el planificador (I-IX y Todos), selección multi-semestre y materias sin oferta', async ({
  page,
}) => {
  await page.goto('./#planificador');
  await page.getByRole('button', { name: /seleccionar materias/i }).first().click();

  const todosBtn = page.getByRole('button', { name: /^Todos los semestres/i });
  await expect(todosBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.subject-list .subject-row')).toHaveCount(53);
  await expect(page.locator('.subject-list .subject-row-unoffered')).toHaveCount(9);

  // Seleccionar Semestre III: exactamente sus 8 materias canónicas y 19 créditos
  const sem3Btn = page.getByRole('button', { name: /^Semestre III \(/i });
  await sem3Btn.click();
  await expect(sem3Btn).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.semester-summary-bar')).toContainText('Semestre III:');
  await expect(page.locator('.semester-summary-bar')).toContainText('8 materias · 19 créditos');
  await expect(page.locator('.subject-list .subject-row')).toHaveCount(8);

  // Seleccionar Estructura de Datos en Semestre III
  await page.getByRole('button', { name: /SS301 ESTRUCTURA DE DATOS/i }).click();
  await expect(page.locator('.selected-subjects-summary')).toContainText('1 seleccionada · 3 cr.');

  // Cambiar a Semestre V y seleccionar Base de Datos Avanzadas (SS802)
  const sem5Btn = page.getByRole('button', { name: /^Semestre V \(/i });
  await sem5Btn.click();
  await expect(page.locator('.subject-list .subject-row')).toHaveCount(7);
  await expect(page.locator('.selected-subjects-summary')).toContainText('+1 de otro semestre');

  await page.getByRole('button', { name: /SS802 BASE DE DATOS AVANZADAS/i }).click();
  await expect(page.locator('.selected-subjects-summary')).toContainText(
    '2 seleccionadas · 6 cr. · 2 semestres'
  );

  // Volver a Semestre III: ambas permanecen seleccionadas
  await sem3Btn.click();
  await expect(page.getByRole('button', { name: /SS301 ESTRUCTURA DE DATOS/i })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(page.locator('.selected-subjects-summary')).toContainText('SS301');
  await expect(page.locator('.selected-subjects-summary')).toContainText('SS802');

  // Ir a Semestre VIII: Gestión de Proyectos TI (SS809) aparece sin grupos publicados
  const sem8Btn = page.getByRole('button', { name: /^Semestre VIII \(/i });
  await sem8Btn.click();
  const gptiBtn = page.getByRole('button', { name: /SS809 GESTION DE PROYECTOS TI/i });
  await expect(gptiBtn).toBeVisible();
  await expect(gptiBtn).toBeDisabled();
  await expect(gptiBtn).toContainText('Sin grupos publicados / No disponible para este período');

  // Búsqueda combinada sin coincidencias en el semestre activo -> estado vacío y Limpiar filtros
  const searchInput = page.getByPlaceholder(/Buscar materia/i);
  await searchInput.fill('calculo diferencial');
  await expect(page.locator('.empty-list')).toContainText('No se encontraron materias');
  await page.locator('.clear-filters-btn').click();

  await expect(todosBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(searchInput).toHaveValue('');
  await expect(page.locator('.selected-subjects-summary')).toContainText('2 seleccionadas · 6 cr.');

  // Cerrar el modal y verificar que en el planificador aparece "Opción 1"
  await page.getByRole('button', { name: /listo, ver horario/i }).click();
  await expect(page.getByText(/opción 1/i).first()).toBeVisible();

  // El botón "Editar materias" reabre el modal
  await page.getByRole('button', { name: /editar materias/i }).click();
  await expect(page.getByRole('heading', { name: /seleccionar materias/i })).toBeVisible();
  await page.getByRole('button', { name: /listo, ver horario/i }).click();

  for (const w of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width: w, height: 800 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `Overflow en ${w}px: ${overflow}px`).toBeLessThanOrEqual(2);
  }
});
