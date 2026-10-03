# Warung Kita — diseño acordado

## Alcance

Juego de gestión de un warung indonesio para navegador, ordenador y móvil. Un local y una receta: nasi goreng. Phaser 4.2.1, TypeScript estricto y Vite con npm y lockfile. Sin frameworks de interfaz, backend, servicios externos ni assets descargados. Gráficos provisionales con Phaser.

Los hitos 1–4 están aprobados manualmente. Esta revisión autorizada ajusta experiencia y balance: mejoras globales, mesas organizadas, filas largas, demanda por gasto, mensajes ambientales y HUD mínimo. Detenerse después para revisión, sin ampliar el siguiente hito.

## Movimiento, espacio y cámara

WASD/flechas, diagonales normalizadas y arrastre relativo sin inercia. Un contacto fija origen con clientX/clientY en píxeles CSS; zona muerta 12 px, recorrido máximo 76 px y exponente 1,25. Un solo puntero. Soltar, cancelar, perder foco, ocultar o redimensionar elimina entradas y permanencia. Se conservan los controles aprobados.

Cámara centrada directamente en el cuerpo del jugador, factor 1 y desplazamiento vertical de 24 unidades desde sus pies. Sin límites ni retraso de seguimiento. Zoom uniforme según referencia 788 × 554 y mínimo 1,15. HUD anclado a pantalla con áreas seguras, sin scroll de página.

ROOM conserva su tamaño: x64/y144, 752 × 456. Es el único espacio del jugador y empleados. La altura dibujada no modifica huella ni colisiones; profundidad por los pies. El exterior decorativo cubre las vistas alcanzables. Los clientes pueden usar además una franja peatonal específica; eso no amplía el movimiento del jugador ni del personal.

## Distribución y navegación

Cuatro posiciones de mesa en cuadrícula de dos columnas y dos filas, con separación regular. Las dos de arriba son iniciales; las de abajo se compran. Huellas, asientos a la izquierda y puntos de limpieza al frente quedan definidos en src/world/layout.ts. Se conserva la cocina superior; filas a la derecha, separadas de mesas y limpieza.

Las rutas automáticas reservan las cuatro huellas de mobiliario desde el inicio. Las posiciones futuras se ven vacías, sin siluetas, sillas ni puntos utilizables. El jugador puede atravesar un espacio vacío; al comprar se verifica que ningún actor quede atrapado. Si está ocupado, la compra espera a que se libere: se deshabilita sin cobrar e indica cerrar el panel para dejar libre el espacio y reintentar. No se materializa un mueble sobre alguien. Al comprar se recalculan las rutas desde las posiciones actuales sin reiniciar tareas ni reservas.

Los clientes y empleados siguen rutas físicas sin colisiones rígidas entre personajes. La navegación interior rodea huellas ampliadas. Clientes de entrada recorren su carril desde un punto exterior más allá de la última plaza. Los que pagaron usan destinos propios; quienes salen utilizan un tercer carril por la derecha, pasando por encima de las cabezas de fila para no cortar sus recorridos.

Los círculos técnicos permanecen ocultos (DEBUG.customerMarkers desactivado). Los puntos de interacción del jugador y sus barras de progreso siguen visibles.

## Inventarios y mejoras globales

Cada actor posee inventario independiente y solo categorías aplicables:

- Jugador: ingredientes, platos de producción y residuos.
- Cocinero: ingredientes y platos.
- Limpieza: residuos.

Capacidad inicial **8** por categoría; transporte global la mejora a **12** y **16**. Una compra actualiza todos los inventarios existentes sin cambiar su contenido. Contrataciones posteriores heredan el nivel actual. Las categorías no comparten espacio. El mostrador conserva stock ilimitado.

La rapidez también es global: **1,5 → 1,2 → 0,9 s** por acción. Afecta recogida, carga, depósito, limpieza, eliminación de residuos y cobro del jugador; el personal usa el mismo tiempo para sus acciones aplicables. Cada ciclo captura su duración al comenzar la permanencia; una tarea que ya está actuando no cambia de duración al mejorar. Un trabajador aún caminando captura el valor cuando empieza a actuar al llegar.

No cambia desplazamiento (jugador 185, personal 110, clientes 90 unidades/s), consumo de clientes (6 s), ni cocción, que conserva su mejora específica.

## Permanencia, producción y cooperación

Una acción válida del jugador requiere quietud en el punto accesible más cercano, dentro de radio y línea de visión. Cada ciclo transfiere una unidad o atiende un cliente; después reevalúa e inicia otro ciclo completo sin salir. Sin acción válida no acumula progreso. Intención de movimiento, incluso contra muebles o con teclas opuestas, cancela el ciclo.

