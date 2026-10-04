# Warung Kita — diseño acordado

## Alcance

Juego de gestión de un warung indonesio para navegador, ordenador y móvil. Un local y una receta: nasi goreng. Phaser 4.2.1, TypeScript estricto y Vite con npm y lockfile. Sin frameworks de interfaz, backend, servicios externos ni assets descargados. Gráficos provisionales con Phaser.

Los hitos 1–4 están aprobados manualmente. La revisión de experiencia y balance está aprobada manualmente. El cierre del primer local también está aprobado manualmente. La revisión actual integra la oficina en pared, aleja la cámara y ajusta llegadas, demanda y coordinación de dos cocineros. Detenerse al terminar para revisión, sin nuevos locales, recetas, persistencia ni objetivos finales.

## Movimiento, espacio y cámara

WASD/flechas, diagonales normalizadas y arrastre relativo sin inercia. Un contacto fija origen con clientX/clientY en píxeles CSS; zona muerta 12 px, recorrido máximo 76 px y exponente 1,25. Un solo puntero. Soltar, cancelar, perder foco, ocultar o redimensionar elimina entradas y permanencia. Se conservan los controles aprobados.

Cámara centrada directamente en el cuerpo del jugador, factor 1 y desplazamiento vertical de 24 unidades desde sus pies. Sin límites ni retraso de seguimiento. Zoom uniforme: max(ancho/788, alto/554, 1,15) × **0,85**, un 15 % más alejado que el encuadre aprobado. El multiplicador está en CAMERA; el mínimo efectivo es 0,9775. No modifica ROOM, velocidades, colisiones ni radios. Arrastre en píxeles CSS; dinero y diálogos conservan tamaño de pantalla. HUD anclado a pantalla con áreas seguras, sin scroll de página.

ROOM se mantiene en x64/y144, 832 × 636 para alojar la tercera fila de mesas y la zona de caja trasera. Es el único espacio del jugador y empleados. La altura dibujada no modifica huella ni colisiones; profundidad por los pies. El exterior decorativo cubre las vistas alcanzables. Los clientes pueden usar además una franja peatonal específica; eso no amplía el movimiento del jugador ni del personal.

## Distribución y navegación

Seis posiciones de mesa en cuadrícula de dos columnas y tres filas, con separación regular. Las dos de arriba son iniciales; las otras cuatro se compran sucesivamente. Huellas, asientos a la izquierda y puntos de limpieza al frente quedan definidos en src/world/layout.ts. Se conserva la cocina superior; filas a la derecha, separadas de mesas y limpieza.

Las rutas automáticas reservan las seis huellas de mesas y las dos de hornillos desde el inicio. La oficina es una puerta integrada en la pared izquierda, con umbral y alfombra interior accesible, rótulo «Oficina» e indicador encima. Sin habitación ni huella física: se elimina el antiguo mueble y su colisión. Su zona está separada de las otras interacciones. Las posiciones futuras se ven vacías, sin siluetas, sillas ni puntos utilizables. El jugador puede atravesar un espacio vacío; al comprar se verifica que ningún actor quede atrapado. Si está ocupado, la compra espera a que se libere: se deshabilita sin cobrar e indica cerrar el panel para dejar libre el espacio y reintentar. No se materializa un mueble sobre alguien. Al comprar se recalculan las rutas desde las posiciones actuales sin reiniciar tareas ni reservas.

Los clientes y empleados siguen rutas físicas sin colisiones rígidas entre personajes. Los clientes permanecen en el lado público (y >= 340) o en la franja exterior; un obstáculo virtual de navegación les impide acceder a cocina o a la parte trasera del mostrador. Jugador y empleados sí pueden circular allí. La navegación interior rodea huellas ampliadas. Clientes de entrada recorren su carril desde un punto exterior más allá de la última plaza. Los que pagaron usan destinos propios; quienes salen utilizan un tercer carril por la derecha, pasando por encima de las cabezas de fila para no cortar sus recorridos.

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

