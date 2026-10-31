# Warung Kita

**Inicio actual: local deteriorado → reforma → instalaciones → primera venta → guardado local.** Empiezas con 150 monedas y el negocio cerrado. Sigue el objetivo contextual; abre explícitamente tras depositar comida. Partida y ajustes permite continuar, cambiar idioma o confirmar una nueva partida. Guía completa y límites del guardado en [OPENING_AND_SAVE.md](docs/OPENING_AND_SAVE.md).

**Continuación normal:** tras recoger la primera venta, construir oficina (50), ampliar de cero a seis mesas, contratar y construir zona de encargos (50). Primera mesa + papelera 40; siguientes 60/80/140/220/320. Guardados anteriores continúan con migración automática v1→v2. [Precios, requisitos y recorrido manual](docs/PROGRESSION.md). El escenario DEV sigue separado: `?escenario=avanzado&monedas=2000`.


Prototipo de gestión de un warung para navegador. Hitos 1–4, revisión de experiencia y cierre del primer local aprobados manualmente. Oficina, cámara, demanda y segundo cocinero también aprobados manualmente. **Base, visuales e idiomas aprobados. La base funciona; economía física y apertura con guardado aprobadas manualmente. Progresión normal implementada, pendiente de revisión.**

## Ejecutar desde WSL

```bash
cd /home/koke/projects/warungGame
npm run dev
```

