# Warung Kita — diseño acordado

**Hito vigente (2026-10-21):** la partida normal empieza deteriorada/cerrada con 150, sin instalaciones, mesas ni personal. Reforma e instalaciones fijas, tutorial hasta primera recogida de efectivo, apertura explícita y guardado local versionado. Ver [OPENING_AND_SAVE.md](OPENING_AND_SAVE.md), que sustituye el inicio operativo y las restricciones anteriores de tutorial/guardado. La conexión al normal de oficina/comedor/empleados/encargos se describe en [PROGRESSION.md](PROGRESSION.md), que prevalece sobre los precios y requisitos históricos siguientes.


## Alcance

Juego de gestión de un warung indonesio para navegador, ordenador y móvil. Un local y una receta: nasi goreng. Phaser 4.2.1, TypeScript estricto y Vite con npm y lockfile. Sin frameworks de interfaz, backend, servicios externos ni assets descargados. Gráficos provisionales con Phaser.

Los hitos 1–4 están aprobados manualmente. La revisión de experiencia y balance está aprobada manualmente. El cierre del primer local también está aprobado manualmente. La revisión de oficina, cámara, llegadas, demanda y dos cocineros también está aprobada manualmente. La renovación visual está aprobada manualmente. La localización y la base están aprobadas manualmente. El experimento de acciones a 0,8/0,6/0,4 s, cajero y encargos funciona según la revisión manual. Distribución y flujo de entrega aprobados manualmente. La entrega anterior (2026-10-12) corrige textos de entrega, oculta la capacidad, progresa encargos 4→6→9, optimiza tandas de cocineros y añade el tramo de demanda avanzada. Demanda 65/35, frecuencias 0,8/1,2/2/2,4 desde gasto 0/300/500/1000. Conserva precios por ración, ratio de bonus, cocción, rapidez de acciones, movimiento y consumo. Idioma y guardados normal/DEV independientes. Detenerse al terminar para revisión, sin nuevos locales, recetas ni objetivos finales.

## Dirección visual

Primera renovación: restaurante de juguete 2D con perspectiva inclinada, volúmenes redondeados, crema/madera cálida y verde jade, acento coral y sombras suaves. Suelo cerámico en cocina y madera en comedor. Tema central compartido con CSS en src/visuals/theme.ts; fuentes de sistema y textos del mundo a resolución 3. Sin assets descargados, 3D ni dependencias nuevas.

Alfombra Selamat datang en la entrada efectiva de clientes, solo decorativa. Placa mural con título y subtítulo completos: se corrige posición/contraste frente al zócalo, sin elevar globalmente textos. Huellas y puntos funcionales permanecen idénticos.

Personajes con vestuario por rol y cuatro variantes de clientes. Piezas de Graphics dibujadas una vez; marcha solo mediante transformaciones, profundidad por pies. Torres exactas: paquetes de ingredientes, platos ovalados y bolsas de residuos. Wok/vapor/progreso, marca de listo y restos/exclamación identifican estados además del color. Avisos fuera de la carga.

Panel de mejoras con estados escritos y cierre fijo al desplazar la lista. HUD de dinero, más tarjeta compacta únicamente con encargo activo. Animación breve al quedar lista una ración, sin filtros, partículas ni sacudidas. Detalles y límites en [VISUAL_DESIGN.md](VISUAL_DESIGN.md). Esta renovación no cambia ninguna regla descrita a continuación.

## Localización

Interfaz completa en español, inglés e indonesio; catálogos de claves estables en src/i18n/catalogs. Elección guardada válida > lista ordenada de preferencias del navegador, incluidas variantes regionales > inglés. Sin inferir por ubicación. Selector con los nombres nativos en oficina; cambiar no altera simulación ni pausa.

La preferencia de idioma se persiste en warung-kita.language, separada de las partidas. Almacenamiento inaccesible no bloquea juego ni selector. Las reglas entregan claves y parámetros independientes del idioma; la vista aplica traducciones y formatos numéricos con Intl.NumberFormat. Textos existentes, texturas de texto Phaser, comentarios y avisos se actualizan sin reiniciar sus relojes. Respaldo inglés y aviso en desarrollo si falta una clave.

Conservar Warung Kita, nasi goreng y Selamat datang decorativo. Títulos y botones DEV localizados; su volcado interno mantiene identificadores técnicos. Detalles y guía de revisión nativa en [LOCALIZATION.md](LOCALIZATION.md).

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

