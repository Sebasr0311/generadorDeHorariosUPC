# Traza — Planificador inteligente de horarios UPC

**Traza** es una aplicación web estática para planear el semestre en Ingeniería de Sistemas de la Universidad Popular del Cesar. No es un producto oficial de la UPC y no matricula asignaturas. Está diseñada para publicarse en **GitHub Pages**, sin backend ni base de datos externa.

## Funciones incluidas

- Landing pública con guía de uso, preguntas frecuentes y animaciones ligeras inspiradas en el catálogo gratuito de [React Bits](https://reactbits.dev/).
- **Malla curricular oficial integrada** (`src/data/PENSUM_INGENIERIA_SISTEMAS_UPC.txt`): **9 semestres (I–IX), 62 asignaturas y 155 créditos**, diferenciando explícitamente el *semestre del pensum* (`I`–`IX`) del *período académico del horario* (`2026-2`).
- **Filtro por semestre curricular (`Todos`, `I`–`IX`, `Otras`)** con conteo de materias y créditos por semestre, resumen persistente de materias seleccionadas entre distintos semestres y soporte para URL (`?semestre=III`) y almacenamiento local.
- **Conciliación explícita malla ↔ oferta de horarios** (`src/lib/curriculum.ts`): vincula asignaturas por coincidencia exacta de código+nombre o equivalencias auditadas, previniendo colisiones de códigos entre malla y PDF (ej. `SS802` es *Gestión de Proyectos TI* en malla Sem. VIII, pero *Base de Datos Avanzadas* en el PDF `2026-2`, que corresponde a `SS503` en Sem. V). Las materias del pensum sin oferta en el período actual permanecen visibles como *Sin grupos publicados / No disponible para este período*.
- Catálogo inicial de **53 materias ofertadas, 512 grupos y 770 sesiones** obtenido del horario `2026-2` de Academusoft. Los nombres docentes se relacionan con identificadores **opacos**; no se incluyen números de identificación en el JSON publicado.
- Búsqueda por materia, código (de malla o de horario) y docente, en intersección con el filtro de semestre. Selección de varias materias de cualquier semestre; elección fija de grupo; filtros por docente para cada materia.
- Búsqueda de combinaciones sin solapamientos usando **grupos completos**, con horarios preferidos, límites de franja, días libres y exclusión opcional de sedes/virtualidad.
- Calendario semanal, detalles, guardado local y exportación a **PDF** y **Excel** con grupos, docentes, estado de la asignación y salones.
- Importación de PDF de Academusoft en el navegador (sin subir documentos a servidores) y de respaldos JSON/HTML propios de Traza.
- Comparación entre el catálogo nuevo y el anterior: grupos nuevos, eliminados, reprogramados, cambios de aula o docente.
- Estimación de profesor **únicamente** cuando coinciden materia, identificador de grupo y **todos** los encuentros semanales. Se muestra como estimación y jamás como oficial. Para nuevos grupos o franjas cambiadas, docente *por confirmar*.
- Almacenamiento local con IndexedDB; las propuestas guardadas no se sincronizan entre navegadores o dispositivos.

## Tecnología

React 19 · Vite 7 · TypeScript · CSS responsive · Radix UI Dialog · iconos Lucide · PDF.js · ExcelJS · jsPDF · IndexedDB (`idb`) · Vitest · Playwright. Los efectos en CSS basados en patrones del catálogo de React Bits no requieren la versión de pago ni instalar el catálogo completo.

## Ejecución local

Requiere Node.js 22+ y conexión a Internet **para instalar las dependencias por primera vez**.

```bash
npm install
npm run dev
```

Abre la dirección impresa por Vite. Para las verificaciones:

```bash
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run preview` abre la compilación de producción. En CI se ejecutan automáticamente todas las verificaciones anteriores.

## Publicación en GitHub Pages

1. Crea un repositorio en GitHub y sube el contenido de esta carpeta a la rama `main` (sin comprimir como un archivo ZIP en el repositorio).
2. En el repositorio, ve a **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. El workflow `.github/workflows/deploy.yml` instala las dependencias, revisa TypeScript, ejecuta pruebas unitarias, compila, ejecuta E2E en Chromium (escritorio/tableta/móvil) y **solo si todo pasa** publica `dist/`.
4. Vite calcula automáticamente el `base` a partir de `GITHUB_REPOSITORY`: un repo `HorariosUPC` en la cuenta `usuario` usará `https://usuario.github.io/HorariosUPC/`. El repo `usuario.github.io` usará `/`.
5. Si necesitas indicar el `base` explícitamente, usa `VITE_BASE_PATH=/nombre-repo/` en el entorno de build.

> La primera ejecución de Actions utiliza `npm install` porque se entrega el proyecto sin `package-lock.json` (el entorno de generación actual no pudo acceder al registro npm). Cuando instales localmente, **confirma el `package-lock.json` en el repositorio y cambia ese comando a `npm ci`** para builds reproducibles.

## Cómo filtrar por semestre curricular

1. Abre el **Planificador** (`#planificador`). Por defecto el selector de semestre inicia en **Todos**, mostrando las 62 materias de la malla curricular (y cualquier materia extra del PDF importado).
2. En el bloque **Semestre del pensum**, selecciona un chip (`I`, `II`, `III`, `IV`, `V`, `VI`, `VII`, `VIII` o `IX`) o navega entre ellos con las flechas del teclado (`←` / `→`, `Inicio` / `Fin`).
3. Combina el filtro de semestre con el buscador por nombre, código (de malla o del PDF) o docente. Puedes pulsar **Limpiar filtros** en cualquier momento para volver a `Todos` sin perder tus materias seleccionadas.
4. **Combinación entre semestres (materias atrasadas o adelantadas):** puedes elegir asignaturas en el semestre `III`, cambiar al semestre `V` y agregar más materias. El bloque **Resumen persistente de materias seleccionadas** conserva todas tus elecciones con su semestre y créditos, y el generador calcula combinaciones conjuntas sin cruces.
5. **Materias sin oferta en el período actual:** las asignaturas de la malla que no tienen grupos publicados en el PDF vigente se muestran con sus datos curriculares (`semestre`, `código`, `créditos`, `área`) y el estado *Sin grupos publicados / No disponible para este período*, deshabilitadas para evitar crear horarios con grupos inexistentes.
6. **Enlace directo por URL:** puedes abrir directamente un semestre usando `?semestre=III` (o `?semestre=3`), compatible con rutas base de GitHub Pages.

## Importar los PDF del siguiente semestre

1. Usa el catálogo de referencia `2026-2` o selecciona otro anterior como catálogo activo.
2. Pulsa **Importar PDF / datos** y elige un reporte **Consultar Horario por Programa** de Academusoft. Esta versión soporta el mismo diseño de PDF facilitado como referencia; los PDF escaneados, o con diseño diferente, pueden requerir ajustes.
3. Revisa el resumen, las alertas y las diferencias respecto al catálogo anterior.
4. Escribe el período, por ejemplo `2027-1`, y confirma la importación **solo después de comprobar la exactitud de los grupos**.
5. Escoge asignaturas, docentes si están confirmados o marcados como estimados, genera horarios y descárgalos.

Para respaldar un catálogo usa **Respaldar JSON** o **Exportar HTML**; Traza puede reimportar sus propios HTML estructurados. No interpreta HTML genérico generado por un conversor PDF→HTML.

### Datos y seguridad

- Los catálogos y horarios se procesan localmente. Los nombres de docentes pueden aparecer en la información del horario, pero los números de identificación se sustituyen por identificadores derivados de SHA-256 antes de conservarlos.
- La precisión del documento importado debe verificarse; las estimaciones nunca garantizan un profesor ni la disponibilidad de cupos.
- En un navegador en modo privado, al eliminar los datos del sitio o cambiar de equipo, se pueden perder los horarios: usa **Respaldar JSON** para conservar catálogos (los favoritos se guardan dentro del navegador).
- Los resultados se muestran en **lotes** para impedir que búsquedas enormes congelen la interfaz. Cuando el resultado está truncado se indica explícitamente. Una búsqueda incompleta no equivale a la totalidad de combinaciones posibles.

## Estructura

```
src/
  App.tsx                                      Landing + experiencia de planificación
  components/
    SemesterFilter.tsx                         Filtro accesible por semestre (Todos, I-IX, Otras)
    SelectedSubjectsSummary.tsx                Resumen persistente multi-semestre
    SubjectCatalogList.tsx                     Catálogo curricular y estado sin oferta
    ImportDialog.tsx                           Importador y comparador de catálogos
    WeeklyCalendar.tsx                         Calendario semanal
  data/
    PENSUM_INGENIERIA_SISTEMAS_UPC.txt         Malla curricular oficial (62 materias, 155 cr.)
    catalogo-base.json                         Catálogo de referencia anonimizado (2026-2)
  lib/
    types.ts                                   Contratos de datos
    curriculum.ts                              Conciliación malla ↔ oferta y filtrado puro
    generator.ts                               Compatibilidad, preferencias y combinaciones
    reconcile.ts                               Comparador y estimación prudente de docentes
    importer.ts                                Importador PDF/JSON/HTML
    exporters.ts                               Exportación PDF, Excel, JSON y HTML
    storage.ts                                 IndexedDB
  styles/main.css                              Sistema visual, breakpoints y motion
scripts/extract_seed.py                        Utilidad offline para reproducir el catálogo de referencia
src/lib/*.test.ts                              Tests unitarios (generador, comparador, pensum)
tests/                                         Pruebas E2E y PDF sintético sin datos personales
.github/workflows/deploy.yml                   Validación, compilación y despliegue
```

Para un análisis técnico de limitaciones y próximos pasos, consulta `docs/ARQUITECTURA_Y_QA.md`.
