# Warung Kita

Prototipo de gestión de un warung para navegador. Hitos 1–4, revisión de experiencia y cierre del primer local aprobados manualmente. Oficina, cámara, demanda y segundo cocinero también aprobados manualmente. **Renovación visual y localización aprobadas manualmente. Experimento de cajero y encargos implementado, pendiente de revisión manual.**

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

Vite escucha en todas las interfaces en el puerto fijo 5173. Acceder desde un teléfono físico puede requerir configuración LAN/WSL/firewall; el proyecto no cambia esa configuración.

## Primera renovación visual

Restaurante de juguete en 2D: crema, madera cálida y verde jade, volúmenes redondeados y sombras suaves. Cocina y comedor usan materiales distintos. Personajes con ropa propia de cada rol, variantes de clientes y marcha discreta. La carga mantiene cantidades exactas y formas distintas; estados de cocina/listo/suciedad usan símbolos además de color.

La alfombra Selamat datang está en el acceso real de clientes. El rótulo de la pared tiene una placa donde caben sus dos líneas. El panel distingue compras disponibles, saldo insuficiente, requisitos y máximos, con cierre fijo al desplazar la lista.

Todo se dibuja por código, sin assets externos ni dependencias nuevas. Tema en src/visuals/theme.ts; detalles en [VISUAL_DESIGN.md](docs/VISUAL_DESIGN.md). Reglas, economía, inventarios, tareas, movimiento, puntos y zoom conservados.

## Idiomas

En la oficina, el selector **Español / English / Bahasa Indonesia** cambia todos los textos en caliente sin reiniciar la partida. Solo recuerda esa elección en localStorage (warung-kita.language); si está bloqueado, funciona durante la sesión. Recargar sigue reiniciando el juego.

Al iniciar: elección guardada válida, luego idiomas del navegador en orden (es-ES, en-US, id-ID y otras variantes), y finalmente inglés. No se utiliza ubicación ni zona horaria. Números con formato del idioma elegido.

Catálogos revisables: [español](src/i18n/catalogs/es.ts), [inglés](src/i18n/catalogs/en.ts) e **[indonesio](src/i18n/catalogs/id.ts)**. Conservan las mismas 176 claves y parámetros. Para revisión con una hablante nativa, cambiar solo los valores de id.ts y mantener claves y marcadores entre llaves. Guía en [LOCALIZATION.md](docs/LOCALIZATION.md).

Panel, estados de compra, requisitos, efectos, confirmaciones, avisos, comentarios, rótulos funcionales, filas, nombres de profesiones, feedback de carga, dinero y accesibilidad están localizados. Warung Kita, nasi goreng y la alfombra cultural Selamat datang se conservan. Datos/identificadores internos de DEV y errores de programación de consola siguen siendo diagnósticos técnicos; sus botones y título sí se traducen.

## Jugar

WASD/flechas o arrastre relativo desde una zona libre del lienzo. Diagonales normalizadas, origen fijo en píxeles CSS y sin inercia. Soltar, cancelar, perder foco u orientar/redimensionar elimina entradas. Cámara centrada directamente en el jugador, ahora con **zoom ×0,85** respecto al encuadre anterior: 15 % más alejado, sin modificar mundo, velocidades, colisiones o radios. El dinero y los paneles conservan tamaño de pantalla.

Permanece quieto en un punto de acción. Cada ciclo transfiere una unidad o atiende a un cliente; si hay trabajo empieza otro ciclo completo. Intentar moverse cancela aunque no puedas desplazarte. Sin acción válida no se acumula progreso.

**Frigorífico → hornillo → Depositar → Caja.** Cada hornillo tiene cuatro posiciones independientes. Recoge ingredientes, carga, espera cocción, recoge platos y deposítalos en el mostrador. Stock sin límite; inventarios independientes de ingredientes, platos y residuos.

**Caja está detrás del mostrador**, arriba a la derecha: accede desde cocina por su pasillo izquierdo y gira a la derecha por detrás. Depositar está en el lateral izquierdo y tiene un punto distinto. No puedes cobrar desde el lado público ni desde laterales fuera de la zona trasera. Caja admite cualquier carga.

Una venta cobra 10 y entrega directamente una ración. Comer dentro reserva mesa, priorizando limpia. Si está sucia, el cliente espera con su plato junto a caja; limpiar conserva la reserva y lo envía al asiento. Solo come al llegar. Para llevar recibe comida y sale. La zona de mesa solo limpia; la papelera retira un residuo por ciclo.

## Oficina y compras

La **Oficina** está integrada en la pared izquierda. Su alfombra interior tiene el indicador de interacción. Permanece 1,5 s allí para abrir Mejoras; no hay mueble que bloquee el paso ni otra habitación. El panel pausa todo y cancela entradas. Tras cerrarlo debes salir de la zona y volver para reabrir.