Abre [el juego local](http://127.0.0.1:5173/) en Windows. Node >=22.18, npm >=10; Phaser 4.2.1, TypeScript estricto y Vite. Sin dependencias nuevas; npm ci reinstala desde package-lock.json.

- npm test: reglas, transferencias, navegación, controles y localización con node:test.
- npm run typecheck: tipos.
- npm run build: tipos y compilación de producción.
- npm run preview: versión compilada en el puerto 4173.

Para probar compras: [600 monedas](http://localhost:5173/?monedas=600) o [500 monedas](http://localhost:5173/?monedas=500). Solo funciona en desarrollo y localhost (también 127.0.0.1/::1). No desbloquea nada ni suma gasto; DEV restaura ese saldo. Sin parámetro se inicia/continúa la partida normal; una nueva empieza con 150. La build de producción ignora el parámetro DEV.

Para probar el equipo avanzado puedes usar [2000 monedas](http://127.0.0.1:5173/?monedas=2000). Cuatro mesas, dos hornillos, dos cocineros, limpieza y ambas mejoras de rapidez/cocción cuestan 1340 (1490 con cajero).

En WSL, Vite vigila los archivos mediante sondeo para detectar también las ediciones desde Windows y actualizar los módulos traducidos. Recargar ofrece continuar la instantánea local, sin progreso offline.

Vite escucha en todas las interfaces en el puerto fijo 5173. Acceder desde un teléfono físico puede requerir configuración LAN/WSL/firewall; el proyecto no cambia esa configuración.

## Primera renovación visual

Restaurante de juguete en 2D: crema, madera cálida y verde jade, volúmenes redondeados y sombras suaves. Cocina y comedor usan materiales distintos. Personajes con ropa propia de cada rol, variantes de clientes y marcha discreta. La carga mantiene cantidades exactas y formas distintas; estados de cocina/listo/suciedad usan símbolos además de color.

La alfombra Selamat datang está en el acceso real de clientes. El rótulo de la pared tiene una placa donde caben sus dos líneas. El panel distingue compras disponibles, saldo insuficiente, requisitos y máximos, con cierre fijo al desplazar la lista.

Todo se dibuja por código, sin assets externos ni dependencias nuevas. Tema en src/visuals/theme.ts; detalles en [VISUAL_DESIGN.md](docs/VISUAL_DESIGN.md). Reglas, economía, inventarios, tareas, movimiento, puntos y zoom conservados.

## Idiomas

En la oficina, el selector **Español / English / Bahasa Indonesia** cambia todos los textos en caliente sin reiniciar la partida. Solo recuerda esa elección en localStorage (warung-kita.language); si está bloqueado, funciona durante la sesión. El guardado de partida es independiente del idioma.

Al iniciar: elección guardada válida, luego idiomas del navegador en orden (es-ES, en-US, id-ID y otras variantes), y finalmente inglés. No se utiliza ubicación ni zona horaria. Números con formato del idioma elegido.

Catálogos revisables: [español](src/i18n/catalogs/es.ts), [inglés](src/i18n/catalogs/en.ts) e **[indonesio](src/i18n/catalogs/id.ts)**. Conservan las mismas 276 claves y parámetros. Para revisión con una hablante nativa, cambiar solo los valores de id.ts y mantener claves y marcadores entre llaves. Guía en [LOCALIZATION.md](docs/LOCALIZATION.md).

Panel, estados de compra, requisitos, efectos, confirmaciones, avisos, comentarios, rótulos funcionales, filas, nombres de profesiones, feedback de carga, dinero y accesibilidad están localizados. Warung Kita, nasi goreng y la alfombra cultural Selamat datang se conservan. Datos/identificadores internos de DEV y errores de programación de consola siguen siendo diagnósticos técnicos; sus botones y título sí se traducen.

## Jugar

WASD/flechas o arrastre relativo desde una zona libre del lienzo. Diagonales normalizadas, origen fijo en píxeles CSS y sin inercia. Soltar, cancelar, perder foco u orientar/redimensionar elimina entradas. Cámara centrada directamente en el jugador, ahora con **zoom ×0,85** respecto al encuadre anterior: 15 % más alejado, sin modificar mundo, velocidades, colisiones o radios. El dinero y los paneles conservan tamaño de pantalla.

Permanece quieto en un punto de acción. Cada ciclo transfiere una unidad o atiende a un cliente; si hay trabajo empieza otro ciclo completo. Intentar moverse cancela aunque no puedas desplazarte. Sin acción válida no se acumula progreso.

**Proveedor → frigorífico → hornillo → Depositar → Caja → recoger dinero → reponer.** Cada hornillo tiene cuatro posiciones independientes. Recoge ingredientes, carga, espera cocción, recoge platos y deposítalos en el mostrador. Frigorífico con stock real comprado al proveedor; mostrador sin límite e inventarios independientes de ingredientes, platos y residuos.

**Caja está detrás del mostrador**, arriba a la derecha: accede desde cocina por su pasillo izquierdo y gira a la derecha por detrás. Depositar está en el lateral izquierdo y tiene un punto distinto. No puedes cobrar desde el lado público ni desde laterales fuera de la zona trasera. Caja admite cualquier carga.

Una venta cobra 10 y entrega directamente una ración. Comer dentro reserva mesa, priorizando limpia. Si está sucia, el cliente espera con su plato junto a caja; limpiar conserva la reserva y lo envía al asiento. Solo come al llegar. Para llevar recibe comida y sale. La zona de mesa solo limpia; la papelera retira un residuo por ciclo.

## Oficina y compras

Tras recoger la primera venta, construye la **Oficina** por 50 monedas en su punto físico de la pared izquierda. Su alfombra interior tiene el indicador de interacción. Permanece 1,5 s allí para abrir Mejoras; no hay mueble que bloquee el paso ni otra habitación. El panel pausa todo y cancela entradas. Tras cerrarlo debes salir de la zona y volver para reabrir.

| Compra | Efecto | Precio |
| --- | --- | --- |
| Contratar cocinero | Máximo dos; segundo requiere primero y segundo hornillo operativo | 100 / 220 |
| Limpieza | Una persona; requiere primera mesa y papelera | 80 |
| Cajero | Uno; requiere primer cocinero; comparte caja con el jugador | 150 |
| Rapidez del equipo | 0,8 → 0,6 → 0,4 s por acción | 80 / 160 |
| Cocina más rápida | Nuevas cocciones: 4 → 3 → 2 s en ambos hornillos | 100 / 200 |
| Añadir mesa | Normal: 0 → 6; primera incluye papelera | 40 / 60 / 80 / 140 / 220 / 320 |
| Añadir hornillo | Una compra: 1 → 2, cuatro posiciones cada uno | 180 |

La capacidad es 8 para jugador y empleados actuales/futuros; su mejora está deshabilitada y no aparece en oficina. La rapidez sigue siendo global. Cada cocinero lleva ingredientes/platos; limpieza solo residuos. Las categorías no comparten espacio. Acciones y cocciones iniciadas conservan su duración; las siguientes usan la mejora. Rapidez no cambia desplazamiento ni consumo.

Una tarjeta de cocineros muestra requisito y precio siguiente; con dos muestra **Equipo completo**. Mesas: **Espacio completo** a seis. Hornillos: **Máximo alcanzado** a dos. Las compras revalidan saldo y nivel para cobrar una vez. Si un actor ocupa una huella futura se rechaza sin cobrar: cierra, despeja el espacio y vuelve. No quedan compras pendientes. Las rutas se recalculan desde posiciones actuales.

Mesas en dos columnas y tres filas, sin números en el escenario ni panel normal. Identificadores técnicos solo en DEV.

## Cooperación

Con un cocinero, puede usar ambos hornillos. Con dos, **Cocinero 1** (delantal amarillo) usa el inicial y **Cocinero 2** (delantal coral) el adicional. Comparten frigorífico y depósito, con carga y tareas propias. No cambian de hornillo para ayudarse. El jugador puede trabajar en cualquier posición libre de cualquiera.

El objetivo **conjunto de 12 raciones** cuenta stock del mostrador, platos transportados por cocineros, raciones cocinando/listas de ambos hornillos y reservas de cargas automáticas pendientes. No cuenta ingredientes ni duplica raciones. Reservar capacidad al comenzar el viaje evita que ambos reclamen la última unidad. Cancelar o invalidar libera capacidad y posición.

Los cocineros buscan tandas de cuatro platos. Esperan las cocciones propias antes de salir con menos, aprovechan los ingredientes transportados y, al llegar al mostrador, descargan toda la tanda. Pueden entregar menos de cuatro si no queda cocción/carga posible, para no retener comida ni superar el objetivo.

Al alcanzar el objetivo dejan de iniciar cocciones, pero recogen y depositan las ya producidas, incluidos lotes parciales. Reanudan tras ventas o retiradas de stock y conservan ingredientes sobrantes. La producción manual no tiene este límite y puede superar 12.

Limpieza prioriza reservas antiguas y después suciedad antigua. Vacía residuos cuando se llena o no queda tarea, aunque lleve uno. El cajero cobra desde su puesto trasero; jugador y cajero comparten una única operación. Quien la inicia puede terminarla y cada cliente paga/recibe una vez. Ningún empleado reparte.

## Encargos voluntarios

El tablón de **Encargos** está en la pared izquierda justo debajo de **Oficina**, con hojas y caja. En normal, contratar al primer cocinero habilita su construcción conjunta con empaquetado por 50. Tras construir aparece la primera oferta y una flecha orienta hasta abrirla. DEV ya tiene el conjunto instalado. Permanecer 1,5 s abre el panel, pausa y exige salir/volver tras cerrar.

**Aceptar → Preparar encargo → volver al tablón → Entregar y cobrar.** Preparar encargo está en la esquina superior derecha junto al mostrador. Un solo punto recoge una ración cuando no llevas platos y empaqueta uno cuando ya lo llevas; son dos ciclos completos separados. Puedes quedarte allí mientras el cocinero repone, o llevar platos directamente del hornillo.

Primeros encargos completados: **4, 6 y 9 nasi goreng**; después alternan 6/9 sin repetirse consecutivamente. Cancelar durante estos primeros encargos conserva el paso. Solo una a la vez, sin caducidad antes de aceptar ni stock reservado. Al llenar la caja se fija el pago, aparece «Listo para entregar» y se señala el tablón. El dinero llega al pulsar **Entregar y cobrar**, una única vez. Base cantidad × 10; bonus del 50 % si terminas de empaquetar en 90 s activos. El camino de vuelta no reduce el premio. Pagos base/bonus: **4 → 40 + 20**, **6 → 60 + 30**, **9 → 90 + 45** monedas, sin otra recompensa.

Cancelar durante preparación exige confirmación, devuelve lo empaquetado al stock y conserva carga/saldo. Después de cobrar o cancelar, nueva oferta en 45 s activos. Paneles y pestaña oculta congelan relojes. El HUD muestra progreso y, cuando está listo, recuerda volver al tablón.

La papelera queda en la esquina inferior izquierda para despejar oficina/tablón. Caja conserva su punto; su nombre se coloca justo encima y el jugador puede taparlo. Recorrido y detalles en [ENCARGOS.md](docs/ENCARGOS.md).

## Inicio y demanda

El **primer desplazamiento efectivo** activa una cuenta atrás única de **8 segundos de simulación activa**. Después aparece el primer cliente en la entrada exterior y camina hacia su fila, aunque no se haya producido comida. Moverse contra un obstáculo sin desplazarse no activa el reloj. Detenerse no lo reinicia; paneles y pestaña oculta lo pausan. Depositar platos no influye.

Las llegadas posteriores usan intervalo base 8 s dividido por la frecuencia absoluta del tramo:

| Gasto en compras correctas | Frecuencia | Intervalo |
| --- | --- | --- |
| Menos de 300 | 0,8 | **10 s** |
| 300 a menos de 500 | 1,2 | **6,67 s** |
| 500 a menos de 1000 | 2 | **4 s** |
| Desde 1000 | 2,4 | **3,33 s** |

Cambiar tramo muestra un aviso y comienza un intervalo nuevo completo, sin ráfaga ni deuda. Si aún no llegó el primero conserva su cuenta atrás. No se multiplican tramos entre sí ni se aumenta más allá del último. Ingresos, saldo e intentos fallidos no suman gasto.

Hasta instalar la primera mesa, solo para llevar. Después, futuras llegadas con intención **65 % comer dentro / 35 % para llevar**, fijada una vez; filas **20/10**, máximo global **48**. Fila llena omite la llegada sin desviar intención ni acumular deuda. Mesas asignadas no impiden ventas para llevar.

## Recorrido manual del juego

1. **Inicio:** abre DEV con F2 o mantén dinero 1,2 s; reinicia. Sin moverte no aparecen clientes. Da un paso y espera: primero a los 8 s activos sin necesitar comida. Abrir oficina o cambiar pestaña congela la cuenta.
2. **Oficina y encuadre:** acércate a la alfombra «Oficina» en pared izquierda. Prueba permanencia, pausa, cierre sin reapertura y salir/volver. Recorre bordes en vertical y horizontal: exterior completo, controles iguales y panel legible.
3. **Primera venta:** prepara platos y deposita; ve a Caja por detrás. Revisa cobro continuo y progreso visible. Desde delante no cobra.
4. **Contratación:** reúne 100 y contrata al primero. La misma tarjeta explica el requisito del segundo. Compra otro hornillo por 180; reúne 220 y contrata al segundo. Gasto acumulado 500 si solo hiciste estas compras: activa el tramo de 4,71 s. La tarjeta queda en «Equipo completo». Con gasto 1300 llega el último tramo, 3,33 s.
5. **Trabajo simultáneo:** sitúate en el pasillo central de cocina para observar los dos hornillos. Cada cocinero toma ingredientes, camina al suyo, carga/recoge y deposita. Amarillo usa el izquierdo y coral el derecho. Sin ventas terminan en 12 raciones conjuntas; cobra varias y vuelve a mirar: ambos reanudan. Puedes producir en una posición libre sin duplicar recursos. DEV muestra asignaciones, stock, producción comprometida y cargas reservadas.
6. **Mejoras y ampliación:** comprueba que la mejora de capacidad no aparece y prueba rapidez antes y después de contratar; ambos conservan capacidad 8. Compra cuatro mesas por 80/140/220/320 y revisa circulación y limpieza. Huellas ocupadas rechazan sin cobrar.
7. **Reinicio:** con ambos trabajando, abre DEV y reinicia. Vuelve a dos mesas, un hornillo, ningún empleado, gasto cero, frecuencia 0,8 y espera del primer movimiento. Desaparecen tareas, inventarios, reservas, comentarios y referencias de interacción.

Los tests preparan fondos y estados de ocupación para casos concretos; no hay dinero gratis en interfaz.

## Revisión manual de idiomas

1. Abre oficina y cambia entre los tres idiomas. Comprueba dinero, requisitos, precio siguiente, efectos y confirmación de una compra.
2. Cierra y observa rótulos, filas, avisos de carga, cocineros, limpieza y comentarios. No deben quedar mensajes del idioma anterior.
3. Comprueba que el restaurante sigue igual y que cerrar exige salir/volver a la oficina.
4. Recarga: la elección se conserva, pero la partida vuelve a cero. Prueba además con almacenamiento bloqueado y preferencias regionales del navegador.
5. En móvil, alterna orientación y desplaza hasta la última tarjeta: selector, textos y Cerrar deben ser legibles.

## Revisión visual (aprobada)

- Revisa el local inicial y después seis mesas/dos hornillos: volúmenes, sombras, ropa y profundidad por los pies.
- Acércate al fondo para leer las dos líneas del rótulo y a la entrada de clientes para comprobar la alfombra.
- Observa wok/vapor y progreso, plato con marca de listo, mesa con restos y exclamación.
- Comprueba cargas máximas de ingredientes, platos y residuos; las tres torres tienen cantidades exactas y no tapan el rostro ni los avisos propios.
- Prueba Oficina, comprar y desplazar la lista en móvil: Cerrar debe quedar visible. El HUD mantiene dinero y solo añade la tarjeta durante un encargo activo o listo para entregar.
- Alterna vertical/horizontal y recorre estaciones con teclado o arrastre; el encuadre y la respuesta son los aprobados.

Capturas y límites de verificación en [VERIFICATION.md](docs/VERIFICATION.md). Las capturas revision-* de esta revisión conservan la cámara normal tanto en escritorio como en móvil; las vistas generales con encuadre especial pertenecen a entregas históricas.

## Organización y límites

Configuración en src/config.ts; distribución en src/world/layout.ts. Restaurant coordina compras, clientes, mesas, dinero y reservas, incluida capacidad de producción. Production realiza transferencias y cocina; Staff mantiene cocineros, limpieza y cajero con identidades fijas; BulkOrders conserva bloqueado/oferta/activo/listo/espera y el único objetivo introductorio. Reglas independientes de Phaser/DOM; sin sistemas genéricos ni framework adicional.

Consulta [diseño](docs/GAME_DESIGN.md), [roadmap](docs/ROADMAP.md) y [verificación](docs/VERIFICATION.md).

Arte, precios y demanda provisionales. Guardado normal y DEV independientes; consulta la guía de apertura para límites y recuperación. Personajes pueden cruzarse. Delta activo máximo 100 ms: por debajo de 10 FPS avanza más despacio. Continúa el aviso del bundle de Phaser. Móvil emulado no acredita comodidad en teléfono físico; pendientes otros navegadores y balance manual.

**Detener para revisión manual de progresión normal.** Pendientes sin implementar: nuevas recetas, frigoríficos adicionales, horas punta, edición de distribución y nuevos locales. Sin objetivos finales, personal adicional, publicación ni push.

## Proveedor y dinero físico

En el escenario avanzado sin saldo de prueba explícito se conservan 30 monedas y frigorífico vacío. La partida normal empieza con 150 para reforma e instalaciones. El proveedor está abajo, junto a la entrada: permanece 1,5 s y compra 10 ingredientes por 30. Las ventas dejan dinero en la bandeja detrás del mostrador, a la izquierda de Caja; permanece en su punto para recoger todo. El HUD solo muestra dinero disponible.

Para probar recuperación, abre [?monedas=0](http://127.0.0.1:5173/?monedas=0), pide 10 ingredientes fiados por 33, cocina y vende. Las primeras siete ventas saldan la deuda y dejan 37 en la bandeja. Recoge y compra al contado. Fiado no disponible mientras haya deuda; contado sí. No hay intereses por tiempo. Detalles y recorrido manual en [ECONOMY.md](docs/ECONOMY.md).

Paquete grande: 50 ingredientes por 150 al contado desde 500 invertidas en mejoras/contrataciones, también con deuda. No limita ni sustituye al pequeño. Todas las compras acumulan stock sin máximo. Aviso único al desbloquear; dinero de URL no cuenta como inversión. Demanda ×2 desde 500 y ×2,4 desde 1000. Economía base aprobada; ajuste pendiente de revisión manual.
