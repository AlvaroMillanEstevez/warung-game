# Warung Kita — diseño acordado

## Alcance y estructura

Juego de gestión de un warung indonesio para navegador, ordenador y móvil. Un local y una receta: nasi goreng. Phaser 4.2.1, TypeScript estricto, Vite y npm con lockfile. Sin frameworks de interfaz, backend, servicios externos o assets descargados.

Los hitos 1–3 están aprobados manualmente, incluidos el control táctil y la cámara centrada. El encargo actual autoriza el hito 4: personal y primeras mejoras. Detenerse después de implementarlo y verificarlo para nueva revisión manual.

Gráficos provisionales con Phaser, vista cenital inclinada y profundidad por los pies. Las huellas físicas de los muebles y la distribución funcional se conservan. Reglas independientes de Phaser/DOM.

## Movimiento, cámara y exterior

- WASD/flechas con diagonales normalizadas. El jugador no tiene inercia.
- Arrastre relativo: contacto en una zona libre del lienzo fija el origen hasta soltar. Origen y desplazamiento usan clientX/clientY en píxeles CSS de pantalla; la cámara no interviene.
- Un único puntero. Un segundo dedo no controla ni hereda el gesto. Volver a la zona muerta, soltar o cancelar detiene inmediatamente. Foco, pestaña oculta y redimensionado cancelan controles y permanencia.
- Respuesta progresiva: fracción del recorrido útil elevada a 1,25, limitada a 1. Zona muerta de 12 px y velocidad máxima a 76 px. Parámetros en src/config.ts. No se acumulan desplazamientos entre eventos.
- El usuario ha probado y aprobado estos controles. Las nuevas verificaciones emuladas no sustituyen la prueba de cada dispositivo físico.
- Cámara con seguimiento directo (factor 1), sin retraso ni límites que detengan su seguimiento. Centra el cuerpo del jugador con un desplazamiento vertical constante de 24 unidades respecto a sus pies.
- Zoom uniforme y legible, calculado con tamaño de referencia 788 × 554 y mínimo 1,15. HUD, mensajes y control relativo siguen anclados a pantalla.
- ROOM define exclusivamente el suelo transitable. WORLD identifica el dibujo base del local; no limita la cámara. Los muebles mantienen colisiones e interacciones en coordenadas de mundo.
- El exterior decorativo se recalcula al redimensionar: cubre todas las vistas centradas posibles dentro de ROOM más media anchura/altura visible de cámara y margen de seguridad. Suelo, acera, calle y árboles geométricos ligeros. No es transitable.
- Viewport dinámico completo sin scroll ni Fullscreen API, con márgenes seguros.

## Permanencia y producción

- Una sola interacción activa del jugador. Quietud inicial de 1,5 s en el punto accesible más cercano, con distancia y línea de visión válidas.
- Cada ciclo transfiere una unidad o atiende un cliente. Reevalúa y comienza otro ciclo completo sin salir. Sin acción válida espera con progreso cero.
- Intentar moverse, incluso contra un mueble o con teclas opuestas, cancela. Cambiar objetivo o perder validez cancela todo el progreso.
- Acción, posición de cocina, cliente y mesa quedan fijados durante cada ciclo y se revalidan al ejecutar. No se conserva tiempo sobrante.
- Inventario simultáneo inicial: 8 ingredientes, 8 platos y 8 residuos. Transporte mejora las tres capacidades a 12 y después a 16, conservando límites independientes.
- Todos los platos del jugador son producción para depositar; no hay platos vinculados ni acciones de recoger/servir pedidos.
- Frigorífico ilimitado, una unidad por ciclo hasta llenar ingredientes.
- Cuatro posiciones de hornillo: vacía/cocinando/lista. Cada ingrediente tarda inicialmente 4 s en paralelo; las mejoras reducen las nuevas cocciones a 3 y 2 s. Cada posición captura su duración al iniciarse. Una lista ocupa posición hasta recogerla.
- En hornillo se prioriza recoger una lista si cabe un plato; si no, cargar un ingrediente en una posición vacía. Cada transferencia tiene su propio ciclo. Cargar admite inventario de platos lleno.
- Mostrador sin límite, únicamente stock disponible. Depósito de un plato por ciclo hasta vaciar platos transportados.
- Papelera solo elimina residuos, uno por ciclo. Nunca descarta ingredientes ni platos.

## Feedback de carga

Las tres categorías se representan con pilas de hasta cuatro objetos, aunque transporten más. El HUD conserva cantidades y límites exactos n/8, n/12 o n/16. Los empleados muestran su propia carga n/4.