Se fijan acción, posición de hornillo, cliente y mesa al iniciar. Se revalida el mismo comando al completar. No se arrastra tiempo sobrante. Una cancelación pierde todo el progreso.

Frigorífico ilimitado, una unidad por ciclo. Cuatro posiciones de hornillo con relojes propios: vacía/cocinando/lista. Una lista ocupa su posición hasta retirarla. Prioriza recoger una lista si cabe, después cargar un ingrediente en una posición vacía. Se puede cargar aunque la categoría de platos esté llena.

Cada ración tarda inicialmente 4 s. Las mejoras específicas reducen nuevas cocciones a 3 y 2 s; una ración iniciada conserva la duración capturada. Beneficia producción de cualquier actor.

Depositar convierte un plato transportado en una ración disponible del mostrador por ciclo. Todos los platos del jugador son producción; no hay reparto ni platos ligados a pedidos. La papelera solo elimina residuos, una unidad por ciclo.

Las reservas de trabajo bloquean únicamente una posición del hornillo/ración o residuos de una mesa. No bloquean la estación completa ni la asignación del cliente. Se comparten validaciones y transferencias atómicas entre jugador y personal. Completar, cancelar, invalidar, no encontrar ruta o reiniciar libera la reserva.

## Personal

Como máximo un cocinero y una persona de limpieza. No cambian de profesión, no cobran y no reparten. Caminan hasta su destino y actúan allí.

El cocinero recoge ingredientes por lotes ajustados a su capacidad y a las raciones necesarias para el objetivo. Así aprovecha 8 o 12 ingredientes en un viaje si hacen falta; si solo falta una ración puede recoger una. Usa posiciones libres del hornillo, recoge raciones listas y deposita al llenar platos o cuando no quedan listas accesibles, incluso con carga parcial. No espera a llenar la capacidad de platos.

Objetivo operativo: **12 raciones disponibles**. Deja de iniciar cocciones y recoger ingredientes al alcanzarlo; termina y deposita platos ya iniciados o transportados. Puede superar el objetivo al terminar trabajo pendiente; no limita depósitos del jugador. Reanuda al bajar el stock y conserva materias primas sobrantes. Espera junto al hornillo mientras se cocina y fuera de puntos de acción al quedarse sin demanda; no cambia de objetivo cada frame.

Limpieza prioriza mesas sucias reservadas, por antigüedad del pago del cliente que espera. Después atiende otras mesas por antigüedad de suciedad. Vacía residuos al alcanzar su capacidad global o quedarse sin mesas sucias accesibles, aunque lleve menos. Sin tareas vuelve a su punto apartado. Una tarea iniciada mantiene objetivo hasta completarse o invalidarse.

## Filas, demanda y ventas

Dos filas independientes, con cabezas atendidas desde la misma Caja:

- **Comer dentro: 20 plazas.**
- **Para llevar: 10 plazas.**
- **Límite global: 48 clientes**, incluyendo todos los estados, no solo filas.

Las posiciones se generan a intervalos de 52 unidades sobre recorridos configurados; no se repite la última plaza. Ambos carriles verticales discurren a la derecha y continúan al exterior peatonal. Los clientes esperan en posiciones distintas; ninguno adelanta en su propia fila. Una cabeza debe alcanzar su destino antes de poder cobrarle. Entre cabezas elegibles, se elige la de mayor espera, con número de llegada como desempate.

Llegadas iniciales cada **8 s**. Intención **70 % comer dentro / 30 % para llevar**, decidida una vez. Si la fila elegida o el límite global está completo, se omite esa llegada sin cambiar intención ni acumular deuda.

Se suma gasto acumulado solo por compras correctas: contratación, mejoras y mesas. No cuentan ingresos, saldo actual o compras fallidas. Al llegar o superar **300 monedas gastadas**, la frecuencia aumenta **×1,5**, una única vez: intervalo base / 1,5, aproximadamente **5,33 s**. Se reinicia la espera de llegada para no generar una ráfaga ni una llegada instantánea. Las siguientes compras no vuelven a multiplicar. Aparece durante unos segundos: “¡El warung atrae más clientes!”.

Umbral, multiplicador, proporción y límites son provisionales y están en src/config.ts. Venta 10 monedas y saldo inicial 0, sin cambios.

## Autoservicio, mesas y residuos