Se fijan acción, identificador del hornillo, posición, cliente y mesa al iniciar. Se revalida el mismo comando al completar. No se arrastra tiempo sobrante. Una cancelación pierde todo el progreso.

Frigorífico ilimitado, una unidad por ciclo. Uno o dos hornillos, cada uno con cuatro posiciones y relojes propios: vacía/cocinando/lista. Una lista ocupa su posición hasta retirarla. Prioriza recoger una lista si cabe, después cargar un ingrediente en una posición vacía. Se puede cargar aunque la categoría de platos esté llena.

Cada ración tarda inicialmente 4 s. Las mejoras específicas reducen nuevas cocciones a 3 y 2 s; una ración iniciada conserva la duración capturada. Beneficia producción de cualquier actor.

Depositar convierte un plato transportado en una ración disponible del mostrador por ciclo. Todos los platos del jugador son producción; no hay reparto ni platos ligados a pedidos. La papelera solo elimina residuos, una unidad por ciclo.

Las reservas de trabajo bloquean únicamente un par hornillo/posición o su ración o residuos de una mesa. No bloquean la estación completa ni la asignación del cliente. Se comparten validaciones y transferencias atómicas entre jugador y personal. Completar, cancelar, invalidar, no encontrar ruta o reiniciar libera la reserva.

## Personal

Como máximo **dos cocineros y una persona de limpieza**. Identidad y profesión independientes; nadie cambia de profesión, cobra ni reparte. Inventario propio, traslado físico y acciones temporizadas. Una tarjeta «Contratar cocinero» cuesta **100 / 220**; el segundo requiere primer cocinero y segundo hornillo instalado y operativo. Con dos muestra «Equipo completo». Ambos heredan mejoras globales previas y posteriores.

Con uno, consulta ambos hornillos, prioriza raciones listas y después posiciones vacías, eligiendo el más cercano entre candidatos equivalentes. Con dos, el primero queda asignado al inicial y el segundo al adicional. Solo trabajan en su hornillo, sin ayuda cruzada ni reasignaciones continuas; comparten frigorífico y depósito. Contratar el segundo cancela únicamente tareas del primero en el hornillo que deja de corresponderle: libera sus reservas conservando posición e inventario. Las demás tareas válidas se conservan. El jugador usa cualquiera.

Objetivo conjunto: **12 raciones comprometidas** = stock + platos transportados por ambos cocineros + posiciones cocinando/listas de ambos hornillos + reservas de cargas automáticas pendientes. Cada ración cuenta una sola vez; ingredientes y platos que aún lleva el jugador no cuentan. Iniciar tarea de carga reserva capacidad y posición concreta. Al completar se revalida excluyendo la propia reserva: la cocción la reemplaza atómicamente. Cancelar, invalidar o reiniciar libera posición y capacidad; si falta ruta no se conserva reserva.

Recogen ingredientes por lotes según capacidad y producción restante. Al alcanzar 12 dejan de recoger ingredientes y de iniciar cocciones, pero recogen y depositan lo producido, incluidos lotes parciales. Reanudan tras ventas conservando materias primas sobrantes. La producción manual puede superar 12 y cancelar cargas automáticas pendientes; las cocciones iniciadas se terminan. Esperan junto a su hornillo mientras cocina, y en un punto apartado sin trabajo.

Limpieza prioriza mesas sucias reservadas, por antigüedad del pago del cliente que espera. Después atiende otras mesas por antigüedad de suciedad. Vacía residuos al alcanzar su capacidad global o quedarse sin mesas sucias accesibles, aunque lleve menos. Sin tareas vuelve a su punto apartado. Una tarea iniciada mantiene objetivo hasta completarse o invalidarse.

## Filas, demanda y ventas

Dos filas independientes, con cabezas atendidas desde la misma Caja:

- **Comer dentro: 20 plazas.**
- **Para llevar: 10 plazas.**
- **Límite global: 48 clientes**, incluyendo todos los estados, no solo filas.