| Compra | Efecto | Precio |
| --- | --- | --- |
| Contratar cocinero | Máximo dos; segundo requiere primero y segundo hornillo operativo | 100 / 220 |
| Limpieza | Una persona para mesas y residuos | 80 |
| Cajero | Uno; requiere primer cocinero; comparte caja con el jugador | 150 |
| Capacidad del equipo | 8 → 12 → 16 por categoría aplicable | 60 / 120 |
| Rapidez del equipo | 0,8 → 0,6 → 0,4 s por acción | 80 / 160 |
| Cocina más rápida | Nuevas cocciones: 4 → 3 → 2 s en ambos hornillos | 100 / 200 |
| Añadir mesa | Cuatro compras sucesivas: 2 → 6 mesas | 80 / 140 / 220 / 320 |
| Añadir hornillo | Una compra: 1 → 2, cuatro posiciones cada uno | 180 |

Capacidad y rapidez afectan al jugador y empleados actuales/futuros. Cada cocinero lleva ingredientes/platos; limpieza solo residuos. Las categorías no comparten espacio. Acciones y cocciones iniciadas conservan su duración; las siguientes usan la mejora. Rapidez no cambia desplazamiento ni consumo.

Una tarjeta de cocineros muestra requisito y precio siguiente; con dos muestra **Equipo completo**. Mesas: **Espacio completo** a seis. Hornillos: **Máximo alcanzado** a dos. Las compras revalidan saldo y nivel para cobrar una vez. Si un actor ocupa una huella futura se rechaza sin cobrar: cierra, despeja el espacio y vuelve. No quedan compras pendientes. Las rutas se recalculan desde posiciones actuales.

Mesas en dos columnas y tres filas, sin números en el escenario ni panel normal. Identificadores técnicos solo en DEV.

## Cooperación

Con un cocinero, puede usar ambos hornillos. Con dos, **Cocinero 1** (delantal amarillo) usa el inicial y **Cocinero 2** (delantal coral) el adicional. Comparten frigorífico y depósito, con carga y tareas propias. No cambian de hornillo para ayudarse. El jugador puede trabajar en cualquier posición libre de cualquiera.

El objetivo **conjunto de 12 raciones** cuenta stock del mostrador, platos transportados por cocineros, raciones cocinando/listas de ambos hornillos y reservas de cargas automáticas pendientes. No cuenta ingredientes ni duplica raciones. Reservar capacidad al comenzar el viaje evita que ambos reclamen la última unidad. Cancelar o invalidar libera capacidad y posición.

Al alcanzar el objetivo dejan de iniciar cocciones, pero recogen y depositan las ya producidas, incluidos lotes parciales. Reanudan tras ventas o retiradas de stock y conservan ingredientes sobrantes. La producción manual no tiene este límite y puede superar 12.

Limpieza prioriza reservas antiguas y después suciedad antigua. Vacía residuos cuando se llena o no queda tarea, aunque lleve uno. El cajero cobra desde su puesto trasero; jugador y cajero comparten una única operación. Quien la inicia puede terminarla y cada cliente paga/recibe una vez. Ningún empleado reparte.

## Encargos voluntarios

El primer cocinero desbloquea el tablón del fondo, junto al empaquetado entre frigorífico y hornillo. Permanece 1,5 s para abrirlo: pausa todo y exige salir/volver tras cerrar. Primera oferta: 6 nasi goreng; siguientes: 6, 8 o 10. Solo una oferta o encargo a la vez. No caduca antes de aceptar ni aparta comida automáticamente.

Pago base: cantidad × 10. Bonificación del 50 % si completas en 90 s activos desde aceptar. Al agotarse el reloj puedes entregar por la base. Tras completar o cancelar, otra oferta llega a los 45 s activos. Valores provisionales en src/config.ts.

Lleva platos directamente del hornillo o recógelos en **Retirar platos**, a la derecha del mostrador. Retira una unidad por ciclo mientras falten raciones, descontando las que ya transportas y respetando capacidad. Compite por el mismo stock que las ventas y activa la reposición normal de los cocineros. **Empaquetar** transfiere una por ciclo; muestra una caja con progreso y paga automáticamente al completar. Los sobrantes siguen contigo.

Cancelar desde el tablón pide confirmación: devuelve lo empaquetado al stock exactamente una vez, conserva platos transportados y no cambia dinero. El objetivo «Completa tu primer encargo» es opcional y no añade recompensa. La tarjeta de HUD solo aparece con un encargo activo. Oficina, tablón, DEV y pestaña oculta congelan los relojes.

Recorrido de evaluación y reglas detalladas en **[ENCARGOS.md](docs/ENCARGOS.md)**. Incluye probar reparto de stock con ventas del cajero, entregar tarde y cancelar. Es un experimento para revisar; no presupone una mejora de retención.

## Inicio y demanda