Un indicador breve identifica categoría y +1 o −1 en cada recogida o descarga del jugador, incluyendo cargas al hornillo y residuos a papelera. Se coloca al lado del cuerpo, por encima de los puntos del suelo, dura 650 ms y se mueve 14 unidades. Es un único texto reutilizado, con reloj activo y reinicio, sin partículas ni objetos acumulados.

## Clientes, filas y autoservicio

- Llegadas cada 8 s, 50 % comer aquí / 50 % llevar, intención fija. Máximo 10 clientes y tres plazas por fila. Una llegada sin plaza se omite sin deuda ni desvío.
- Sin impaciencia ni penalizaciones. Las cabezas deben llegar a su plaza; se elige la elegible con mayor espera, con desempate por número de llegada. Sin adelantamientos en la misma fila.
- Dos puntos de mostrador: Depositar a la izquierda y Caja delante. Se elimina el punto de recogida de pedidos.
- Caja admite cualquier carga del jugador. Un cliente por ciclo, con reanudación automática cuando vuelve a haber stock y cliente elegible.
- Para llevar consume una ración y cobra 10 monedas una vez. El cliente sale con su bolsa; no entra comida en inventario del jugador.
- Comer aquí requiere una ración y mesa sin asignar. Prioriza limpia, permite sucia. Antes de transferir se comprueba ruta; reserva la mesa, descuenta una ración, cobra 10 y entrega el plato al cliente en una operación.
- No quedan raciones pagadas reservadas en el mostrador. El pedido identifica cliente, mesa y fase de esa única ración: transportada, comiendo o consumida. Se elimina al salir el cliente.
- Si la mesa está limpia, camina directamente al asiento con su plato y empieza a comer al llegar.
- Si está sucia, camina a una posición lateral junto a caja y espera llevando su plato. No se acerca a la mesa. CLEANING_WAIT_POINTS asigna un punto distinto por mesa, separado de ambas filas y del acceso de caja.
- La mesa permanece reservada. Una fila bloqueada por mesas no bloquea ventas para llevar.
- Al limpiar, solo el cliente asignado abandona la espera y camina al asiento; si aún caminaba a la espera, se redirige desde su posición actual, sin teletransporte.
- Todos los recorridos rodean las huellas infladas de los muebles. Personajes pueden cruzarse y no bloquean físicamente al jugador.
- Estados: entrando, caminando a fila, en fila, caminando a espera de limpieza, esperando limpieza, caminando a mesa, comiendo y saliendo.

## Mesas y limpieza

Limpieza (limpia/sucia) y asignación (cliente/ninguno) son independientes. Cada mesa conserva un único punto accesible, ahora exclusivo para limpiar.

Una mesa sucia transfiere una unidad de residuos si queda capacidad. Ingredientes y platos no bloquean limpiar. Limpiar conserva la reserva y activa el recorrido del cliente correspondiente.

El cliente come durante 6 s desde que llega al asiento. Al levantarse deja suciedad, libera la mesa y camina a la salida; no se cobra de nuevo. Los residuos usan su propia capacidad hasta llevarlos a papelera.

## Tiempo, consistencia e interfaz

Restaurant posee clientes, filas, mesas, trazabilidad, dinero, compras y reservas de acciones. Production posee el inventario del jugador, las posiciones del hornillo y el stock disponible. Staff mantiene dos profesiones fijas, sus rutas y tareas; cada empleado posee su Inventory independiente. Las transferencias de Production y la limpieza de Restaurant reciben el inventario del actor. Las vistas representan esos datos.

HUD: ingredientes, platos, residuos, posiciones cocinando/listas, stock disponible, dinero y filas. Clientes muestran intención, número y espera; transportan visualmente el plato hasta sentarse. Mesas indican limpieza y reserva. Se eliminan indicadores de stock reservado y reparto.

Todos los relojes usan tiempo activo y se pausan sin foco/con pestaña oculta o con el panel de mejoras abierto; sin progreso offline. Delta limitado a 100 ms: por debajo de 10 FPS la simulación avanza más despacio.

El reinicio DEV elimina empleados, tareas y reservas de recursos; cierra el panel y cancela entradas. Restablece mejoras, capacidades 8/8/8, acciones 1,5 s, hornillo 4 s y las dos mesas iniciales. Elimina clientes y sus platos, esperas, pedidos, suciedad, stock, inventarios, dinero, selección, permanencia, feedback y temporizadores. Restablece posición y cámara; IDs de nueva generación invalidan referencias a clientes anteriores.

## Personal y cooperación

Un cocinero y una persona de limpieza como máximo. Se contratan desde Mejoras; aparecen en puntos libres predefinidos y se desplazan a 110 unidades/s. Inventario propio de cuatro unidades por categoría útil, sin heredar transporte del jugador. Cada transferencia requiere 1,5 s junto al destino. No cobran, sirven ni cambian de profesión.

