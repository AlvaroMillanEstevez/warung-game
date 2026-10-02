# Warung Kita — diseño acordado

## Idea y dirección

Juego de gestión de un pequeño warung indonesio para navegador, ordenador y móvil. Un local y una receta inicial: nasi goreng. Vista 2D cenital inclinada, caras superiores/frontales y sombras sencillas. La profundidad depende de los pies; las colisiones usan huellas del suelo.

Phaser 4.2.1, TypeScript estricto, Vite y npm con lockfile. Sin frameworks de interfaz, backend, servicios externos, assets descargados ni APIs de IA durante partidas.

Los hitos 1 y 2 están revisados manualmente y aprobados por el usuario. El hito 3 incorpora clientes, ventas, servicio y limpieza en un único circuito manual.

## Movimiento, pantalla y permanencia

- WASD/flechas y arrastre relativo desde el contacto inicial, con diagonales normalizadas.
- Un solo puntero controla; los demás no heredan el control. Soltar o volver al origen detiene. Zona muerta, recorrido y tolerancia configurables.
- La interfaz no inicia movimiento. Captura del puntero y cancelación al perder foco, ocultar, cancelar gesto o redimensionar.
- Viewport dinámico completo, sin scroll ni Fullscreen API; HUD dentro de márgenes seguros.
- Cámara con zoom uniforme, seguimiento suave y límites del mundo. En móvil muestra una parte del local sin redistribuir muebles.
- Quedarse quieto 1,5 s activa una acción válida en el punto accesible más cercano. Se exige distancia y línea libre de muebles.
- Intentar moverse, incluso contra un mueble o con teclas opuestas, cancela el progreso.
- Tras completar, hay que abandonar físicamente el radio antes de repetir. Foco y cambios de selección no eliminan ese bloqueo.
- El comando queda fijado al comenzar: cliente, mesa y pedido no cambian silenciosamente durante la permanencia. Si pierde validez, se cancela el progreso y se conserva la selección hasta moverse o salir.
- Toda transferencia vuelve a validar condiciones al ejecutarse.

## Producción e inventario

- Una unidad transportada: ingredientes, ración sin asignar, plato vinculado a un pedido o residuos.
- Frigorífico ilimitado, únicamente con manos vacías.
- Hornillo vacío/cocinando/listo. Transferir ingredientes inicia 4 s de cocción; recoger requiere una nueva permanencia con manos vacías.
- Mostrador de 5 raciones físicas. Disponibles y reservadas suman para la capacidad; reservar no retira el plato del mueble.
- Depósito solo acepta una ración sin asignar. Llenar el mostrador ya no termina ni anuncia la finalización de la prueba.
- Papelera acepta ingredientes, raciones sin asignar y residuos. Rechaza pedidos pagados: deben entregarse. Sin cancelaciones ni reembolsos.

## Clientes y filas

- Llegada cada 8 s, probabilidad inicial 50 % de comer aquí / 50 % de llevar. Intención fija y etiqueta visible desde que aparece.
- Máximo 10 clientes simultáneos, incluyendo quienes entran o salen. Hasta 3 plazas por fila, con posiciones explícitas distintas.
- Si se llena la fila elegida o el límite global, se omite la llegada; no se desvía a otra fila ni acumula deuda.
- Sin impaciencia, abandonos o penalizaciones.
- Cada cliente recorre entrada → su fila → mesa/salida. Los clientes pueden cruzarse al caminar y no bloquean al jugador.
- Un grafo pequeño de visibilidad rodea las huellas infladas de los mismos muebles usados por la colisión del jugador. No hay teletransporte entre fases.
- La entrada y salida están en el umbral del local. La desaparición ocurre al llegar físicamente a la salida.
- Estados explícitos: entrando, caminando a fila, en fila, caminando a mesa, esperando limpieza, caminando al asiento, esperando comida, comiendo y saliendo.
- El tiempo de espera comienza al alcanzar una plaza de la fila y se conserva al avanzar.
- Solo se atienden las cabezas que ya han llegado a su plaza. Entre las elegibles, se elige la de mayor espera; un empate usa el número de llegada. Nadie adelanta dentro de su propia fila.

