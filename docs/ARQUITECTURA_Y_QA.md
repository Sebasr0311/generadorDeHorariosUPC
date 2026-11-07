# Arquitectura, reglas de negocio y protocolo de calidad

## Alcance y límites

Traza es una SPA con ejecución local. No almacena cuentas de estudiantes ni ofrece sincronización. La validación de matrícula, cupos, equivalencias, prerrequisitos y matrícula real sigue siendo responsabilidad de Academusoft. No se envían documentos a ningún backend.

## Invariantes funcionales

1. Por combinación, se selecciona exactamente **un grupo completo** de cada materia seleccionada.
2. Dos sesiones cruzan cuando ocurren el mismo día y `inicioA < finB && inicioB < finA`; los intervalos de tiempo se almacenan como **[inicio, fin)** en minutos desde medianoche.
3. Franjas inmediatamente consecutivas **no** se consideran cruces.
4. La comparación de grupos usa `(código de asignatura, etiqueta de grupo normalizada)`.
5. Se infiere un docente solo si el PDF nuevo carece de docente, el grupo existía antes, la firma **completa** de sesiones es idéntica y la referencia anterior tenía docente confirmado.
6. Nuevos grupos no heredan docente de otros grupos; cambios en día, hora o cantidad de encuentros eliminan la inferencia automática.
7. Una asignación nueva confirmada en PDF prevalece sobre cualquier estimación anterior.
8. La etiqueta `estimado` no equivale a información oficial.

## Flujo de importación

```
Archivo PDF Academusoft
    → PDF.js (extracción de spans y posiciones)
    → reconstrucción de columnas y encabezados
    → normalización de grupos y clases
    → directorio de docentes, si existe
    → SHA-256 de IDs crudos antes del almacenamiento
    → catálogo candidato con advertencias
    → comparación con catálogo vigente
    → vista previa para revisión humana
    → persistencia en IndexedDB
```

`NDOC` y `NREF` se tratan como *sin docente* y *sin salón*. Las filas que no puedan interpretarse se señalan en la revisión. Los escaneos PDF sin texto seleccionable no están incluidos.

## Riesgos y mejoras posteriores

- **Parsing visual**: el PDF del SIA puede variar sin cambiar el nombre del reporte. La exactitud absoluta requiere contrastar cada catálogo importado; recomendamos una tabla de revisión por grupo antes de liberar para uso institucional.
- **Escala de combinaciones**: el algoritmo backtracking con poda descarta cruces temprano y limita el tamaño inicial de resultados; en conjuntos combinatorios enormes no enumera automáticamente todas las soluciones. Fase siguiente: Web Worker con búsqueda reanudable y almacenamiento paginado.
- **Exportación**: para horarios inusuales, con franjas subhorarias o gran cantidad de encuentros, revisar que el formato impreso mantenga legibilidad.
- **Persistencia**: sin sincronización; para varios dispositivos habría que incorporar backend, control de acceso y privacidad.
- **Diseño**: los breakpoints se prueban a 1440×900, 768×1024 y 390×844. Conviene una ronda adicional de revisión visual real en hardware móvil.

## Checklist de aceptación en CI

- `npm run typecheck` (compilador TypeScript sin emisión)
- `npm run test` (solapamientos, grupos completos, restricciones, comparador e inferencia)
- `npm run build` (Vite, incluyendo `base` GitHub Pages)
- `npm run test:e2e` (landing, navegación, ausencia de scroll horizontal, horarios, guardado, exportación, importación de PDF sintético)
- Si cualquier verificación falla, el job `deploy` no corre.

## Auditoría obligatoria antes de publicar

1. Revisar **visual y manualmente** las vistas de desktop/tablet/móvil, con consola y network sin errores.
2. Importar tanto el **PDF oficial con docentes** como uno auténtico **sin docentes** del período entrante. El PDF sintético de pruebas valida la interfaz, pero no cubre todas las variantes de Academusoft.
3. Contrastar una muestra de al menos 30 grupos con las páginas originales, incluyendo dos o más encuentros, `NDOC`, `NREF`, grupos de sedes y grupos nuevos.
4. Crear combinaciones con 1, 3, 6 y 8 materias. Verificar manualmente cada clase del grupo.
5. Abrir Excel en Excel/LibreOffice y PDF en Chrome/Adobe; comprobar títulos, saltos, acentos, salones, estados de docentes y legibilidad.
6. Publicar en repositorio público con `Settings → Pages → GitHub Actions` y comprobar rutas bajo `/nombre-repo/`.
7. Probar un PDF de la universidad con 2 o 3 grupos nuevos y comparar estimaciones de docentes antes de anunciarlo como completamente compatible.

**Estado:** código fuente generado y pruebas automatizadas preparadas; esta sesión no pudo instalar dependencias de npm, por lo que el workflow y las pruebas Playwright aún requieren ejecución real. No se afirma certificación visual ni funcional completa en producción.
