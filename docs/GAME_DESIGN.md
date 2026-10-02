# Warung Kita — diseño acordado

## Alcance y estructura

Juego de gestión de un warung indonesio para navegador, ordenador y móvil. Un local y una receta: nasi goreng. Phaser 4.2.1, TypeScript estricto, Vite y npm con lockfile. Sin frameworks de interfaz, backend, servicios externos o assets descargados.

Los hitos 1 y 2 están aprobados. La revisión anterior del hito 3 también funciona correctamente según el usuario. Esta revisión introduce autoservicio, feedback de cantidades y cambios de movimiento/cámara. Detenerse después para nueva prueba manual.

Gráficos provisionales con Phaser, vista cenital inclinada y profundidad por los pies. Las huellas físicas de los muebles y la distribución funcional se conservan. Reglas independientes de Phaser/DOM.

## Movimiento, cámara y exterior

- WASD/flechas con diagonales normalizadas. El jugador no tiene inercia.
- Arrastre relativo: contacto en una zona libre del lienzo fija el origen hasta soltar. Origen y desplazamiento usan clientX/clientY en píxeles CSS de pantalla; la cámara no interviene.
- Un único puntero. Un segundo dedo no controla ni hereda el gesto. Volver a la zona muerta, soltar o cancelar detiene inmediatamente. Foco, pestaña oculta y redimensionado cancelan controles y permanencia.
- Respuesta progresiva: fracción del recorrido útil elevada a 1,25, limitada a 1. Zona muerta de 12 px y velocidad máxima a 76 px. Parámetros en src/config.ts. No se acumulan desplazamientos entre eventos.
- Se sustituyen los 10/58 px y el pequeño umbral adicional anteriores por una zona muerta explícita y recorrido más amplio. Son parámetros iniciales para probar; no se afirma que las sensaciones estén resueltas.
- Cámara con seguimiento directo (factor 1), sin retraso ni límites que detengan su seguimiento. Centra el cuerpo del jugador con un desplazamiento vertical constante de 24 unidades respecto a sus pies.
- Zoom uniforme y legible, calculado con tamaño de referencia 788 × 554 y mínimo 1,15. HUD, mensajes y control relativo siguen anclados a pantalla.
- ROOM define exclusivamente el suelo transitable. WORLD identifica el dibujo base del local; no limita la cámara. Los muebles mantienen colisiones e interacciones en coordenadas de mundo.
- El exterior decorativo se recalcula al redimensionar: cubre todas las vistas centradas posibles dentro de ROOM más media anchura/altura visible de cámara y margen de seguridad. Suelo, acera, calle y árboles geométricos ligeros. No es transitable.
- Viewport dinámico completo sin scroll ni Fullscreen API, con márgenes seguros.

## Permanencia y producción

- Una sola interacción activa. Quietud de 1,5 s en el punto accesible más cercano, con distancia y línea de visión válidas.
- Cada ciclo transfiere una unidad o atiende un cliente. Reevalúa y comienza otro ciclo completo sin salir. Sin acción válida espera con progreso cero.
- Intentar moverse, incluso contra un mueble o con teclas opuestas, cancela. Cambiar objetivo o perder validez cancela todo el progreso.
- Acción, posición de cocina, cliente y mesa quedan fijados durante cada ciclo y se revalidan al ejecutar. No se conserva tiempo sobrante.
- Inventario simultáneo: 4 ingredientes, 4 platos y 4 residuos, con límites independientes configurables.
- Todos los platos del jugador son producción para depositar; no hay platos vinculados ni acciones de recoger/servir pedidos.
- Frigorífico ilimitado, una unidad por ciclo hasta llenar ingredientes.
- Cuatro posiciones de hornillo: vacía/cocinando/lista. Cada ingrediente tarda 4 s en paralelo. Una lista ocupa posición hasta recogerla.
- En hornillo se prioriza recoger una lista si cabe un plato; si no, cargar un ingrediente en una posición vacía. Cada transferencia tiene su propio ciclo. Cargar admite inventario de platos lleno.
- Mostrador sin límite, únicamente stock disponible. Depósito de un plato por ciclo hasta vaciar platos transportados.
- Papelera solo elimina residuos, uno por ciclo. Nunca descarta ingredientes ni platos.

## Feedback de carga

Ingredientes y residuos muestran una pila distinta para cada cantidad de 1 a 4; platos conservan su apilado. El HUD mantiene los tres contadores n/4.

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

Restaurant posee clientes, filas, mesas, trazabilidad de raciones y dinero. Production posee inventario del jugador, posiciones de hornillo y stock disponible. Las vistas representan esos datos.

HUD: ingredientes, platos, residuos, posiciones cocinando/listas, stock disponible, dinero y filas. Clientes muestran intención, número y espera; transportan visualmente el plato hasta sentarse. Mesas indican limpieza y reserva. Se eliminan indicadores de stock reservado y reparto.

Todos los relojes usan tiempo activo y se pausan sin foco/con pestaña oculta; sin progreso offline. Delta limitado a 100 ms: por debajo de 10 FPS la simulación avanza más despacio.

El reinicio DEV elimina clientes y sus platos, esperas junto a caja, pedidos, reservas, suciedad, stock, inventarios, hornillos, dinero, controles, selección, permanencia, feedback y temporizadores. Restablece posición y cámara; IDs de nueva generación invalidan comandos anteriores.

## Futuro fuera de este encargo

- Cocinero: recoger ingredientes, cocinar y depositar.
- Camarero: limpieza y residuos. El reparto queda fuera del diseño actual de autoservicio.
- El jugador puede seguir realizando todas las tareas; sin reasignación dinámica de profesiones.
- Mejoras, mesas adicionales, costes, persistencia, arte y sonido quedan para hitos autorizados posteriores.

No implementar empleados, mejoras, nuevas recetas, tutoriales o guardado en esta revisión. No publicar ni hacer push.