Las posiciones se generan a intervalos de 52 unidades sobre recorridos configurados; no se repite la última plaza. Ambos carriles verticales discurren a la derecha y continúan al exterior peatonal. Los clientes esperan en posiciones distintas; ninguno adelanta en su propia fila. Una cabeza debe alcanzar su destino antes de poder cobrarle. Entre cabezas elegibles, se elige la de mayor espera, con número de llegada como desempate.

El **primer desplazamiento efectivo del jugador**, tras resolver colisiones, activa una cuenta atrás única de **8 s activos**. Teclas contra la pared, intención sin desplazamiento y personal no la inician. No requiere comida; depósitos y stock no influyen. Detenerse no la reinicia. Oficina, pérdida de foco y pestaña oculta congelan el reloj; reanudar no recupera tiempo pasado.

Después de la primera llegada se aplica intervalo base **8 s** dividido por frecuencia absoluta:

| Gasto acumulado válido | Frecuencia | Intervalo |
| --- | --- | --- |
| Menos de 300 | 0,8 | 10 s |
| 300 a menos de 600 | 1,2 | 6,6667 s |
| Desde 600 | 1,5 | 5,3333 s |

Solo compras correctas suman gasto; ingresos, saldo e intentos fallidos no cuentan. Cambiar tramo aplica directamente el final, muestra un aviso y programa un intervalo nuevo completo sin ráfaga/deuda. Si aún está pendiente el primero, conserva su cuenta atrás. Una compra que atravesase varios umbrales genera un solo aviso. No aumenta tras el último tramo.

Intención **70 % comer dentro / 30 % para llevar**, elegida una vez. Una fila elegida llena o límite global completo omiten la llegada sin desviar intención ni acumular deuda. Umbrales, frecuencias, demora, proporción y límites provisionales en src/config.ts. Venta 10 y saldo inicial 0.

## Autoservicio, mesas y residuos

El mostrador separa físicamente a los clientes del jugador. El punto de caja del jugador está detrás, en x715/y200; las cabezas de cliente están en x690/y375 y x770/y375, delante. Depositar usa otro punto, x575/y282, sin solapar radios con caja. Se comprueba radio, zona trasera válida y línea de visión al punto accesible, conservando obstáculos. El marcador trasero, rótulo y progreso se dibujan sobre el mostrador para que no queden ocultos; el personaje sigue ordenado por sus pies.

La caja admite cualquier carga del jugador. Cada venta retira una ración y cobra 10 una sola vez. Para llevar recibe comida y sale. Comer dentro requiere mesa sin asignar: prioriza limpia, permite sucia. Se valida ruta antes de retirar stock/cobrar/reservar y entregar el plato directamente al cliente.

Si está limpia, camina al asiento con plato y solo come al llegar. Si está sucia, espera llevando su plato en uno de seis puntos distintos del lado público junto a caja, separados de filas. La mesa permanece reservada. Al limpiar conserva la reserva y ese cliente camina al asiento; si iba hacia la espera cambia ruta desde su posición actual. Una mesa bloqueada no impide ventas para llevar.

Limpieza y asignación son independientes. Mesa sucia transfiere un residuo al actor con capacidad; llevar otros objetos no lo impide. Tras 6 s de comida, el cliente deja suciedad, libera la mesa y sale; no se cobra otra vez. El pedido conserva trazabilidad y se elimina al salir.

## Mensajes ambientales y representación

Comentarios sobre clientes en fila: umbral aleatorio entre **10 y 15 s** asignado una vez. Participación aleatoria inicial del 65 %, de modo que algunos no comentan. Se comprueba cada **1 s**, sin probabilidad por frame ni comprobaciones acumuladas.

Bocadillos de **2,5 s**, máximo **dos** visibles; cada cliente espera al menos **20 s** desde su comentario anterior. Solo aparecen dentro de cámara y se omiten donde se superpondrían a la carga de un actor. También evitan superponerse entre sí. Se retiran al atender, salir de cámara o caducar. No introducen paciencia, abandono o penalización.

