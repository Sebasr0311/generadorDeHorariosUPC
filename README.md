# Traza — Planificador inteligente de horarios y pensum UPC

**Traza** es una aplicación web estática para explorar la malla curricular y planear el semestre en Ingeniería de Sistemas de la Universidad Popular del Cesar (Jornada Única). No es un producto oficial de la UPC y no matricula asignaturas. Está diseñada para publicarse en **GitHub Pages**, sin backend ni base de datos externa.

## Funciones incluidas

- **Landing pública** con sección dedicada al módulo curricular («Explora el pensum, elige materias y genera horarios»), guía de uso, preguntas frecuentes y accesos directos a **Mi pensum** (`#pensum`) y al **Planificador** (`#planificador`).
- **Módulo «Mi pensum» (`#pensum`)** alimentado por la fuente estructurada oficial de Academusoft (`src/data/PENSUM_UPC_DATOS.json` y `src/data/PENSUM_COMPLETO_ING_SISTEMAS_UPC.txt`):
  - **62 asignaturas documentadas** en los períodos **1 a 9 (I–IX)** y **155 unidades de Ponderación Académica** (utilizadas como créditos para sumatoria).
  - **Dos vías de selección sincronizadas y equivalentes**:
    1. **«Todas las materias»**: catálogo global con búsqueda instantánea insensible a tildes y mayúsculas por nombre o código (p. ej. `electromagnetismo`, `ELECTROMAGNETISMO` o `FS400`), más filtros opcionales por disponibilidad de grupos y semestre.
    2. **«Por semestre»**: navegación accesible por teclado y móvil entre los semestres documentados `I`–`IX`, mostrando contadores de materias, suma de ponderación académica y selección activa sin perder materias elegidas en otros semestres.
  - **Prerrequisitos explicados en lenguaje claro**: resuelve cada código de prerrequisito al nombre completo de la asignatura (p. ej. `SS301` → *«Debes haber aprobado PROGRAMACION DE COMPUTADORES I»* con referencia secundaria `(R - SS200)`) y diferencia visualmente los **requisitos numéricos de créditos** (`70`, `80`, `115`, `132` en 11 asignaturas).
  - **Bandeja centralizada persistente**: sincronizada entre «Mi pensum» y el Planificador, con conteo de materias, suma de ponderación académica, remoción individual, limpieza con confirmación, advertencia explícita para asignaturas sin grupos publicados antes de generar y transferencia directa mediante **«Armar mi horario»**.
- **Filtro por semestre curricular en el Planificador (`Todos`, `I`–`IX`, `Otras`)** con soporte para URL (`?semestre=III`) y `localStorage`.
- **Catálogo inicial de horarios `2026-2`**: **53 materias ofertadas, 512 grupos y 770 sesiones** extraídas del PDF de Academusoft, con identificadores docentes opacos.
- **Generador de combinaciones sin solapamientos** usando grupos completos, filtros por docente, fijación de grupo, preferencias de franja horaria, días libres y sede.
- **Calendario semanal, guardado local (IndexedDB) y exportación a PDF y Excel**.
- **Importación de PDF de Academusoft en el navegador** conservando la selección curricular del usuario y avisando explícitamente si alguna materia o grupo fijado dejó de estar disponible en el nuevo período.

## Módulo «Mi pensum»: modalidades, prerrequisitos y período 10

### 1. Uso de las dos modalidades de selección
- **«Todas las materias»**: ideal para buscar rápidamente cualquier curso de la carrera por nombre o código sin importar a qué semestre pertenece. Al cambiar desde «Por semestre» hacia «Todas las materias», la búsqueda global opera sobre las 62 asignaturas sin quedar restringida al semestre anterior.
- **«Por semestre» (`I` a `IX`)**: ideal para revisar la carga de un período específico (`[7, 8, 8, 7, 7, 7, 7, 7, 4]` materias y `[16, 18, 19, 19, 18, 18, 17, 17, 13] = 155` unidades de ponderación académica).
- **Selección única centralizada**: ambas vistas escriben sobre la misma selección persistente (`localStorage`). Puedes marcar materias de `I`, `III`, `V` y `IX`, pulsar **«Armar mi horario»** para configurar grupos/profesores en el Planificador y regresar a **«Mi pensum»** sin perder tus elecciones ni tus preferencias de grupo/docente.

### 2. Significado de prerrequisitos y distinción de conceptos
Traza distingue cuatro conceptos independientes de la fuente académica:
1. **Período curricular (`1`–`9` / `I`–`IX`)**: ubicación de la asignatura en el pensum.
2. **Período académico del horario (p. ej. `2026-2`)**: oferta dinámica de grupos publicada en el PDF vigente.
3. **Ponderación Académica**: valor curricular de cada asignatura (`1` a `4`), cuya suma en las 62 materias documentadas es **155** (utilizada como créditos para el resumen de selección).
4. **Prerrequisitos por asignatura vs. Créditos Requisitos**:
   - **37 relaciones de prerrequisito por asignatura**: resueltas por nombre canónico mediante el índice curricular (p. ej. `SS301` → *«Debes haber aprobado PROGRAMACION DE COMPUTADORES I»*, `SS463` → *«Debes haber aprobado ESTRUCTURA DE DATOS»*, `SS909` → *«Debes haber aprobado PROYECTO DE GRADO I»*).
   - **11 asignaturas con «Créditos Requisitos» numéricos**: `SS802` (`70`), `AI700` (`80`), `SS810` (`80`), `SS811`, `SS807`, `SS808`, `SS812`, `SS806` (`115`), y `SS906`, `SS907`, `SS908` (`132`). Se muestran de forma informativa y diferenciada; no bloquean la selección curricular porque Traza no está conectado al historial académico oficial del estudiante.

