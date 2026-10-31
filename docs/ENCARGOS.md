# Encargos, preparación y cobro

**Progresión normal vigente:** ver [PROGRESSION.md](PROGRESSION.md). Oficina 50; primera mesa con papelera 40 y siguientes 60/80/140/220/320; zona de encargos 50 tras cocinero. Sin zona construida no hay ofertas. Estas compras cuentan como inversión; DEV mantiene sus instalaciones concedidas sin gasto.


Revisión del 2026-10-12. Tras aprobar distribución y entrega, ajusta progresión 4→6→9, tandas de cocina, demanda avanzada y textos visibles. Pendiente de revisión manual, sin publicación ni push.

## Recorrido del jugador

1. Contratar al primer cocinero por 100 monedas habilita la construcción física de la zona de encargos (50). Construir instala tablón/empaquetado y desbloquea la oferta de **4 nasi goreng**. En DEV el conjunto ya está instalado. El tablón de Encargos sigue debajo de Oficina, en la pared izquierda. Permanecer 1,5 s abre el panel y pausa la simulación.
2. Aceptar el encargo inicia el plazo de **90 s activos** para la bonificación. El cocinero sigue produciendo y depositando en el mostrador; el stock es compartido con las ventas habituales, sin reservar comida al aceptar.
3. Ir a **Preparar encargo**, en la esquina superior derecha junto al mostrador. Solo hay un punto de acción: si el jugador lleva platos, empaqueta uno; si no lleva ninguno, recoge uno del mostrador. Cada operación tiene un ciclo completo independiente de 0,8/0,6/0,4 s. Quedarse allí alterna recogida y empaquetado mientras haya comida y falten raciones. Se admiten también platos traídos directamente del hornillo.
4. Al empaquetar la última ración queda **Listo para entregar**. La caja permanece llena, aparece un aviso breve y el tablón recibe contorno dorado, insignia y orientación si está fuera de cámara. El HUD indica volver a entregar.
5. Regresar al tablón y pulsar **Entregar y cobrar**. Ese botón entrega la caja, abona las monedas una sola vez y marca el primer encargo cumplido. No se transporta físicamente la caja ni se requiere otro destino.

Primer encargo: **4 raciones, 40 monedas base + 20 de bonificación**. Segundo: **6 raciones, 60 + 30**. Tercero: **9 raciones, 90 + 45**. La bonificación se gana si el último plato se empaquetó antes de agotar los 90 s. El importe queda fijado al terminar de empaquetar: el paseo de vuelta no consume la bonificación ni hace caducar el cobro. No hay otra recompensa, objeto ni premio extra por el objetivo introductorio.

## Estados y transferencias

BulkOrders mantiene locked → offer → active → ready → waiting. Una sola oferta/encargo, sin cola genérica. Los IDs no se reutilizan tras reiniciar.

- Oferta sin caducidad; aceptar el mismo ID dos veces no duplica.
- Recogida: una ración real del stock al inventario. Venta y retirada revalidan el stock al completar; no pueden consumir dos veces la última ración.
- Empaquetado: un plato del inventario a la caja, revalidando ID y progreso. Conserva ingredientes, residuos y platos sobrantes.
- La zona compartida prioriza empaquetar lo que ya se lleva. Encargos de 9 se resuelven sin ampliar la capacidad de 8.
- La última transferencia fija pago/bonificación y cambia a ready; todavía no suma dinero ni gasto, no completa el objetivo y no genera otra oferta.
- Solo cobrar el ID listo abona, completa el objetivo y comienza la espera de 45 s activos. Doble pulsación o ID antiguo no duplican el pago.
- Durante active se puede cancelar, con confirmación. Lo empaquetado vuelve al stock una sola vez; se conservan carga y saldo. Después comienza la espera de 45 s. Una caja ya lista solo permite entregar y cobrar.
- Primeros encargos completados: 4, 6 y 9. Después alternan 6/9, sin repetir la cantidad anterior. Cancelar durante la introducción no avanza al siguiente paso; solo entregar y cobrar. DEV vuelve a 4. Un delta grande no acumula ofertas ni adelanta su aceptación.
- Todos los relojes usan tiempo activo; oficina, tablón, DEV, foco y pestaña oculta pausan. Sin progreso offline.

## Distribución y capacidad

El tablón queda en x90/y581; la papelera se traslada a la esquina inferior izquierda (huella x90/y715, punto x170/y735), despejando Oficina y Encargos. El punto de descanso de limpieza se adapta sin invadir la papelera. Rutas comprobadas también con seis mesas y dos hornillos.

Preparar encargo ocupa x820/y145, con punto x852/y211. Sustituye al antiguo punto Retirar platos; recogida y empaquetado comparten una sola zona, separada de Caja y Depositar. No invade el segundo hornillo.

El nombre Caja baja a 12 unidades por encima del punto físico, con origen inferior y profundidad de suelo: el personaje puede taparlo. El símbolo y la barra elevados se mantienen. La acción de caja no cambia.

**Capacidad del equipo está oculta y deshabilitada.** No se crea su tarjeta en el panel. Restaurant rechaza la compra, incluso si se intenta por otra vía: no cambia dinero, gasto, nivel ni inventarios. La configuración 12/16 queda conservada para una eventual revisión, con UPGRADES.transport.enabled en false. Personal presente y nuevas contrataciones usan 8 en sus categorías.

