# Spec — <feature title> (Backend)

> Copy this file to `specs/<feature>.spec.md` and fill every section. The
> `## Clean Architecture contract` block is **mandatory** for any ticket that
> touches `src` and is the section the `judge` enforces (`.agents/judge.md`).
> The normative source for the architecture rules is `docs/reglas_clean_arch.md`
> (mirror of the workspace root `../reglas_clean_arch.md`).

Date: <YYYY-MM-DD>
Ticket: `<MAZ-###>` (temporary id `<CA-###>` if any)
Source: `<plan or report>`
Status: <Backlog / Todo / approved>. The `@s` scenarios in
`specs/<feature>.feature` are the executable contract for this slice.

## Purpose

One precise paragraph: what behavior this slice adds or fixes, and why.

## In scope / Out of scope

- In scope: ...
- Out of scope: ...

## Behavior

What the system does, in precise prose. Domain invariants enumerated.

## HTTP contract (if applicable)

- Inputs, status codes, success body, error body, required auth.

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md` (check every rule the slice
must honor; the judge verifies each one PASS/FAIL with `file:line` evidence):

- [ ] Regla de dependencia (dependencies point inward only)
- [ ] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`)
- [ ] Application solo orquesta (no business rules, no infra/framework imports)
- [ ] Repositorios: interfaz adentro (port), implementación afuera (infrastructure)
- [ ] DTOs simples en fronteras (primitives/records, no `Date`, no domain entities)
- [ ] Invariantes en VO/agregados (no en controllers/services de aplicación)
- [ ] Errores de dominio sin semántica HTTP (mapping HTTP solo en `framework`)

Layer impact (state the concrete files/changes per layer, or `no previsto`):

- Domain:
- Application:
- Infrastructure:
- Framework:

Forbidden moves (must stay unchecked / not introduced):

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`, `shared/errors/AppError`, `crypto`, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Controllers/middleware containing business rules or domain authorization
- [ ] DTOs exposing domain entities, `Date`, or runtime objects
- [ ] Persistence/Prisma client used outside `src/infrastructure`

Required tests:

- Domain:
- Application:
- Adapter/API:

Architecture acceptance criteria:

- Given the touched layers in this ticket, When imports are inspected, Then dependencies point inward only.
- Given boundaries are crossed, When DTOs are inspected, Then they are simple records/primitives.
- Given business invariants are involved, When implementation is inspected, Then they live in VO/agregados/domain services, not controllers/middleware.

## Edge cases

Enumerate: empty list, missing id, invalid payload, missing token, version conflict, ...

## Acceptance criteria (Given/When/Then)

- S1: Given ... When ... Then ...
- S2: ...

## Decisions

Each decision with its reason and the discarded alternative.

## Risks / OPEN QUESTIONS

- ...