### 3. Ausencia de información del período 10
El encabezado original de «Consultar Pensum» en Academusoft declara **10 períodos**, pero la transcripción oficial suministrada solo detalla asignaturas de los **períodos 1 a 9** (62 asignaturas, 155 de ponderación académica). Traza **no inventa asignaturas para el período 10**: ofrece navegación de `I` a `IX` e informa explícitamente en la interfaz que *«El período 10 no tiene información en la fuente suministrada»*.

### 4. Materias sin grupos publicados en el horario vigente
En el catálogo `2026-2`, 9 asignaturas del pensum (`SS705`, `SS810`, `SS809`, `SS807`, `SS808`, `SS906`, `SS907`, `SS908`, `SS909`) no tienen grupos publicados. En **«Mi pensum»** aparecen con el estado *«Sin grupos publicados»* y permanecen seleccionables para consulta; si el estudiante las incluye en su selección, Traza muestra una advertencia explícita antes de generar horarios y en el Planificador, permitiendo generar combinaciones con las asignaturas que sí tienen grupos sin omitir ninguna materia silenciosamente.

## Arquitectura y decisiones técnicas

- **Fuente única de verdad tipada (`src/lib/curriculum.ts`)**: importa y valida al iniciar `src/data/PENSUM_UPC_DATOS.json`, construyendo índices memoizados (`CURRICULUM_INDEX`) por código (`byCode`), por semestre (`bySemester`), texto normalizado de búsqueda (`searchHaystackByCode`) y dependientes (`dependentsByCode`).
- **Separación entre catálogo estático del pensum y oferta dinámica de grupos**: `reconcileCurriculumAndCatalog` cruza las 62 asignaturas del pensum con el catálogo activo exigiendo coincidencia de código y nombre normalizado. Si un catálogo externo presenta otro código para un nombre similar o el mismo código con nombre distinto, no fusiona automáticamente: registra la divergencia para revisión.
- **Conservación de nombres oficiales y horas (`HT`, `HP`, `HTP`)**: se conserva el texto oficial exacto (incluyendo abreviaciones como `FORMULACION Y EVALU DE PROYEC EN INGENIERIA` en `FC407`, documentando su alias expandido) y se distingue `null` (`—`) de `0`.
- **Enrutamiento compatible con GitHub Pages**: navegación por hash (`#pensum`, `#planificador`, `#`) que permite recargar en cualquier vista sin errores `404` en subrutas estáticas.

## Ejecución local

Requiere Node.js 22+:

```bash
npm install
npm run dev
```

Verificaciones completas:

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## Estructura de archivos principales

```
docs/insumos/                                  Insumos originales (prompt maestro, TXT y JSON del pensum)
src/
  App.tsx                                      Enrutador hash (Landing, Mi pensum, Planificador) y estado centralizado
  components/
    PensumPage.tsx                             Módulo «Mi pensum» (Todas las materias, Por semestre y bandeja)
    SemesterFilter.tsx                         Filtro accesible por semestre en el Planificador
    SelectedSubjectsSummary.tsx                Resumen persistente multi-semestre en el Planificador
    SubjectCatalogList.tsx                     Listado reconciliado del Planificador
    ImportDialog.tsx                           Importador y comparador de catálogos PDF/JSON/HTML
    WeeklyCalendar.tsx                         Calendario semanal
  data/
    PENSUM_UPC_DATOS.json                      Fuente estructurada canónica (62 materias, 155 pond., prerrequisitos)
    PENSUM_COMPLETO_ING_SISTEMAS_UPC.txt       Referencia textual legible del pensum con prerrequisitos por nombre
    catalogo-base.json                         Catálogo de horarios de referencia (2026-2)
  lib/
    types.ts                                   Contratos TypeScript (CurriculumCourse, Choice, Catalog, etc.)
    curriculum.ts                              Índices memoizados, prerrequisitos, reconciliación y persistencia
    curriculum.test.ts                         Suite unitaria de integridad de datos, prerrequisitos y flujo
    generator.ts                               Motor de combinaciones sin cruces
    reconcile.ts                               Comparador entre semestres y estimación prudente de docentes
    importer.ts                                Importador PDF/JSON/HTML
    exporters.ts                               Exportación PDF, Excel, JSON y HTML
    storage.ts                                 Persistencia IndexedDB para catálogos y planes guardados
  styles/main.css                              Sistema visual, estilos de Mi pensum y breakpoints responsive
tests/smoke.spec.ts                            Suite E2E Playwright (Landing, Mi pensum, Planificador y visual QA)
```