El cocinero prioriza depositar si lleva cuatro platos, recoger raciones listas accesibles y depositar el lote parcial si no queda ninguna lista que pueda recoger. Después, si hace falta stock, recoge un lote de ingredientes ajustado a capacidad, posiciones disponibles y demanda hasta el objetivo; carga posiciones libres. Mientras se cocina espera en el hornillo sin cambiar continuamente de destino. Objetivo configurable: 12 raciones disponibles. Al alcanzarlo cancela nuevas cargas/recogidas de ingredientes, termina las cocciones iniciadas y deposita los platos transportados o listos. Puede superar 12 al acabar trabajo iniciado; el jugador puede depositar sin límite. Si baja el stock, vuelve a producir. Ingredientes crudos sobrantes se conservan para la siguiente demanda.

Limpieza prioriza mesas sucias reservadas, por la antigüedad del pago del cliente que espera; después, mesas sin reserva por antigüedad de suciedad. Vacía en papelera cuando llega a cuatro residuos o no quedan mesas sucias que pueda atender, aunque lleve menos. Sin trabajo vuelve a su punto de espera, fuera del radio de interacción. Una tarea iniciada conserva su objetivo hasta completarse o invalidarse.

La reserva de trabajo bloquea solo una posición del hornillo (vacía o con ración lista) o los residuos de una mesa. No bloquea el hornillo completo, la asignación de mesa ni otras categorías de inventario. Jugador y empleados usan las mismas validaciones y transferencias atómicas. Se valida al iniciar y completar; cancelar, invalidar, no encontrar ruta o reiniciar libera la reserva. El jugador puede ayudar en otra posición o mesa. Las reservas de limpieza conservan la asignación del cliente.

Las rutas de empleados y clientes usan las mismas huellas de muebles. Los personajes se cruzan sin colisión rígida. El movimiento, las tareas y los tiempos del personal solo consumen tiempo activo.

## Panel, compras y mesas adicionales

El botón Mejoras abre un diálogo dentro del juego. Cada opción muestra efecto, nivel, precio siguiente y estado de fondos/máximo. Abrir cancela teclas, arrastre y permanencia, libera la reserva del jugador y pausa toda la simulación. Los empleados conservan sus tareas congeladas. Cerrar descarta el delta anterior y exige una nueva entrada de movimiento. Una acción válida puede iniciar una permanencia nueva desde cero.

Compras síncronas con saldo suficiente y nivel esperado: validación, descuento único y aplicación del efecto. Un evento antiguo no compra un nivel posterior. La interfaz filtra doble clic y repeticiones inmediatas. No hay punto de compra en el mapa ni botón para añadir dinero.

| Opción | Efecto | Precio |
| --- | --- | --- |
| Cocinero | Un empleado de producción, carga 4 | 100 |
| Limpieza | Una persona, residuos 4 | 80 |
| Transporte | 8 → 12 → 16 por categoría del jugador | 60 / 120 |
| Rapidez del jugador | 1,5 → 1,2 → 0,9 s por ciclo nuevo | 80 / 160 |
| Velocidad del hornillo | 4 → 3 → 2 s por cocción nueva | 100 / 200 |
| Mesa 3 | Una plaza adicional | 80 |
| Mesa 4 | Una plaza adicional | 140 |

Precios y efectos provisionales centralizados en src/config.ts. Venta 10 monedas, saldo inicial 0; demanda sin cambios: 8 s, 50 %, tres por fila y diez clientes máximos. No se ajusta automáticamente al comprar.

Las mesas adicionales tienen huellas y puntos definidos en src/world/layout.ts. La mesa 3 queda a la izquierda; la 4 entre las mesas iniciales. Antes de comprarse no tienen mueble, silla, colisión, reserva ni interacción utilizables. Cada una añade asiento y espera junto a caja. La compra verifica que ningún actor quede sobre la huella ampliada y que destinos/rutas sigan accesibles; si el espacio está ocupado no cobra y pide salir del panel para dejarlo libre. Al comprar recalcula las rutas actuales desde sus posiciones, sin teleportar.

Se ocultan los círculos técnicos de filas y espera, conservando sus datos y los puntos de interacción del jugador. DEBUG.customerMarkers permite mostrar las guías para desarrollo y viene desactivado. Las sillas son decoración de cada mesa activa.

## Alcance posterior

No hay persistencia: recargar vuelve al estado inicial. No añadir recetas, hornillos adicionales, niveles del personal, empleado de caja, tutoriales, arte final, publicidad, sonido o publicación en este hito. No hacer push. Esperar revisión manual antes de otro hito.
