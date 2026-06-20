# TDD & Conventions (Backend)

La disciplina que talla el código. El `tdd-implementer` la ejecuta; el
`judge` la audita.

## Las Tres Leyes del TDD (no negociables)

1. No escribes código de producción salvo para hacer pasar un test que está
   fallando.
2. No escribes más test del necesario para fallar — y no compilar/importar
   cuenta como fallar.
3. No escribes más producción de la necesaria para pasar el test que falla.

## El ciclo

```
ROJO     → un test que falla, derivado del siguiente @s del contrato Gherkin
VERDE    → la implementación mínima que lo hace pasar
REFACTOR → solo en verde: nombres, duplicación, funciones cortas
```

Refactorizas **solo** con la barra verde. Si los tests están rojos, no
refactorizas: arreglas. Un test que pasa a la primera no demuestra nada;
sospecha y ajústalo.

## Convenciones de test

- **AAA**: Arrange / Act / Assert, separados visualmente.
- **Nombre**: `should_<expected>_when_<condition>`.
- Verifica **comportamiento observable**, no detalles privados.
- Mockea dependencias externas **a través de interfaces/puertos**.
- Los tests de `domain` y `application` quedan **sujetos a revisión humana**.

## Trazabilidad escenario → test

Cada escenario `@s` del `.feature` debe quedar cubierto por al menos un test
concreto. El mapa `@s → test` se anota en el `ai-log/` del ticket y lo
verifica el `judge`.

## Convenciones de código

- Respeta la regla de dependencia: `framework → infrastructure → application
  → domain`. Ver [`architecture.md`](./architecture.md).
- Funciones cortas con un solo motivo para cambiar; nombres reveladores.
- Sin duplicación, sin números mágicos.
- Cuando apliques un patrón GoF aprobado, anótalo en la cabecera del archivo.
- Contrato de errores explícito: status code + forma del body de error.

## Puerta verde

```bash
npm test            # suite unitaria
npm run verify      # lint + typecheck + test:coverage + build
```