## Arranque local con monedas

Con npm run dev:

- [600 monedas](http://localhost:5173/?monedas=600)
- [500 monedas](http://localhost:5173/?monedas=500)
- [2000 monedas para equipo avanzado](http://127.0.0.1:5173/?monedas=2000)
- [Inicio normal](http://localhost:5173/)

Acepta enteros de 0 a 100000, solo con desarrollo Vite y host localhost/127.0.0.1/::1. Ausente, inválido o fuera de límite equivale a 0. La build de producción ignora el parámetro. No persiste nada ni desbloquea empleados, encargos, mejoras o llegadas, y no suma gasto válido. DEV restaura el saldo inicial de esa URL; recargar sin parámetro vuelve al comienzo normal. Código en src/dev/startup.ts.

Con 600 se pueden comprar cocinero (100), limpieza (80), segundo hornillo (180) y dos mesas (80 + 140): gasto 580, saldo 20, cuatro mesas y frecuencia 1,7. La capacidad deshabilitada no cuenta como compra. Demanda 65/35 y tramos 0/300/500/1300 con frecuencias 0,8/1,2/1,7/2,4. Con cuatro mesas, dos hornillos, dos cocineros, limpieza y dos mejoras de rapidez/cocción el gasto es 1340: intervalo 3,33 s. Añadir cajero cuesta 150 (total 1490).

## Presentación, idiomas y reinicio

El tablón sigue visible desde el inicio con requisito de cocinero. El primer desbloqueo no abre ventanas. Orientación inicial hasta primera apertura real; nueva orientación de retorno solo mientras hay entrega pendiente. Preparar encargo conserva la ayuda breve y su señal local inicial. Ayudas sin capturar entradas, ocultas al arrastrar/panel/pausa. Cámara normal sin cambios.

Los paneles conservan pausa, cancelación de gestos, permanencia de 1,5 s y requisito de salir/volver. La tarjeta compacta aparece durante preparación y entrega pendiente; desaparece al cobrar/cancelar.

Textos y parámetros completos es/en/id en src/i18n/catalogs. Revisar station.packing, bulk.how, bulk.ready*, bulk.claim, bulk.reward, bulk.returnBoard y sus parámetros con una hablante nativa en [id.ts](../src/i18n/catalogs/id.ts).

DEV limpia caja, recompensa pendiente, visitas, señales, todos los estados y temporizadores, además del restaurante habitual. Restaura el saldo de la sesión local y capacidades 8. Solo se guarda el idioma.

## Recorrido manual de revisión

1. Abrir con 600 monedas; visitar papelera y tablón bloqueado. Verificar que Oficina/Encargos quedan despejados.
2. Comprar las cinco mejoras anteriores y comprobar saldo 20, mejora de capacidad ausente y segundo hornillo accesible.
3. Aceptar la oferta. Ir al único punto Preparar encargo y esperar: observar plato recogido, plato empaquetado y contador.
4. Llegar a 4/4: saldo sigue en 20, caja visible, mensaje de listo y tablón señalado. Volver y cobrar: saldo 80 si se ganó bonus, 60 si no. Esperar 45 s activos: la siguiente oferta debe ser de 6; tras completarla, la de 9.
5. Cerrar/reabrir: no hay segundo pago. Cancelar otro encargo parcialmente empaquetado y comprobar devolución.
6. Comprobar ayuda en caja, ventas del cajero compitiendo con recogida, limpieza hasta la nueva papelera y circulación con todas las mesas.
7. Alternar es/en/id y revisar móvil. Reiniciar con entrega pendiente: nada residual; el saldo vuelve al indicado en la URL.
8. Abrir con 2000 monedas y comprar el equipo avanzado. Observar tandas de ambos cocineros y el nuevo intervalo de 3,33 s. Terminan de recoger cocciones propias y descargan toda la tanda, con objetivo 4 y entregas parciales si no queda trabajo. No se presupone mejora de retención.

## Diagnóstico anterior (2026-10-11)

El tablón antiguo sí existía y abría: se ganó dinero y contrató al cocinero mediante juego normal. Su ubicación detrás del hornillo, tamaño y ausencia de orientación dificultaban descubrirlo. La revisión anterior lo trasladó junto a Oficina. Las capturas discovery-* acreditan ese diagnóstico, pero preceden a la distribución y entrega descritas aquí.

Resultados actuales en [VERIFICATION.md](VERIFICATION.md). Móvil emulado no equivale a teléfono físico.

## Integración económica (2026-10-20)

Hay que comprar ingredientes al proveedor: el frigorífico comienza vacío. El fiado permite iniciar producción incluso si las contrataciones han consumido el saldo de prueba. Las cantidades, base, bonus y plazos del encargo no cambian. Al entregar, se amortiza min(deuda, floor((base + bonus ganado)/2)); solo el neto entra en cartera. El panel listo muestra bruto/devolución/neto cuando hay deuda. Empaquetado y cancelación no pagan ni amortizan; cancelar devuelve comida al stock. Ver [ECONOMY.md](ECONOMY.md).
