# Mutation Testing (Backend)

> "Mutation testing is resource-heavy, but the ROI on code correctness is
> worth every cycle."

Una suite verde solo prueba que el código no explota, no que los tests
sirvan. La prueba de mutación introduce defectos a propósito y comprueba que
**algún test falla**. Un mutante que sobrevive es un agujero en la red. Esta
es la quinta puerta del [workflow](./workflow.md) y corre **después** del
`judge`.

## Herramienta

[StrykerJS](https://stryker-mutator.io/) sobre TypeScript con el runner de
Jest. Estado actual: **pendiente de configurar** (`stryker.conf.json`). Hasta
entonces el `mutation` reporta `blocked -> StrykerJS no configurado`; no se
inventan scores.

Configuración objetivo cuando se habilite:

```jsonc
// stryker.conf.json
{
  "testRunner": "jest",
  "coverageAnalysis": "perTest",
  "mutate": ["src/domain/**/*.ts", "src/application/**/*.ts"]
}
```

```bash
npx stryker run
```

## Alcance

Foco en `src/domain` y `src/application` (reglas de negocio y casos de uso).
`infrastructure` y `framework` quedan fuera del umbral obligatorio por ahora.

## Umbral

- **Mutation score de las líneas nuevas/tocadas por la feature: ≥ 80%.**
- Meta aspiracional para dominio puro: 100%.

El `mutation` nunca declara PASS por debajo del umbral.

## Mutantes sobrevivientes

Cada sobreviviente se anota en `ai-log/<fecha>-<ticket>-mutation.md` con
archivo, línea, mutación aplicada y el test que falta para matarlo. El
mutante **no lo arregla el mutation tester**: vuelve al `tdd-implementer`,
que escribe el test rojo que lo mata y repite el ciclo `judge` → `mutation`.

## Mutantes equivalentes

Un mutante equivalente (no cambia el comportamiento observable) puede
excluirse, pero solo con justificación explícita documentada en el log. No se
abusa de esta vía para inflar el score.
