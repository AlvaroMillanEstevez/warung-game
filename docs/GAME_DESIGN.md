# Warung Kita — diseño acordado

## Idea y dirección

Pequeño juego de gestión de un warung indonesio, para navegador en ordenador y móvil. Un local y un plato inicial: nasi goreng. Vista 2D cenital inclinada, cámara fija, suelo visible, caras superiores y frontales, sombras sencillas. Orden visual según los pies; colisiones sobre la huella en el suelo, nunca sobre toda la altura dibujada. No es 3D y la cámara no gira.

Se desarrolla por hitos pequeños, con código comprensible y revisable. Phaser, TypeScript estricto y Vite. npm con lockfile. Sin framework de interfaz, backend, base de datos, servicios externos, dependencias de pago ni APIs de IA durante partidas.

## Hito 1 entregado

Local con frigorífico, hornillo, mostrador, dos mesas y papelera. Jugador reconocible, controles de teclado y táctiles, colisiones, profundidad y mensajes de interacción de prueba. Coordenadas fijas de mundo y presentación adaptable. Los mensajes no cocinan, cobran, transportan ni modifican inventarios.

## Reglas de la primera versión futura

Estas reglas están acordadas pero **no se implementan en el hito 1**:

- Cada cliente decide al aparecer si quiere comer aquí o llevar.
- Habrá dos filas atendidas por el mismo mostrador.
- La fila para llevar puede avanzar aunque no haya mesas disponibles.
- Una mesa sucia puede reservarse: el cliente espera junto a ella hasta que se limpie.
- Estado de limpieza y cliente asignado son datos independientes.
- Inicialmente una mesa corresponde a un cliente.
- Los ingredientes serán ilimitados inicialmente, aunque habrá que transportarlos.
- El jugador recoge ingredientes de un frigorífico o estante, los lleva al hornillo, cocina y traslada raciones al mostrador.
- Para llevar: cobrar y entregar el pedido.
- Para comer dentro: cobrar y servir en la mesa.
- Los clientes dejan mesas sucias. Hay que recoger residuos y llevarlos a la basura.
- Se podrá contratar un cocinero y un camarero.
- El cocinero recoge ingredientes, cocina y lleva raciones al mostrador.
- El camarero reparte a las mesas y recoge residuos.
- El jugador puede realizar todas las tareas.
- No habrá reasignación dinámica de empleados entre profesiones.
- Se podrán comprar algunas mesas y mejoras.
- La progresión se guardará localmente.

## Decisiones aplazadas

Precios, tiempos de cocción, ritmo de llegada, salarios, costes, balance, número máximo de mesas, formato del guardado y navegación de clientes/empleados se decidirán en sus hitos. No introducir sistemas ni abstracciones preventivas para ellos.

El siguiente hito requiere revisión y aprobación explícita de esta base jugable.