HUD permanente: solo **dinero**. El acceso a Mejoras se encuentra en la alfombra de la oficina en la pared izquierda. Se retiran inventario, stock, cocina, filas, nombre del juego y estados técnicos del HUD. En el mundo se conservan la comida, suciedad, ocupación, las señales de cocción/lista y puntos de acción/progreso. Mensajes contextuales breves como “Carga de ingredientes completa” o “Faltan platos” aparecen junto al jugador cuando cambia la situación, sin repetirse cada frame.

Cada categoría transportada dibuja exactamente su cantidad: 10 ingredientes son diez piezas, siete platos son siete. Son torres pequeñas y distinguibles al lado del cuerpo, sin cambiar colisiones. Las tres pilas simultáneas de 16 conservan rostro y orientación; profundidad por pies. Jugador y empleados comparten CargoView, que reutiliza Graphics y solo redibuja al cambiar cantidades o lado. El indicador +1/−1 se sitúa sobre la carga.

## Panel, tiempo y reinicio

Mejoras se abre únicamente permaneciendo quieto en la oficina, con la duración vigente del jugador y el mismo progreso de interacción. Al completarse se bloquea ese acceso hasta salir de la zona y volver: cerrar no abre de nuevo. El resto de acciones mantienen repetición continua. Cancela entradas, gesto y permanencia del jugador, libera su reserva y pausa simulación. Personal conserva tareas congeladas. Cerrar descarta delta y requiere una entrada nueva para moverse; una acción válida puede comenzar desde cero. Compras síncronas con saldo y nivel esperado: descuento único, máximo y protección ante doble pulsación.

| Compra | Precio |
| --- | --- |
| Contratar cocinero (máximo dos; segundo requiere otro hornillo) | 100 / 220 |
| Limpieza | 80 |
| Capacidad del equipo | 60 / 120 |
| Rapidez del equipo | 80 / 160 |
| Velocidad del hornillo | 100 / 200 |
| Añadir mesa (cuatro compras, 2 → 6) | 80 / 140 / 220 / 320 |
| Añadir hornillo (1 → 2) | 180 |

Una única tarjeta de mesas actualiza el siguiente precio y muestra “Espacio completo” al llegar a seis; el hornillo muestra “Máximo alcanzado” al llegar a dos. Las compras revalidan saldo, nivel y colocación antes del descuento único. Si una huella está ocupada se rechaza sin cobrar; no se crea una compra pendiente ni hay que completarla después. Los identificadores de mesas solo se usan internamente y en DEV; en el mundo se muestra “Limpiar”, sin números.

DEV se oculta en un diálogo: **F2** en escritorio o mantener pulsado dinero **1,2 s**. Muestra datos de prueba y reinicio, y también pausa. No hay dinero gratis en interfaz.

Todos los relojes de simulación usan tiempo activo; sin progreso offline. Pérdida de foco/pestaña oculta pausa; reanudar descarta el delta anterior. Delta máximo 100 ms: por debajo de 10 FPS la simulación avanza más despacio.

Reinicio: niveles globales, capacidades 8, acciones 1,5 s, cocción 4 s, gasto cero, demanda base sin activar, comentarios/temporizadores, clientes/filas, reservas, dos mesas y un hornillo iniciales, espera del primer movimiento, bloqueo de oficina, precios de compra, ambos cocineros y limpieza, asignaciones, inventarios, reservas de carga, producción, saldo, selección, progreso, feedback, posición y cámara. Cierra los diálogos y limpia entradas.

## Arquitectura y alcance posterior

Restaurant coordina clientes, mesas, compras, dinero, demanda y reservas; Production ejecuta transferencias con el Inventory del actor. Staff lleva dos profesiones concretas; CustomerComments administra señales ambientales con información de visibilidad suministrada por la escena. Reglas independientes de Phaser/DOM. Las vistas representan datos; sin ECS, bus global o sistema genérico de tareas.

No hay persistencia: recargar comienza de cero. No añadir nuevos locales, recetas, más de dos hornillos, niveles individuales, cajero, tutoriales, objetivos finales, arte final, publicidad, sonido o publicación. Sin push. Detenerse para revisión manual.