Capacidad fija **8** por categoría para jugador y contrataciones actuales/futuras. La tarjeta de transporte permanece deshabilitada por ahora; la compra se rechaza sin gasto ni cambios. Configuración 12/16 conservada pero inaccesible con UPGRADES.transport.enabled en false. Las categorías no comparten espacio. El mostrador conserva stock ilimitado.

La rapidez también es global: **0,8 → 0,6 → 0,4 s** por acción. Afecta recogida, carga, depósito, limpieza, eliminación de residuos y cobro, retirada de stock y empaquetado del jugador; el personal usa el mismo tiempo para sus acciones aplicables. Cada ciclo captura su duración al comenzar la permanencia; una tarea que ya está actuando no cambia de duración al mejorar. Un trabajador aún caminando captura el valor cuando empieza a actuar al llegar.

No cambia desplazamiento (jugador 185, personal 110, clientes 90 unidades/s), consumo de clientes (6 s), ni cocción, que conserva su mejora específica.

## Permanencia, producción y cooperación

Una acción válida del jugador requiere quietud en el punto accesible más cercano, dentro de radio y línea de visión. Cada ciclo transfiere una unidad o atiende un cliente; después reevalúa e inicia otro ciclo completo sin salir. Sin acción válida no acumula progreso. Intención de movimiento, incluso contra muebles o con teclas opuestas, cancela el ciclo.

Se fijan acción, identificador del hornillo, posición, cliente y mesa al iniciar. Se revalida el mismo comando al completar. No se arrastra tiempo sobrante. Una cancelación pierde todo el progreso.

Frigorífico compartido con stock real, inicialmente vacío; una unidad reservada por actor y ciclo completado. Reponer en el proveedor. Uno o dos hornillos, cada uno con cuatro posiciones y relojes propios: vacía/cocinando/lista. Una lista ocupa su posición hasta retirarla. Prioriza recoger una lista si cabe, después cargar un ingrediente en una posición vacía. Se puede cargar aunque la categoría de platos esté llena.

Cada ración tarda inicialmente 4 s. Las mejoras específicas reducen nuevas cocciones a 3 y 2 s; una ración iniciada conserva la duración capturada. Beneficia producción de cualquier actor.

Depositar convierte un plato transportado en una ración disponible del mostrador por ciclo. Todos los platos del jugador son producción; no hay reparto ni platos ligados a pedidos. La papelera solo elimina residuos, una unidad por ciclo.

Las reservas de trabajo bloquean un par hornillo/posición o su ración, residuos de una mesa o la única operación de caja compartida entre jugador y cajero. No bloquean la estación completa ni la asignación del cliente. Se comparten validaciones y transferencias atómicas entre jugador y personal. Completar, cancelar, invalidar, no encontrar ruta o reiniciar libera la reserva.

## Personal

Como máximo **dos cocineros, una persona de limpieza y un cajero**. Identidad y profesión independientes; nadie cambia de profesión ni reparte. El cajero solo cobra, sin inventario de comida o residuos. Inventario propio, traslado físico y acciones temporizadas. Una tarjeta «Contratar cocinero» cuesta **100 / 220**; el segundo requiere primer cocinero y segundo hornillo instalado y operativo. Con dos muestra «Equipo completo». Ambos heredan mejoras globales previas y posteriores.

Con uno, consulta ambos hornillos, prioriza raciones listas y después posiciones vacías, eligiendo el más cercano entre candidatos equivalentes. Con dos, el primero queda asignado al inicial y el segundo al adicional. Solo trabajan en su hornillo, sin ayuda cruzada ni reasignaciones continuas; comparten frigorífico y depósito. Contratar el segundo cancela únicamente tareas del primero en el hornillo que deja de corresponderle: libera sus reservas conservando posición e inventario. Las demás tareas válidas se conservan. El jugador usa cualquiera.

Objetivo conjunto: **12 raciones comprometidas** = stock + platos transportados por ambos cocineros + posiciones cocinando/listas de ambos hornillos + reservas de cargas automáticas pendientes. Cada ración cuenta una sola vez; ingredientes y platos que aún lleva el jugador no cuentan. Iniciar tarea de carga reserva capacidad y posición concreta. Al completar se revalida excluyendo la propia reserva: la cocción la reemplaza atómicamente. Cancelar, invalidar o reiniciar libera posición y capacidad; si falta ruta no se conserva reserva.

