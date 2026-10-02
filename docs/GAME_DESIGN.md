# Warung Kita — diseño acordado

## Idea y dirección

Juego de gestión de un pequeño warung indonesio para navegador, en ordenador y móvil. Un local y un plato inicial: nasi goreng. Vista 2D cenital inclinada, suelo visible, caras superiores y frontales y sombras sencillas. Orden visual por los pies; colisiones sobre las huellas del suelo.

No es 3D y la cámara no gira. Desde el hito 2 la cámara puede seguir suavemente al jugador, limitada al mundo y con zoom uniforme, para mantener legibilidad en móvil. La distribución lógica del hito 1 se conserva.

Stack: Phaser 4.2.1, TypeScript estricto, Vite y npm con lockfile. Sin frameworks de interfaz, backend, base de datos, servicios externos, assets descargados, dependencias de pago ni APIs de IA durante partidas.

## Hito 1 aprobado

Local con frigorífico, hornillo, mostrador, dos mesas y papelera; jugador reconocible, movimiento, colisiones y profundidad. El usuario lo ha revisado manualmente y confirma que funciona. El esquema de controles e interacciones ha evolucionado en el hito 2.

## Hito 2 — reglas implementadas

### Movimiento y pantalla

- WASD y flechas en escritorio.
- Arrastre relativo desde un punto libre del lienzo. Su origen es el contacto inicial; no representa un destino.
- Un solo dedo controla el movimiento. Los demás no cambian el origen ni heredan el control.
- Zona muerta, distancia máxima y tolerancia configurables. Volver al origen o soltar detiene.
- Captura del puntero para gestionar liberación fuera del área; cancelación al perder foco, ocultar, cancelar gesto o redimensionar.
- Los botones de interfaz quedan fuera del control de movimiento.
- El juego ocupa el viewport dinámico, con interfaz fija dentro de zonas seguras, sin scroll, paneles externos ni Fullscreen API.
- Cámara con zoom uniforme y seguimiento limitado al mundo. No cambia el mapa al redimensionar.
- Sin tutoriales bloqueantes, flechas guiadas o pasos forzados.

### Permanencia

- Una sola estación seleccionada, por cercanía a un punto accesible y sin obstáculos.
- Permanecer quieto 1,5 segundos activa la acción disponible. El parámetro está centralizado.
- Se muestra progreso junto a la estación.
- Salir, intentar moverse, cambiar de estación o perder validez reinicia el progreso.
- La intención de movimiento cuenta aunque un mueble bloquee al jugador o se pulsen direcciones opuestas.
- Una acción completada bloquea esa estación hasta abandonar físicamente su radio. Cambiar la selección o perder el foco no desbloquea la zona.
- Si una acción no es válida, no se cronometra y se explica brevemente.
- Las acciones automáticas sustituyen las interacciones manuales anteriores.

### Producción

- Una unidad transportada: ingredientes para nasi goreng o una ración cocinada.
- Frigorífico ilimitado; solo entrega con manos vacías.
- Hornillo explícitamente vacío, cocinando o listo.
- Con ingredientes y hornillo vacío, se transfiere la carga y comienza una cocción de 4 segundos.
- El hornillo cocina aunque el jugador se aleje y rechaza más carga mientras esté ocupado.
- Una ración lista se recoge con manos vacías mediante otra permanencia; el hornillo queda vacío.
- Permanencia y cocción tienen relojes separados. No se encadenan carga y recogida por seguir sobre el indicador.
- Mostrador con capacidad configurable, inicialmente 5 raciones. Al llenarlo se anuncia el fin de la prueba.
- Si está lleno, el jugador conserva su ración. Todavía no hay ventas ni retirada de raciones del mostrador.
- La papelera descarta la unidad transportada. Manos vacías no generan una acción.
- Las mesas mantienen gráficos y colisiones sin interacción, consumo, servicio ni suciedad.
- Cada transferencia revalida origen y destino al ejecutarse y solo cambia una unidad.
- La simulación se pausa sin foco o con la pestaña oculta. No hay progreso offline.
- Carga, cocción, estado listo y existencias tienen representación visible y mensajes breves sin bloqueo.
- Herramienta provisional DEV: reinicia producción, carga, existencias, permanencia y posición sin recargar.

## Reglas futuras que deben conservarse

Aún no implementadas:

- Cada cliente decide al aparecer si quiere comer aquí o llevar.
- Dos filas comparten el mismo mostrador.
- La fila para llevar avanza aunque no haya mesas disponibles.
- Una mesa sucia puede reservarse; el cliente espera junto a ella hasta que se limpie.
- Limpieza y cliente asignado son datos independientes.
- Inicialmente una mesa corresponde a un cliente.
- Para llevar: cobrar y entregar.
- Para comer dentro: cobrar y servir en la mesa.
- Los clientes dejan mesas sucias; se recogen residuos y se llevan a la basura.
- Se podrá contratar un cocinero y un camarero.
- El cocinero recoge ingredientes, cocina y lleva raciones al mostrador.
- El camarero reparte a las mesas y recoge residuos.
- El jugador puede realizar todas las tareas.
- No habrá reasignación dinámica de empleados entre profesiones.
- Los ingredientes siguen siendo ilimitados inicialmente, aunque hay que transportarlos.
- Se podrán comprar algunas mesas y mejoras.
- La progresión se guardará localmente.

## Decisiones aplazadas

Precios, ritmo de llegada, salarios, costes, balance definitivo, máximo de mesas, formato de guardado y navegación de clientes/empleados. Los tiempos y la capacidad actuales son parámetros de prototipo.

El siguiente encargo será clientes, colas, cobro y servicio. Detener el desarrollo tras el hito 2 hasta revisión del usuario.