La caja admite cualquier carga del jugador. Cada venta retira una ración y cobra 10 una sola vez. Para llevar recibe comida y sale. Comer dentro requiere mesa sin asignar: prioriza limpia, permite sucia. Se valida ruta antes de retirar stock/cobrar/reservar y entregar el plato directamente al cliente.

Si está limpia, camina al asiento con plato y solo come al llegar. Si está sucia, espera llevando su plato en uno de cuatro puntos distintos junto a caja, separados de filas. La mesa permanece reservada. Al limpiar conserva la reserva y ese cliente camina al asiento; si iba hacia la espera cambia ruta desde su posición actual. Una mesa bloqueada no impide ventas para llevar.

Limpieza y asignación son independientes. Mesa sucia transfiere un residuo al actor con capacidad; llevar otros objetos no lo impide. Tras 6 s de comida, el cliente deja suciedad, libera la mesa y sale; no se cobra otra vez. El pedido conserva trazabilidad y se elimina al salir.

## Mensajes ambientales y representación

Comentarios sobre clientes en fila: umbral aleatorio entre **10 y 15 s** asignado una vez. Participación aleatoria inicial del 65 %, de modo que algunos no comentan. Se comprueba cada **1 s**, sin probabilidad por frame ni comprobaciones acumuladas.

Bocadillos de **2,5 s**, máximo **dos** visibles; cada cliente espera al menos **20 s** desde su comentario anterior. Solo aparecen dentro de cámara y se omiten donde se superpondrían a la carga de un actor. También evitan superponerse entre sí. Se retiran al atender, salir de cámara o caducar. No introducen paciencia, abandono o penalización.

HUD permanente: solo **dinero y Mejoras**. Se retiran inventario, stock, cocina, filas, nombre del juego y estados técnicos del HUD. En el mundo se conservan la comida, suciedad, ocupación, las señales de cocción/lista y puntos de acción/progreso. Mensajes contextuales breves como “Carga de ingredientes completa” o “Faltan platos” aparecen junto al jugador cuando cambia la situación, sin repetirse cada frame.

Cada categoría transportada dibuja exactamente su cantidad: 10 ingredientes son diez piezas, siete platos son siete. Son torres pequeñas y distinguibles al lado del cuerpo, sin cambiar colisiones. Las tres pilas simultáneas de 16 conservan rostro y orientación; profundidad por pies. Jugador y empleados comparten CargoView, que reutiliza Graphics y solo redibuja al cambiar cantidades o lado. El indicador +1/−1 se sitúa sobre la carga.

## Panel, tiempo y reinicio

Mejoras se abre desde cualquier lugar. Cancela entradas, gesto y permanencia del jugador, libera su reserva y pausa simulación. Personal conserva tareas congeladas. Cerrar descarta delta y requiere una entrada nueva para moverse; una acción válida puede comenzar desde cero. Compras síncronas con saldo y nivel esperado: descuento único, máximo y protección ante doble pulsación.

| Compra | Precio |
| --- | --- |
| Cocinero | 100 |
| Limpieza | 80 |
| Capacidad del equipo | 60 / 120 |
| Rapidez del equipo | 80 / 160 |
| Velocidad del hornillo | 100 / 200 |
| Mesa 3 / Mesa 4 | 80 / 140 |

DEV se oculta en un diálogo: **F2** en escritorio o mantener pulsado dinero **1,2 s**. Muestra datos de prueba y reinicio, y también pausa. No hay dinero gratis en interfaz.

Todos los relojes de simulación usan tiempo activo; sin progreso offline. Pérdida de foco/pestaña oculta pausa; reanudar descarta el delta anterior. Delta máximo 100 ms: por debajo de 10 FPS la simulación avanza más despacio.

Reinicio: niveles globales, capacidades 8, acciones 1,5 s, cocción 4 s, gasto cero, demanda base sin activar, comentarios/temporizadores, clientes/filas, reservas, dos mesas iniciales, personal, inventarios, producción, saldo, selección, progreso, feedback, posición y cámara. Cierra los diálogos y limpia entradas.

## Arquitectura y alcance posterior

Restaurant coordina clientes, mesas, compras, dinero, demanda y reservas; Production ejecuta transferencias con el Inventory del actor. Staff lleva dos profesiones concretas; CustomerComments administra señales ambientales con información de visibilidad suministrada por la escena. Reglas independientes de Phaser/DOM. Las vistas representan datos; sin ECS, bus global o sistema genérico de tareas.

No hay persistencia: recargar comienza de cero. No añadir recetas, más hornillos, niveles individuales, cajero, tutoriales, arte final, publicidad, sonido o publicación. Sin push. Detenerse para revisión manual.