Recogen ingredientes en lotes de al menos 4 cuando hace falta producción, hasta 8 según capacidad y producción restante. Buscan tandas de 4 platos: recogen lo listo, aprovechan ingredientes que ya llevan y esperan las cocciones de su hornillo antes de marcharse con una tanda parcial. En mostrador descargan todos los platos aunque aparezca otro listo. Si no queda cocción ni carga posible, entregan la tanda parcial; nunca fuerzan producción por encima de 12 para completarla. Al alcanzar 12 dejan de recoger ingredientes y de iniciar cocciones, pero recogen y depositan lo producido, incluidos lotes parciales. Reanudan tras ventas y retiradas de stock conservando materias primas sobrantes. La producción manual puede superar 12 y cancelar cargas automáticas pendientes; las cocciones iniciadas se terminan. Esperan junto a su hornillo mientras cocina, y en un punto apartado sin trabajo.

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
| 300 a menos de 500 | 1,2 | 6,6667 s |
| 500 a menos de 1000 | 2 | 4 s |
| Desde 1000 | 2,4 | 3,3333 s |

Solo compras correctas de mejoras y contrataciones suman gasto; ingresos, saldo e intentos fallidos no cuentan. Cambiar tramo aplica directamente el final, muestra un aviso y programa un intervalo nuevo completo sin ráfaga/deuda. Si aún está pendiente el primero, conserva su cuenta atrás. Una compra que atravesase varios umbrales genera un solo aviso. No aumenta tras el último tramo.

Intención **65 % comer dentro / 35 % para llevar**, elegida una vez. Una fila elegida llena o límite global completo omiten la llegada sin desviar intención ni acumular deuda. Umbrales, frecuencias, demora, proporción y límites provisionales en src/config.ts. Venta 10 y saldo inicial 30.

## Autoservicio, mesas y residuos

El mostrador separa físicamente a los clientes del jugador. El punto de caja del jugador está detrás, en x715/y200; las cabezas de cliente están en x690/y375 y x770/y375, delante. Depositar usa otro punto, x575/y282, sin solapar radios con caja. Se comprueba radio, zona trasera válida y línea de visión al punto accesible, conservando obstáculos. El símbolo y progreso de caja conservan su posición elevada. El nombre Caja queda 12 unidades sobre el punto de suelo y el personaje puede taparlo; su zona física no cambia.

La caja admite cualquier carga del jugador. Cada venta retira una ración y cobra 10 una sola vez. Para llevar recibe comida y sale. Comer dentro requiere mesa sin asignar: prioriza limpia, permite sucia. Se valida ruta antes de retirar stock/cobrar/reservar y entregar el plato directamente al cliente.

Si está limpia, camina al asiento con plato y solo come al llegar. Si está sucia, espera llevando su plato en uno de seis puntos distintos del lado público junto a caja, separados de filas. La mesa permanece reservada. Al limpiar conserva la reserva y ese cliente camina al asiento; si iba hacia la espera cambia ruta desde su posición actual. Una mesa bloqueada no impide ventas para llevar.

Limpieza y asignación son independientes. Mesa sucia transfiere un residuo al actor con capacidad; llevar otros objetos no lo impide. Tras 6 s de comida, el cliente deja suciedad, libera la mesa y sale; no se cobra otra vez. El pedido conserva trazabilidad y se elimina al salir.

## Cajero y encargos voluntarios

El cajero cuesta 150, requiere primer cocinero y suma gasto válido. Camina al puesto x780/y195 antes de reservar la caja; no bloquea mientras camina. Usa exactamente la selección de cabeza elegible, stock y reservas de mesa actuales. Caja es una única reserva: jugador primero puede terminar; cajero primero mantiene su ciclo aunque el jugador se acerque. Sin stock/cliente/mesa válida espera y reanuda cuando puede. Hereda rapidez y conserva ciclos iniciados.

Primer cocinero desbloquea una oferta de 4 nasi goreng, notificación y señal del tablón sin ventana automática. Primeros encargos completados: 4, 6, 9 raciones; después alterna 6/9 sin repetir consecutivamente. Cancelar durante introducción conserva el paso. Después de cobrar/cancelar: espera 45 s activos. Oferta no caduca; aceptación inicia 90 s activos para bonus del 50 % de base (cantidad × precio normal). Al llegar a cero permanece entregable por base. Ningún ingreso suma gasto.

