# De local abandonado a primera venta

Hito 2026-10-21. La partida normal usa el inicio guiado. Los sistemas anteriores siguen disponibles en el escenario DEV avanzado, con la misma simulación.

## Presupuesto y recorrido

`OPENING` en `src/config.ts`: saldo 150; reparación conjunta 20, frigorífico 30, primer hornillo 40, mostrador/caja/bandeja 30, primer paquete de 10 ingredientes 30 (precio de ECONOMY). Total **150**. Deuda, bandeja, ingredientes, mesas y empleados empiezan a cero. Negocio cerrado. Oficina, comedor y encargos se construyen después según [PROGRESSION.md](PROGRESSION.md).

1. Cerrar la introducción y alcanzar la marca de reforma. Teclado WASD/flechas o arrastre móvil.
2. Permanecer 1,5 s; confirmar reforma por 20. Cancelar no cobra. Tras cerrar hace falta salir y volver para reabrir.
3. Instalar frigorífico (30), hornillo (40) y mostrador (30) en las posiciones existentes. Solo se señala la siguiente construcción; las ausentes no colisionan ni tienen acciones/reservas.
4. Comprar 10 ingredientes por 30 al proveedor. El fiado sigue siendo opcional y cuenta como suministro para el tutorial.
5. Recoger ingredientes, cargar el hornillo, recoger comida preparada y depositarla. No se exige cargar exactamente una unidad; los estados adelantados actualizan el objetivo.
6. Ir al punto de apertura junto a la entrada (840,690) y permanecer 1,5 s. Requiere reforma, tres instalaciones y una ración en mostrador.
7. Primer cliente generado tras 2 s activos; debe recorrer físicamente la fila antes de ser atendido. Después, intervalo base normal de 10 s. Solo clientes para llevar mientras no haya mesas.
8. Atender desde Caja y recoger dinero en la bandeja. Termina la apertura y aparece el objetivo de oficina (50). Seguir produciendo/vendiendo/reponiendo permite ahorrar; después se amplía libremente desde oficina.

Las compras se validan y ejecutan una vez. Los puntos de construcción quedan fuera de sus futuras huellas; se comprueban ocupación y acceso antes de instalar. La reforma usa colores y grietas provisionales con Graphics, sin assets externos. El objetivo persiste al cerrar explicaciones y se deriva de instalaciones, recursos y hechos ya realizados. La orientación solo destaca el objetivo actual; no aparecen todos los requisitos futuros.

## Economía y demanda

Gasto de apertura (`opening.spent`) separado de inversión en mejoras/contrataciones (`totalSpent`). La apertura cuesta 120; suministro 30 no se suma a ninguno de esos gastos. Paquete grande requiere 500 de inversión válida; no se desbloquea en el tutorial. Se conservan 10/30, fiado 10/33, grande 50/150 y stock acumulable sin máximo. Las ventas ordinarias amortizan hasta floor(bruto/2) y dejan neto en bandeja; recoger no amortiza otra vez.

Demanda posterior conservada: 0–299 ×0,8/10 s; 300–499 ×1,2/6,67 s; 500–999 ×2/4 s; desde 1000 ×2,4/3,33 s. En partida normal el movimiento ya no activa llegadas: solo apertura explícita, sin tiempo acumulado estando cerrado.

## Guardado local

`src/persistence/Save.ts`, versión de formato **2**, con migración explícita de v1 (ver PROGRESSION.md). Las claves permanecen estables para localizar guardados anteriores. Claves:

- `warung-kita.save.v1`: partida normal.
- `warung-kita.dev-save.v1`: escenario avanzado local de pruebas, independiente.
- `warung-kita.language`: preferencia de idioma existente, independiente de ambos guardados.

Instantánea JSON explícita: cartera, bandeja, deuda, inversión, gasto de apertura, instalaciones, apertura, hechos/avisos de tutorial, stock, inventarios, posiciones/tiempos de hornillos, mostrador, mejoras, relojes de llegada, empleados/cargas/posiciones, mesas, clientes, ventas pagadas, filas, encargo activo/listo/espera y sus temporizadores. No contiene Phaser, funciones ni referencias circulares.

Validación de tipos, números, versiones, IDs, capacidades, instalaciones, colas y referencias entre clientes/mesas/ventas antes de aplicar. Las rutas de clientes se reconstruyen por estado y destino. Empleados conservan carga y posición, pero replantean tarea desde cero; se descartan permanencias, rutas y reservas de ejecución. Una transferencia completa ya está reflejada en ambos lados de la instantánea; una incompleta no ha transferido nada. La cocción mantiene tiempo activo transcurrido/duración capturada. No se resta tiempo de reloj real ni se ejecuta progreso offline.

Guardado tras compras/instalaciones/apertura, acciones manuales y cambios de dinero/estado económico; también cada 5 s activos y al pasar a segundo plano/pagehide cuando el navegador lo permite. Se guarda una cadena JSON con una sola escritura síncrona por instantánea; no se escribe cada frame. Una interrupción abrupta puede perder como máximo el trabajo no guardado desde la última instantánea periódica (por ejemplo, movimiento o una tarea de empleado), pero no duplica transferencias de una instantánea guardada.

Con datos válidos se ofrece **Continuar partida**. Datos corruptos o versión incompatible se conservan: se informa y solo se reemplazan tras confirmar nueva partida. Sin almacenamiento o con cuota agotada, el juego sigue y muestra que el progreso no se conservará; nunca se muestra éxito falso. Una escritura fallida puede dejar disponible el último guardado correcto, no la sesión más reciente. El guardado es local a origen/navegador: localhost y 127.0.0.1 pueden tener partidas distintas. Borrar datos del navegador elimina el progreso; no hay nube ni cuentas.

**Partida y ajustes** pausa y ofrece idioma/nueva partida. Nueva partida necesita confirmación, vuelve a 150/local deteriorado y conserva idioma. Recargar ofrece continuar, sin añadir dinero inicial al saldo guardado.

## Escenario avanzado DEV

En Vite dev local: `?escenario=avanzado&monedas=2000`, o cualquier URL local con `?monedas=...`. También hay acceso explícito desde Partida y ajustes. Producción ignora estas URLs. Se mantienen dos mesas iniciales, instalaciones operativas, oficina, tablón y sistemas anteriores; contratar/comprar/encargos usan Restaurant, Production, Staff y BulkOrders reales.

El modelo mantiene el constructor avanzado por compatibilidad con las pruebas de regresión; la escena selecciona explícitamente `opening` por defecto. El saldo normal 150 está en OPENING; el saldo de prueba avanzado por defecto conserva ECONOMY.initialCoins y el parámetro existente. El guardado avanzado ofrece continuar su propia sesión; nueva partida o reset DEV restaura el saldo de esa sesión/URL. Nunca lee ni sobrescribe la clave normal. El enlace de retorno a partida normal ofrece continuar su guardado.

La progresión avanzada conserva el disparador de llegada por movimiento como fixture de la base anterior; no se utiliza en la partida normal. El normal permite llevar hasta instalar su primera mesa y después utiliza 65/35. DEV conserva dos mesas concedidas; no equivalen a inversión.

## Límites y revisión

Sin abrir/cerrar por jornadas, narrativa familiar, recetas nuevas, colocación libre, renovación artística ni SDK. Traducciones es/en/id en `src/i18n/catalogs/`, claves opening.*, tutorial.*, session.* y save.*. Indonesio pendiente de revisión nativa. Revisar UX en teléfono físico; navegador móvil emulado no lo sustituye.