## Mostrador y ventas

El mueble original conserva su huella. Tres puntos separados sin solapamiento de radios:

- **Depositar**, a la izquierda: deja producción.
- **Caja**, delante: con manos vacías, atiende la cabeza elegible.
- **Recoger pedidos**, a la derecha: con manos vacías, transfiere el pedido pagado más antiguo cuyo cliente esté sentado esperando.

Para llevar necesita una ración disponible sin reservar. Consume una ración y cobra 10 monedas; el cliente sale con su bolsa, sin ocupar las manos del jugador.

Comer aquí necesita una ración disponible y una mesa sin cliente asignado, limpia o sucia. Reserva ambas y cobra 10 monedas en una operación. El cliente camina a su destino. Primero se valida la ruta física; si falla la operación, no se cobra ni se consume stock.

No se reserva una mesa dos veces ni se vende una ración reservada. Si todas las mesas están asignadas, la fila para llevar sigue funcionando. Recoger libera espacio físico del mostrador y vincula el plato transportado al pedido.

## Mesas, servicio y limpieza

- Limpieza (limpia/sucia) y cliente asignado (ID/ninguno) son estados independientes.
- Una mesa por cliente. Al asignar se prioriza una limpia libre; si no hay, se permite una sucia libre.
- Si está sucia, el cliente espera en un punto lateral separado del punto de servicio. La mesa sigue reservada.
- Limpiar con manos vacías transfiere una unidad de residuos al jugador y deja la mesa limpia conservando la asignación. El cliente recorre el tramo hasta el asiento.
- Si se limpia mientras el cliente aún camina, termina su ruta lateral y recorre el tramo al asiento.
- Solo se recoge o entrega un pedido cuando su cliente está sentado esperando en una mesa limpia.
- El plato solo se entrega a la mesa y cliente de su pedido. No se sustituye, copia ni entrega dos veces.
- Tras recibir el plato comienza a comer durante 6 s. Al terminar se levanta, deja residuos visibles, libera la asignación y camina a la salida. No se cobra otra vez.
- Los residuos ocupan las manos hasta llevarlos a la papelera.

## Consistencia, interfaz y tiempo

Restaurant es el origen de clientes, filas, mesas, pedidos y dinero; su Production posee carga, cocina, disponibles y reservas físicas. Las vistas no mantienen copias de pedidos o existencias.

HUD: carga, hornillo, disponibles/reservadas, dinero y longitud de filas. Los clientes muestran intención/número y espera relevante; las mesas muestran limpieza/asignación. Los platos reservados usan un borde coral. Mensajes breves, sin ventanas bloqueantes ni escrituras DOM redundantes cada frame.

Todos los relojes se pausan con la pestaña oculta o sin foco, incluyendo llegadas y consumo. No hay progreso offline. El delta activo se limita a 100 ms; por debajo de 10 FPS el juego avanza más despacio.

El reinicio DEV limpia el restaurante completo, temporizadores, permanencia, selección, gráficos antiguos y posición. Los identificadores de cliente incluyen una generación para invalidar comandos de partidas anteriores.

## Parámetros provisionales y alcance futuro

Duraciones, capacidad, precio, proporciones, límites y velocidad son configurables en src/config.ts. Entrada, filas, espera, asientos, salida y puntos de acción están en src/world/layout.ts.

Pendiente, fuera del hito 3:
- Contratar un cocinero que recoge ingredientes, cocina y deposita raciones.
- Contratar un camarero que reparte platos y recoge residuos.
- El jugador puede seguir realizando todas las tareas; no hay reasignación dinámica entre profesiones.
- Comprar algunas mesas y mejoras, balancear costes/salarios y guardar progresión local.
- Mejorar arte, sonido, rendimiento y experiencia en dispositivos físicos.

Detener el desarrollo tras el hito 3 para revisión del usuario. No implementar empleados, mejoras, nuevas recetas, tutoriales guiados o persistencia sin un encargo nuevo.