Tablón mural en la pared izquierda justo debajo de Oficina, con hojas, icono de caja y rótulo Encargos. Punto de interacción x90/y581, separado más de dos radios de todos los demás. Presente desde inicio con requisito breve de cocinero. Antes de desbloquear, 1,5 s de permanencia muestra solo un aviso, sin panel; se exige salir/volver para repetir. Al contratar se avisa y aparece insignia de oferta. Hasta abrirlo realmente tras el desbloqueo, una flecha discreta orienta cuando queda fuera de cámara. Abrir retira esa ayuda definitivamente hasta DEV. Preparar encargo se sitúa en esquina superior derecha, huella x820/y145 y punto x852/y211, distinto de caja y depósito. Sustituye al punto Retirar platos: si se llevan platos, empaqueta uno; en caso contrario recoge una ración real del mostrador. Cada operación consume su ciclo completo independiente, reevalúa y repite sin salir. Solo con encargo activo, respetando capacidad y pendiente. Revalidación síncrona evita consumir la misma ración que una venta. No se reserva el stock al aceptar; cocineros mantienen reposición habitual.

Empaquetar transfiere un plato por ciclo, conserva otras categorías y sobrantes. Caja física con unidades y progreso. Empaquetar el último pasa a ready, fija base y bonus y muestra aviso; no abona dinero todavía. El tablón se ilumina y orienta al jugador para volver y pulsar Entregar y cobrar. Cobro único por ID, sin recompensa extra; al cobrar se marca el objetivo, se vacía la caja y comienza la espera de 45 s. El paseo de vuelta no reduce el bonus ya ganado. No hay transporte físico de la caja ni otro destino. Cancelación con confirmación devuelve lo empaquetado una vez al stock y conserva inventario transportado y saldo; espera nueva de 45 s. Aceptar el primero muestra aviso de dónde empaquetar y orientación fuera de cámara durante 8 s activos o hasta llegar. Una flecha local señala la estación hasta la primera visita. Ayuda inferior sin capturar entradas y oculta durante arrastre/panel/pausa; dinero y carga del jugador quedan libres. Un único objetivo voluntario de primer encargo, sin recompensa adicional ni sistema genérico de misiones. HUD compacto de progreso/bonus durante encargo activo; listo muestra volver a entregar y desaparece al cobrar. Todos los textos es/en/id. Reglas, valores provisionales y recorrido de revisión en [ENCARGOS.md](ENCARGOS.md).

## Mensajes ambientales y representación

Comentarios sobre clientes en fila: umbral aleatorio entre **10 y 15 s** asignado una vez. Participación aleatoria inicial del 65 %, de modo que algunos no comentan. Se comprueba cada **1 s**, sin probabilidad por frame ni comprobaciones acumuladas.

Bocadillos de **2,5 s**, máximo **dos** visibles; cada cliente espera al menos **20 s** desde su comentario anterior. Solo aparecen dentro de cámara y se omiten donde se superpondrían a la carga de un actor. También evitan superponerse entre sí. Se retiran al atender, salir de cámara o caducar. No introducen paciencia, abandono o penalización.

HUD permanente: solo **dinero**; una tarjeta compacta adicional aparece durante el encargo activo o listo para entregar. El acceso a Mejoras se encuentra en la alfombra de la oficina en la pared izquierda. Se retiran inventario, stock, cocina, filas, nombre del juego y estados técnicos del HUD. En el mundo se conservan la comida, suciedad, ocupación, las señales de cocción/lista y puntos de acción/progreso. Mensajes contextuales breves como “Carga de ingredientes completa” o “Faltan platos” aparecen junto al jugador cuando cambia la situación, sin repetirse cada frame.

Cada categoría transportada dibuja exactamente su cantidad: 10 ingredientes son diez piezas, siete platos son siete. Son torres pequeñas y distinguibles al lado del cuerpo, sin cambiar colisiones. Las tres pilas simultáneas de 16 conservan rostro y orientación; profundidad por pies. Jugador y empleados comparten CargoView, que reutiliza Graphics y solo redibuja al cambiar cantidades o lado. El indicador +1/−1 se sitúa sobre la carga.

## Panel, tiempo y reinicio

Mejoras se abre únicamente permaneciendo quieto en la oficina, con 1,5 s independientes de rapidez y el mismo progreso de interacción. El tablón aplica la misma duración, pausa y bloqueo de reapertura. Al completarse se bloquea ese acceso hasta salir de la zona y volver: cerrar no abre de nuevo. El resto de acciones mantienen repetición continua. Cancela entradas, gesto y permanencia del jugador, libera su reserva y pausa simulación. Personal conserva tareas congeladas. Cerrar descarta delta y requiere una entrada nueva para moverse; una acción válida puede comenzar desde cero. Compras síncronas con saldo y nivel esperado: descuento único, máximo y protección ante doble pulsación.

