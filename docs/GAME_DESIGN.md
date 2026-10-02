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
- Tras completar una unidad o cliente, se reevalúa la acción y comienza otro ciclo completo de 1,5 s sin salir. Si no hay acción válida, espera con progreso cero y reanuda automáticamente cuando la haya. No conserva tiempo sobrante.
- El comando queda fijado al comenzar: acción, posición del hornillo, cliente, mesa y pedido no cambian durante la permanencia. Si pierde validez, se cancela todo su progreso y se reevalúa desde cero sin exigir movimiento.
- Toda transferencia vuelve a validar condiciones al ejecutarse.

## Producción e inventario

- Inventario simultáneo: hasta 4 ingredientes, 4 platos y 4 residuos, con límites independientes configurables. Platos sin asignar y vinculados comparten capacidad; cada plato pagado conserva su pedido.
- Frigorífico ilimitado: recoge un ingrediente por ciclo hasta llenar su categoría. Las demás categorías no lo bloquean.
- Cuatro posiciones de hornillo, cada una vacía/cocinando/lista. Cada ingrediente inicia 4 s de cocción en paralelo y cada ración lista sigue ocupando su posición hasta recogerla. En el mismo punto se prioriza recoger una lista si cabe un plato; si no puede recogerse, carga un ingrediente si hay posición vacía. Cada transferencia consume 1,5 s. Puede cargar incluso con platos llenos. Un ciclo ya iniciado conserva su posición y acción.
- Mostrador sin límite de stock, con disponibles y reservadas separados; reservar no retira el plato del mueble. La representación gráfica dibuja como máximo ocho platos.
- Depósito transfiere una ración sin asignar por ciclo hasta agotarlas; no convierte pedidos en stock y admite ingredientes/residuos transportados.
- Papelera exclusivamente para residuos: elimina uno por ciclo hasta agotarlos. Se retira el descarte anterior de alimentos; conserva ingredientes, platos libres y pedidos. Sin menús, cancelaciones ni reembolsos.

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
- **Caja**, delante: atiende una cabeza elegible por ciclo con cualquier inventario, incluso lleno. Sin stock o clientes espera sin acumular progreso y reanuda automáticamente.
- **Recoger pedidos**, a la derecha: transfiere un pedido pagado por ciclo, empezando por el más antiguo cuyo cliente esté sentado esperando, hasta llenar la capacidad compartida de platos.

Para llevar necesita una ración disponible sin reservar. Consume una ración y cobra 10 monedas; el cliente sale con su bolsa, sin pasar por el inventario del jugador.

Comer aquí necesita una ración disponible y una mesa sin cliente asignado, limpia o sucia. Reserva ambas y cobra 10 monedas en una operación. El cliente camina a su destino. Primero se valida la ruta física; si falla la operación, no se cobra ni se consume stock.

No se reserva una mesa dos veces ni se vende una ración reservada. Si todas las mesas están asignadas, la fila para llevar sigue funcionando. Recoger retira la ración reservada del mostrador y añade un plato identificado por su pedido al inventario.

## Mesas, servicio y limpieza

- Limpieza (limpia/sucia) y cliente asignado (ID/ninguno) son estados independientes.
- Una mesa por cliente. Al asignar se prioriza una limpia libre; si no hay, se permite una sucia libre.
- Si está sucia, el cliente espera en un punto lateral separado del punto de servicio. La mesa sigue reservada.
- Un único punto accesible por mesa sirve y limpia. Si está sucia y cabe un residuo, limpiar transfiere uno y conserva la asignación, aunque se lleven ingredientes o platos. El cliente recorre el tramo hasta el asiento. Si está limpia y el cliente espera sentado, se entrega su pedido si se transporta; en otros casos se espera. Tras limpiar se reevalúa automáticamente, sin salir.
- Si se limpia mientras el cliente aún camina, termina su ruta lateral y recorre el tramo al asiento.
- Solo se recoge o entrega un pedido cuando su cliente está sentado esperando en una mesa limpia.
- El plato solo se entrega a la mesa y cliente de su pedido. No se sustituye, copia ni entrega dos veces.
- Tras recibir el plato comienza a comer durante 6 s. Al terminar se levanta, deja residuos visibles, libera la asignación y camina a la salida. No se cobra otra vez.
- Los residuos usan su propia capacidad hasta llevarlos a la papelera; no bloquean producción, caja ni pedidos.

## Consistencia, interfaz y tiempo

Restaurant es el origen de clientes, filas, mesas, pedidos y dinero; su Production posee carga, cocina, disponibles y reservas físicas. Las vistas no mantienen copias de pedidos o existencias.

HUD: ingredientes n/4, platos n/4, residuos n/4, pedidos y sus mesas, posiciones cocinando/listas, disponibles/reservadas, dinero y longitud de filas. La carga se representa con una bandeja compacta; los platos asignados usan borde coral. Los clientes muestran intención/número y espera relevante; las mesas muestran limpieza/asignación. Los platos reservados usan un borde coral. Mensajes breves, sin ventanas bloqueantes ni escrituras DOM redundantes cada frame.

Todos los relojes se pausan con la pestaña oculta o sin foco, incluyendo llegadas y consumo. No hay progreso offline. El delta activo se limita a 100 ms; por debajo de 10 FPS el juego avanza más despacio.

El reinicio DEV limpia el restaurante completo, todos los inventarios y posiciones del hornillo, temporizadores, permanencia, selección, gráficos antiguos y posición. Los identificadores de cliente incluyen una generación para invalidar comandos de partidas anteriores.

## Parámetros provisionales y alcance futuro

Duraciones, capacidad, precio, proporciones, límites y velocidad son configurables en src/config.ts. Entrada, filas, espera, asientos, salida y puntos de acción están en src/world/layout.ts.

Pendiente, fuera del hito 3:
- Contratar un cocinero que recoge ingredientes, cocina y deposita raciones.
- Contratar un camarero que reparte platos y recoge residuos.
- El jugador puede seguir realizando todas las tareas; no hay reasignación dinámica entre profesiones.
- Comprar algunas mesas y mejoras, balancear costes/salarios y guardar progresión local.
- Mejorar arte, sonido, rendimiento y experiencia en dispositivos físicos.

Detener el desarrollo tras el hito 3 para revisión del usuario. No implementar empleados, mejoras, nuevas recetas, tutoriales guiados o persistencia sin un encargo nuevo.
