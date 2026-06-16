# Arrow Maze Backend Architecture

This repository follows Clean Architecture.

Dependency direction:

```txt
framework -> infrastructure -> application -> domain
```

Rules:

- `src/domain` contains business rules only.
- `src/application` contains use cases and ports approved by the team.
- `src/infrastructure` implements ports and external adapters.
- `src/framework` contains Express, routes, controllers, middleware, Swagger, environment loading, and dependency wiring.

Required diagrams before final delivery:

- `docs/clean-architecture.drawio`
- `docs/clean-architecture.png`
- `docs/class-diagram.drawio`
- `docs/class-diagram.png`