El **primer desplazamiento efectivo** activa una cuenta atrás única de **8 segundos de simulación activa**. Después aparece el primer cliente en la entrada exterior y camina hacia su fila, aunque no se haya producido comida. Moverse contra un obstáculo sin desplazarse no activa el reloj. Detenerse no lo reinicia; paneles y pestaña oculta lo pausan. Depositar platos no influye.

Las llegadas posteriores usan intervalo base 8 s dividido por la frecuencia absoluta del tramo:

| Gasto en compras correctas | Frecuencia | Intervalo |
| --- | --- | --- |
| Menos de 300 | 0,8 | **10 s** |
| 300 a menos de 600 | 1,2 | **6,67 s** |
| Desde 600 | 1,5 | **5,33 s** |

Cambiar tramo muestra un aviso y comienza un intervalo nuevo completo, sin ráfaga ni deuda. Si aún no llegó el primero conserva su cuenta atrás. No se multiplican tramos entre sí ni se aumenta más allá del último. Ingresos, saldo e intentos fallidos no suman gasto.

Intención **70 % comer dentro / 30 % para llevar**, fijada una vez; filas **20/10**, máximo global **48**. Fila llena omite la llegada sin desviar intención ni acumular deuda. Mesas asignadas no impiden ventas para llevar.

## Recorrido manual del juego

1. **Inicio:** abre DEV con F2 o mantén dinero 1,2 s; reinicia. Sin moverte no aparecen clientes. Da un paso y espera: primero a los 8 s activos sin necesitar comida. Abrir oficina o cambiar pestaña congela la cuenta.
2. **Oficina y encuadre:** acércate a la alfombra «Oficina» en pared izquierda. Prueba permanencia, pausa, cierre sin reapertura y salir/volver. Recorre bordes en vertical y horizontal: exterior completo, controles iguales y panel legible.
3. **Primera venta:** prepara platos y deposita; ve a Caja por detrás. Revisa cobro continuo y progreso visible. Desde delante no cobra.
4. **Contratación:** reúne 100 y contrata al primero. La misma tarjeta explica el requisito del segundo. Compra otro hornillo por 180; reúne 220 y contrata al segundo. Gasto acumulado 500 si solo hiciste estas compras: intervalo 6,67 s. La tarjeta queda en «Equipo completo». Otras compras hasta 600 activan 5,33 s.
5. **Trabajo simultáneo:** sitúate en el pasillo central de cocina para observar los dos hornillos. Cada cocinero toma ingredientes, camina al suyo, carga/recoge y deposita. Amarillo usa el izquierdo y coral el derecho. Sin ventas terminan en 12 raciones conjuntas; cobra varias y vuelve a mirar: ambos reanudan. Puedes producir en una posición libre sin duplicar recursos. DEV muestra asignaciones, stock, producción comprometida y cargas reservadas.
6. **Mejoras y ampliación:** prueba capacidad/rapidez antes y después de contratar; ambos heredan valores. Compra cuatro mesas por 80/140/220/320 y revisa circulación y limpieza. Huellas ocupadas rechazan sin cobrar.
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
- Prueba Oficina, comprar y desplazar la lista en móvil: Cerrar debe quedar visible. El HUD mantiene dinero y solo añade la tarjeta durante un encargo activo.
- Alterna vertical/horizontal y recorre estaciones con teclado o arrastre; el encuadre y la respuesta son los aprobados.

Capturas y límites de verificación en [VERIFICATION.md](docs/VERIFICATION.md). Las vistas generales de documentación usan un encuadre de prueba para enseñar el local completo; las móviles conservan la cámara del juego.

## Organización y límites

Configuración en src/config.ts; distribución en src/world/layout.ts. Restaurant coordina compras, clientes, mesas, dinero y reservas, incluida capacidad de producción. Production realiza transferencias y cocina; Staff mantiene cocineros, limpieza y cajero con identidades fijas; BulkOrders conserva oferta/activo/espera y el único objetivo introductorio. Reglas independientes de Phaser/DOM; sin sistemas genéricos ni framework adicional.

Consulta [diseño](docs/GAME_DESIGN.md), [roadmap](docs/ROADMAP.md) y [verificación](docs/VERIFICATION.md).

Arte, precios y demanda provisionales. Sin guardado de partida; recargar empieza de cero y solo conserva el idioma. Personajes pueden cruzarse. Delta activo máximo 100 ms: por debajo de 10 FPS avanza más despacio. Continúa el aviso del bundle de Phaser. Móvil emulado no acredita comodidad en teléfono físico; pendientes otros navegadores y balance manual.

**Detener para revisión manual del experimento.** Pendientes sin implementar: nuevas recetas, frigoríficos adicionales, horas punta, edición de distribución y nuevos locales. Sin guardado de partida, objetivos finales, personal adicional, publicación ni push.