| Compra | Precio |
| --- | --- |
| Contratar cocinero (máximo dos; segundo requiere otro hornillo) | 100 / 220 |
| Limpieza | 80 |
| Cajero (máximo uno, requiere primer cocinero) | 150 |
| Rapidez del equipo | 80 / 160 |
| Velocidad del hornillo | 100 / 200 |
| Añadir mesa (cuatro compras, 2 → 6) | 80 / 140 / 220 / 320 |
| Añadir hornillo (1 → 2) | 180 |

La mejora de capacidad está oculta y bloqueada; capacidad fija 8 para todos. Una única tarjeta de mesas actualiza el siguiente precio y muestra “Espacio completo” al llegar a seis; el hornillo muestra “Máximo alcanzado” al llegar a dos. Las compras revalidan saldo, nivel y colocación antes del descuento único. Si una huella está ocupada se rechaza sin cobrar; no se crea una compra pendiente ni hay que completarla después. Los identificadores de mesas solo se usan internamente y en DEV; en el mundo se muestra “Limpiar”, sin números.

La papelera está en la esquina inferior izquierda, huella x90/y715 y punto x170/y735, despejando Oficina/Encargos. Se conserva acceso para jugador y limpieza incluso con ampliación completa.

Para pruebas, ?monedas=600 o ?monedas=500 solo en Vite dev y localhost/127.0.0.1/::1. Enteros 0..100000; ausente/inválido da 30. Inicializa saldo, sin gasto, desbloqueos, llegadas ni persistencia. DEV restaura ese saldo; producción ignora el parámetro. Inicio normal conserva saldo 30.

DEV se oculta en un diálogo: **F2** en escritorio o mantener pulsado dinero **1,2 s**. Muestra datos de prueba y reinicio, y también pausa. No hay dinero gratis en interfaz.

Todos los relojes de simulación usan tiempo activo; sin progreso offline. Pérdida de foco/pestaña oculta pausa; reanudar descarta el delta anterior. Delta máximo 100 ms: por debajo de 10 FPS la simulación avanza más despacio.

Reinicio: niveles globales, capacidades 8, acciones 0,8 s, cocción 4 s, gasto cero, demanda base sin activar, comentarios/temporizadores, clientes/filas, reservas, dos mesas y un hornillo iniciales, espera del primer movimiento, bloqueos de oficina y tablón, precios de compra, ambos cocineros, limpieza y cajero, asignaciones, inventarios, reservas de carga, producción, saldo, selección, progreso, feedback, posición y cámara. Borra también la operación de caja, oferta/encargo/listo/espera, recompensa pendiente, comida empaquetada y caja dibujada, bonificación, objetivo introductorio y referencias de comandos. También limpia primera visita al tablón y a empaquetado, orientación y temporizador de 8 s. Los IDs de encargo no se reutilizan. Cierra los diálogos y limpia entradas.

## Arquitectura y alcance posterior

Restaurant coordina clientes, mesas, compras, dinero, demanda y reservas; Production ejecuta transferencias con el Inventory del actor. BulkOrders mantiene los estados de encargo y el objetivo introductorio; Staff lleva tres profesiones concretas; CustomerComments administra señales ambientales con información de visibilidad suministrada por la escena. Reglas independientes de Phaser/DOM. Las vistas representan datos; sin ECS, bus global o sistema genérico de tareas.

Recargar ofrece continuar el guardado local, sin progreso offline; ver OPENING_AND_SAVE.md. No añadir nuevos locales, recetas, más de dos hornillos, niveles individuales, personal adicional, tutoriales, objetivos finales, arte final, publicidad, sonido o publicación. Sin push. Detenerse para revisión manual.

## Economía física (2026-10-20)

La fase actual incorpora proveedor, deuda fija y bandeja. Inicio: 30 monedas disponibles, frigorífico vacío, efectivo pendiente 0 y deuda 0. Sustituye el suministro infinito de la base anterior. Las ventas ordinarias dejan su neto en la bandeja; el HUD solo incluye cartera. Encargos conservan el cobro en tablón, con devolución de deuda antes de abonar el neto. Suministros, devolución y recogida no aumentan demanda. Proveedor aplica la misma pausa y bloqueo de reapertura que oficina. Reglas completas, ubicaciones, ejemplo obligatorio y recorrido en [ECONOMY.md](ECONOMY.md). Pendiente de revisión manual.
