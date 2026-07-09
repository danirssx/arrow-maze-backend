Aquí tienes el catálogo de reglas clave, organizado por bloques para que funcione como checklist de inspección. Mantengo cada una concreta y accionable.

## Clean / Hexagonal Architecture

- **Regla de dependencia**: las dependencias de código apuntan siempre hacia adentro (hacia el dominio). Una capa interna nunca conoce ni nombra a una externa.
- **Dirección de dependencia ≠ dirección de flujo**: el control puede fluir hacia afuera (dominio → infraestructura) aunque la dependencia de código apunte hacia adentro. Esto se logra con inversión de dependencias (interfaces en el núcleo, implementaciones afuera).
- **Independencia del dominio**: el dominio no depende de frameworks, ORM, UI, base de datos ni I/O. Si necesitas importar algo de infraestructura en el dominio, hay una violación.
- **Ni infraestructura ni aplicación albergan lógica de dominio**: las reglas de negocio viven en entidades, value objects, agregados y servicios de dominio. Infraestructura solo implementa detalles técnicos; aplicación solo orquesta.
- **Repositorios = interfaz adentro, implementación afuera**: el contrato del repositorio se declara en el núcleo (dominio/aplicación); la implementación concreta (SQL, API, etc.) vive en infraestructura.
- **Puertos vs. adaptadores**: los puertos (interfaces) pertenecen al núcleo. Los adaptadores _driving_ (entrada: controllers, CLI) invocan casos de uso; los _driven_ (salida: persistencia, mensajería) son invocados por el núcleo a través de puertos.
- **Frameworks como detalle**: el framework es un adaptador, no la arquitectura. Debe poder reemplazarse sin tocar el dominio.
- **Cruces de frontera con DTOs simples**: lo que cruza una frontera de capa son estructuras de datos planas, nunca entidades atadas a una capa externa.

## DDD táctico

- **Patrones tácticos**: Entity, Value Object, Aggregate (+ Aggregate Root), Domain Service, Repository, Factory, Domain Event.
- **Invariantes solo en VO y Agregados**: los Value Objects las garantizan en construcción; los Agregados las mantienen durante todo su ciclo de vida. Domain Services, Repositories, Factories y Application Services son _stateless_ y no tienen invariantes.
- **El agregado es la unidad de consistencia**: toda modificación entra por el Aggregate Root, que protege las invariantes del cluster.
- **El agregado es la vía de acceso desde la aplicación**: la capa de aplicación carga y manipula agregados (vía repositorio), no entidades internas sueltas.
- **Repositorios solo para Aggregate Roots**: no hay repositorio por cada entidad interna.
- **Referencias entre agregados por ID, nunca por objeto**: un agregado no contiene una referencia directa a otro agregado; guarda su identidad.
- **Una transacción = un agregado (para escritura)**: leer cruzando fronteras está permitido; escribir varios agregados en la misma transacción no.
- **Servicio de dominio cuando la lógica involucra más de un agregado**: recibe los agregados como parámetros del método, _nunca_ inyectados por constructor.
- **Domain Service ≠ Application Service**: el de dominio contiene lógica de negocio que no encaja en una sola entidad/agregado; el de aplicación orquesta (carga repositorios, maneja transacciones, coordina). El de aplicación no contiene reglas de negocio.
- **Factory cuando la creación es compleja**: encapsula el ensamblado de un agregado válido cuando el constructor no basta.
- **Domain Events para comunicar hechos del pasado**: nombrados en pretérito (`PedidoConfirmado`), permiten desacoplar reacciones entre agregados/contextos.

## DDD estratégico

- **Bounded Context**: frontera explícita de un modelo y su lenguaje ubicuo. El mismo término puede significar cosas distintas en contextos distintos.
- **Entidades de otro BC se referencian por ID opaco**, no como agregados completos (ej. `Patient`, `Researcher` referidos por identidad, no embebidos).
- **Context Map**: describe las relaciones entre BCs (Shared Kernel, Customer-Supplier, Conformist, ACL, etc.).
- **Trade-off de consistencia**: agregados pequeños + domain events + consistencia eventual, _vs._ agregados anidados + consistencia inmediata. No es correcto/incorrecto; en examen se nombra y se justifica la tensión.

## Caso de MVVM

MVVM no reemplaza a Clean Architecture: vive **dentro de la capa de presentación / adaptadores** y refina cómo se estructura esa capa externa. Aquí las reglas clave que aporta, en el mismo formato de checklist:

## MVVM sobre Clean Architecture

- **MVVM y CA son complementarios, no excluyentes**: CA da las reglas de alto nivel (capas, regla de dependencia); MVVM es un patrón de bajo nivel que organiza la presentación. Se aplican juntos.
- **El ViewModel solo contiene lógica de presentación**: traduce y expone el Model en un formato listo para la UI. No contiene reglas de negocio (esas siguen en el dominio/casos de uso).
- **El ViewModel no conoce a la View**: no tiene referencia a la View, ni concreta ni por interfaz. La comunicación es vía streams reactivos (datos fluyen del ViewModel hacia la View). Es la evolución sobre MVP, donde el Presenter sí guardaba una referencia (interfaz) de la View.
- **Programación reactiva como rasgo distintivo**: lo que separa a MVVM de MVP es el uso de streams (Observables, StateFlow, LiveData). La View se suscribe; el ViewModel emite estado.
- **La View es "tonta" (dumb)**: solo renderiza. No contiene lógica de decisión. La regla de inspección: si ves un `if (amount == 0) view.hide()` dentro de la View, hay violación. La View debe recibir un modelo ya resuelto (ej. un booleano `textViewVisibility`).
- **El ViewModel mapea el Model a un modelo de vista (view state)**: la View consume un objeto "ready-to-consume", no entidades de dominio crudas.
- **El ViewModel tiene dependencias e inyección**: a diferencia del "view model" de MVC (objeto de datos sin comportamiento), el ViewModel de MVVM es un componente con dependencias (repositorios/casos de uso, navegación) que se componen por inyección por constructor en el Composition Root.
- **El ViewModel habla con casos de uso, no con infraestructura directamente**: respeta la regla de dependencia de CA — apunta hacia el núcleo (puertos/casos de uso), nunca hacia la base de datos o el framework.
- **Inversión de dependencias no es automática en MVVM puro**: por defecto las capas *driving* dependen de implementaciones concretas; para trazar fronteras limpias (estilo CA) hay que introducir interfaces explícitamente. Punto típico de examen.
- **Riesgo a vigilar (composición de streams)**: el estado final de la pantalla suele componerse de varios streams (loader, error, datos). Es la principal desventaja de MVVM y fuente de complejidad accidental.
- **Nivel de aplicación**: MVVM se recomienda para apps de complejidad pequeña-media; cuando crece, se escala a una implementación más por capas (CA completa) o a MVI.
