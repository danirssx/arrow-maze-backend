# Mutation Testing (Backend)

> "Mutation testing is resource-heavy, but the ROI on code correctness is
> worth every cycle."

Una suite verde solo prueba que el código no explota, no que los tests
sirvan. La prueba de mutación introduce defectos a propósito y comprueba que
**algún test falla**. Un mutante que sobrevive es un agujero en la red. Esta
es la quinta puerta del [workflow](./workflow.md) y corre **después** del
`judge`.

## Herramienta

[StrykerJS](https://stryker-mutator.io/) 9.x sobre TypeScript con el runner de
Jest. Estado actual: **configurado** en `stryker.conf.json`.

El backend es ESM + ts-jest, así que la suite debe correr con
`NODE_OPTIONS=--experimental-vm-modules`. Ese flag ya va incluido en el script;
no ejecutes `npx stryker run` a pelo:

```bash
# Auditoría completa de domain + application (el mutate por defecto del config)
npm run mutation

# Restringido al diff de la feature (lo que hace el agente `mutation`)
npm run mutation -- --mutate "src/domain/<archivo>.ts"
```

El reporte HTML queda en `reports/mutation/index.html` (gitignored). El
`break threshold` está en 80: Stryker devuelve exit ≠ 0 si el score cae por
debajo, así que sirve como puerta de CI/PR.

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
