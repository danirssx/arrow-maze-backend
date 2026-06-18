## Summary

Describe the change and the ticket it closes.

## Architecture Checklist

- [ ] The change stays inside the approved folder structure.
- [ ] Domain does not import Express, database clients, JWT libraries, or framework code.
- [ ] Application depends on ports/interfaces, not concrete infrastructure.
- [ ] Framework code does not bypass the application layer for business rules.
- [ ] No unapproved use cases, entities, decorators, services, or patterns were introduced.
- [ ] Any GoF pattern used is explicitly documented in the relevant file header.

## Testing Checklist

- [ ] Tests follow AAA.
- [ ] Test names use `should_<expected>_when_<condition>`.
- [ ] Domain/application tests are marked for human review when applicable.
- [ ] `npm run verify` passes locally.

## AI Usage Checklist

- [ ] Updated `ai-log/` for this change.
- [ ] Human modifications/review notes were added to the AI log.
