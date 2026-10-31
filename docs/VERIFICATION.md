# Progresión normal — 2026-10-21

Implementación local para revisión manual. Sin publicación ni push. La apertura y guardado anteriores están aprobados por el usuario.

## Resultado actual

- **124/124 pruebas correctas**, `npm run typecheck` y `npm run build` correctos; `git diff --check` sin errores. JS 1557,88 kB / 410,90 kB gzip, CSS 9,24 / 2,53 kB. Se conserva el aviso conocido de tamaño del bundle Phaser; sin dependencias nuevas.
- Ocho pruebas nuevas en `tests/progression.test.mjs`: apertura y ahorro con ventas reales hasta oficina/mesa/comensal/limpieza/papelera; compra conjunta segura frente a jugador/empleado/cliente; cocinero antes del comedor; bloqueo de encargos hasta instalación, preparación y cobro único con deuda; compras en distinto orden hasta seis mesas/dos hornillos/equipo completo; inversión/demanda/suministros/reset; migración explícita v1; avisos y estados inválidos; llegada futura de comensales sin cambiar intenciones, tareas, recursos ni reservas en curso.
- Recarga del modelo antes/después de oficina y zona, tras cada mesa/hornillo/contratación, con encargo listo y después de cobrar. El recorrido de apertura/comedor gana sus monedas; los casos de frontera/equipo completo usan una cartera de prueba explícita en la instantánea para no repetir ventas irrelevantes.
- Regresiones previas de producción, dos cocineros, limpieza con reservas, caja/cajero, economía física, suministro, demanda, encargos y controles conservadas. Catálogos: **276 claves** en cada idioma, mismos parámetros y traducciones no vacías.

## Navegador

Playwright externo con Edge/Chromium headless: escritorio **1200×850**, móvil emulado **390×844** y horizontal **844×390**. `artifacts/progression-seed.mjs` genera un guardado de formato anterior con 1000 monedas mediante apertura, suministros pagados, cocina y ventas reales en el modelo, sin concesión de dinero. La prueba de navegador importa ese guardado en un contexto aislado y continúa como **partida normal**, sin URL DEV.

`artifacts/progression-qa.cjs desktop/mobile`: movimientos mediante ratón o CDP táctil, permanencia real y botones DOM. Continuar v1 → cancelar/reabrir obra de oficina → confirmar dos veces el mismo botón sin doble compra → comprobar salida obligatoria antes de mejoras → idiomas es/en/id y tarjeta primera mesa/papelera → contratar cocinero sin mesas → construir conjunto de encargos → no apertura/aceptación automática → recargar → aceptar 4 → retirar/empaquetar → volver y cobrar 60 → primera mesa → limpieza y cajero → recargar. Ambos recorridos terminan con **590 en cartera, 470 invertidas, una mesa/papelera, tres empleados y primer encargo completado**, sin errores de consola ni claves ausentes.

Capturas revisadas de confirmación, ayuda de conjuntos, requisitos de limpieza, tarjeta de primera mesa y panel de entrega: textos completos en es/en/id, cierre accesible al desplazar móvil, sin recortes observados. Evidencias `artifacts/progression-{desktop,mobile}-*.png` y `progression-{desktop,mobile}-results.json`.

Reejecutado `artifacts/save-edge-qa.cjs`: almacenamiento bloqueado/cuota agotada mantienen juego y aviso, DEV no modifica el guardado normal, suspensión/reanudación sin tiempo acumulado y versión incompatible conservada hasta confirmar nueva partida. Todas correctas. La primera iteración del guion visual necesitó corregir un selector de prueba y reponer más ingredientes en el guardado de prueba; la ejecución final completa pasa en ambos tamaños.

## Pendiente de revisión

Validación manual del usuario, balance/claridad de objetivos, teléfono físico, otros navegadores y revisión nativa del indonesio. La emulación no acredita comodidad táctil real. Se mantienen las limitaciones documentadas de guardado local: tareas de empleados se replantean al cargar conservando posición/carga, sin progreso offline ni nube.

No hay desviaciones funcionales del hito. Decisiones de compatibilidad: claves de almacenamiento con sufijo `.v1` estables y contenido versionado a 2; DEV conserva las dos mesas concedidas y sus cuatro precios de ampliación originales. Precios, requisitos y recorrido manual desde el guardado anterior en [PROGRESSION.md](PROGRESSION.md).

Los registros siguientes son históricos y corresponden a sus propias versiones.

---

# Apertura guiada y guardado — 2026-10-21

Implementación pendiente de revisión manual. Sin publicación ni push.

## Resultado actual

- **116/116 pruebas correctas**; typecheck y build correctos. JS 1550,00 kB / 409,07 kB gzip, CSS 9,24 kB / 2,53 kB gzip. Permanece el aviso conocido de bundle Phaser. Sin dependencias nuevas ni assets externos.
- Nueva suite tests/opening-save.test.mjs: presupuesto exacto 150, cancelación sin cobro, compras únicas, ocupación de instalación, ausencia de clientes/acciones antes de habilitar, gasto separado, objetivo por acciones reales, primer cliente para llevar tras 2 s, primera venta y recogida, fiado reconocido.
- Recargas de modelo tras instalaciones, durante cocción, con bandeja/deuda y tras recogida. Conservación de tiempos/recursos y cobros únicos. Versiones/datos inválidos preservados, almacenamiento inaccesible/cuota, escrituras agrupadas y aislamiento entre claves normal/DEV.
- Escenario avanzado: restauración de cargas de empleados sin reservas/tareas inválidas, cocina, filas, ventas cobradas, clientes de comedor caminando/comiendo/saliendo y encargo listo; no se duplica recompensa al volver a reclamar. Regresiones anteriores de economía, demanda, empleados y localización incluidas.

## Navegador

Edge/Chromium headless con Playwright externo, escritorio 1200×850 y móvil emulado 390×844. Recorrido normal sin URL DEV, sin inyectar dinero/comida/posición/relojes: introducción → cancelar/reabrir reforma → cuatro compras → suministro → recoger/cocinar/depositar → apertura → venta → recoger efectivo. Ambos recorridos terminan con cartera 10, bandeja 0 y objetivo completado, sin errores de consola.

Recargas reales tras reforma, durante cocción y con 10 en bandeja; continúan sin repetir compras ni duplicar ingresos. Cancelar nueva partida mantiene datos; confirmar restaura 150 y local deteriorado. Móvil cambia a 844×390 y vuelve sin perder objetivo ni recursos. Capturas y resultados locales: artifacts/opening-{desktop,mobile}-*.

Pruebas adicionales en navegador: getter de almacenamiento bloqueado y cuota agotada mantienen juego con aviso; versión incompatible permanece intacta al cancelar y solo se reemplaza tras confirmar. Guardado normal pausado no cambia al entrar al DEV; retorno ofrece continuar normal. Congelación/reanudación mediante CDP Page.setWebLifecycleState sin recuperación de tiempo transcurrido. Ajustes es/en/id con reloj pausado y textos revisados. Evidencias artifacts/opening-save-edge-results.json y opening-storage-*/opening-settings-*.

No es una prueba de teléfono físico. Pendientes balance/claridad de tutorial con el usuario, revisión nativa del indonesio y otros navegadores. Las tareas de empleado en curso se replantean al cargar conservando carga; su progreso de permanencia no se conserva. Una interrupción abrupta puede perder hasta el último intervalo periódico de 5 s; no hay progreso offline ni nube. Guía y recorrido en [OPENING_AND_SAVE.md](OPENING_AND_SAVE.md).

Los registros siguientes son históricos y describen sus propias versiones.

---

# Ajuste de suministro y demanda — 2026-10-21

Economía anterior aprobada manualmente. Ajuste actual pendiente de revisión del usuario. Sin publicación ni push.

- **109/109 pruebas correctas**, typecheck y build correctos; git diff --check correcto. Bundle JS 1517,42 kB / 400,01 kB gzip; se conserva el aviso conocido de tamaño de Phaser.
- Nuevas pruebas en tests/large-supply.test.mjs: cálculo real 410 con dos mesas iniciales, frontera 499/500, desbloqueo por otras compras, aviso único/rearmado, compra aditiva 50/-150, tres pequeños +30 y 20+50=70, deuda pendiente conservada, rechazo con 149 aunque haya dinero en bandeja, cotización consumida rechazada y compras nuevas admitidas, reset y saldo inicial sin desbloqueo.
- Regresiones de demanda actualizadas: 999/1000, ×2 desde 500 y ×2,4 desde 1000, intervalo completo al cambiar, primera llegada preservada y sin reinicios por suministros ni compras dentro del mismo tramo.
- Catálogos es/en/id con 222 claves y paridad de parámetros; proveedor usa cantidades/precios parametrizados.
- Edge/Chromium headless, escritorio 1200×850 y móvil emulado 390×844: proveedor bloqueado con saldo URL 2000, compras reales en oficina hasta gasto 500, desbloqueo, fiado, tres pequeños consecutivos y dos grandes consecutivos, deuda 33 conservada y gasto 500 sin cambios. Repetir el botón anterior tras procesarlo no duplica la compra. Reset vuelve a bloquear.
- Capturas de panel bloqueado/desbloqueado es/en/id y resultados en artifacts/large-supply-*. Sin errores de consola. Revisión visual de cierre y textos sin recortes. Emulación, no teléfono físico; traducción nativa y balance manual pendientes.

Recorrido manual y tabla definitiva en [ECONOMY.md](ECONOMY.md). Los registros siguientes son históricos y reflejan los umbrales vigentes en sus respectivas entregas.

---

# Verificación de economía física

Fecha: 2026-10-20. Implementación pendiente de revisión manual. Sin publicación ni push.

## Reglas y compilación

- npm test: **104/104 correctas**. Nuevas pruebas en tests/economy.test.mjs.
- npm run build incluye typecheck; ambos correctos. Se conserva el aviso de bundle Phaser mayor de 500 kB; sin dependencias nuevas.
- Cubiertos: último ingrediente disputado, cancelación/liberación, insuficiencia de saldo, segundo fiado, cotización obsoleta, compras deliberadas sucesivas, devolución exacta/último pago parcial, venta y recogida en ambos órdenes, inventarios llenos, encargos con/sin bonus y deuda, conservación de comida, demanda independiente, avisos y reset.
- Recuperación desde cero mediante fiado comprobada en reglas; siete ventas dejan deuda 0 y efectivo 37. La recogida y compra al contado dejan cartera 7.
- Dos cocineros agotan stock, terminan tareas, esperan y reanudan al reponer. Se conserva objetivo 12, tandas, capacidad 8 y regresiones anteriores.
- Catálogos es/en/id: mismas claves y parámetros; revisión nativa del indonesio pendiente.

## Navegador de esta fase

Edge/Chromium headless mediante Playwright externo al proyecto. Controles reales de arrastre/puntero en escritorio 1200×850 y eventos táctiles en móvil emulado 390×844; cámara normal, sin inyectar recursos, posiciones ni relojes.

Circuito normal completado en ambos: inicio 30 → proveedor y compra de 10 → frigorífico → cocinar → depositar → vender → comprobar cartera sin incremento → recoger bandeja → reponer al contado → reset. Panel es/en/id y pausa comprobados; cerrar no reabre sin salir. Sin errores de consola. Capturas economy-{desktop,mobile}-normal-* y resultados JSON en artifacts/ (material local de verificación).

Se revisaron visualmente paneles completos en los tres idiomas, cierre, importe de bandeja y frigorífico. El contador del frigorífico se elevó dentro de la puerta para evitar oclusión por el jugador durante recogida.

Con equipo contratado por botones (dos cocineros, segundo hornillo, limpieza y cajero), el recorrido de escritorio verificó: fiado de 10, deuda 33, siete ventas → deuda 0/bandeja 37, diez ventas → bandeja 67, frigorífico vacío, cocineros sin cargas/tareas/rutas/reservas inútiles, recogida completa, compra al contado y reanudación automática. DEV restauró el saldo de fixture 2000 y stock/bandeja/deuda 0. Sin errores de consola. Evidencias economy-desktop-team-* y economy-desktop-team-results.json. El punto de observación se dejó fuera de interacciones para no recoger efectivo durante la prueba.

Build final: JS 1515,92 kB / 399,64 kB gzip; CSS 8,31 kB / 2,32 gzip. git diff --check correcto.

No es una prueba en teléfono físico ni acredita comodidad táctil. Pendiente revisión del usuario de balance, traducción indonesia, otros navegadores y dispositivos reales. Recorridos manuales en [ECONOMY.md](ECONOMY.md).

---

# Registro histórico de la entrega anterior

Las comprobaciones siguientes pertenecen a la base anterior al proveedor; sus importes y rutas no describen el inicio económico actual.

# Verificación de progresión, producción y textos

Fecha: 2026-10-12. Distribución y flujo de entrega aprobados manualmente; esta revisión queda pendiente del usuario. Sin publicación ni push.

## Comprobaciones ejecutadas

- npm test: **90/90 pruebas correctas**.
- npm run typecheck: correcto.
- npm run build: correcto. JavaScript **1.499,50 kB / 395,42 kB gzip**. Permanece el aviso conocido de bundle mayor de 500 kB.
- git diff --check: correcto.
- Phaser 4.2.1, TypeScript estricto, Vite, npm y package-lock.json conservados. Sin dependencias nuevas, assets externos ni servicios durante el juego.

## Reglas y regresión

- Encargos completados: 4, 6, 9 y después 6/9 sin repetición consecutiva. La cancelación introductoria no salta el paso; DEV vuelve al primero, conservando IDs únicos.
- Primera oferta: 40 base + 20 de bonus; después 60 + 30 y 90 + 45. Plazo de 90 s activos y espera de 45 s sin cambios. El empaquetado fija el premio y solo el cobro en tablón abona una vez.
- Preparar 4/6/9 funciona con capacidad 8. Se alternan retirada real y empaquetado con ciclos separados, conservando ingredientes, residuos y sobrantes. Ventas/retiradas no duplican stock.
- Cocinero espera las raciones que siguen cocinándose aunque ya haya recogido la primera. Una vez en mostrador descarga todo aunque aparezca otra ración lista.
- Dos cocineros con consumo continuo durante 180 s mantienen su hornillo asignado y varias tandas de al menos tres platos; objetivo de tanda 4. La prueba de consumo inmediato aísla producción de los trayectos de clientes.
- Producción comprometida no supera 12; siguen válidas entregas parciales cerca del objetivo, reanudación, cancelación de reservas y cooperación manual.
- Capacidad bloqueada en reglas y tarjeta ausente de la UI. Capacidad fija 8 para jugador, empleados y futuras contrataciones.
- Cuarto tramo: umbrales 1299/1300, gasto correcto 1340 del equipo descrito, frecuencia 2,4 e intervalo 8000/2,4 ms. Aviso único, siguiente intervalo completo, compras fallidas sin efecto y reinicio al tramo inicial.
- Continúan las regresiones de demanda 65/35, primer movimiento, filas 20/10, límite global 48, navegación, caja compartida, inventarios, pausas y controles.
- Paridad de claves y parámetros es/en/id. Nueva prueba específica de las claves de entrega/recompensa/cobro: traducciones resueltas sin claves crudas ni parámetros pendientes.
- Mock local por ?monedas: validación, exclusión en producción, sin gasto/desbloqueos/persistencia y saldo restaurado por DEV.

## Navegador: escritorio y móvil emulado

Edge/Chromium headless con Playwright disponible, sin añadir dependencia al proyecto. Pantallas **1200 × 850** y **390 × 844** CSS. Recorridos completos sin errores de consola ni excepciones.

1. Inicio con ?monedas=600: saldo 600, gasto 0 y encargos bloqueados. Movimiento real hacia papelera, tablón y oficina.
2. Compras por botones: cocinero 100, limpieza 80, hornillo 180 y mesas 80 + 140. Saldo 20, gasto 580, capacidad 8. La tarjeta de capacidad no existe.
3. Tablón abierto por permanencia. Aceptación, paseo a Preparar encargo y espera de producción/depósito reales.
4. Encargo 4/4, saldo todavía 20, pago fijado en 60 y objetivo sin completar. HUD y tablón señalan entrega pendiente.
5. Oficina y entrega en es/en/id; no aparecen bulk.* ni status.disabled. Cambiar idioma con panel abierto conserva reloj, encargo, stock y dinero.
6. Regreso físico y botón Entregar y cobrar: saldo 80, objetivo cumplido y espera. Sin cobro duplicado.
7. En escritorio se esperan los 45 s activos y se completan también las ofertas de 6 y 9, con comida real y cobro por interfaz.
8. DEV reinicia mediante su botón: saldo 600, gasto 0, clientes/empleados vacíos, encargo bloqueado y señales retiradas.

Capturas de entrega es/en/id abiertas e inspeccionadas: textos completos, botones legibles y sin recortes en móvil. Oficina mantiene cierre visible y lista desplazable; capacidad ausente.

El arnés lee rutas/obstáculos para mover con ratón o eventos táctiles reales del navegador. No altera posiciones, zoom, cámara, comida, dinero ni reloj; fondos iniciales solo por el parámetro autorizado. Cambios de idioma del tablón mediante la API pública mientras el panel abierto mantiene la pausa.

## Equipo avanzado y actualización local

Recorrido adicional en escritorio con ?monedas=2000, compras reales por 1490 (incluido cajero), cuatro mesas, dos hornillos, dos cocineros, limpieza y las dos mejoras de rapidez/cocción. Frecuencia observada 2,4 y capacidad 8. Durante unos dos minutos activos ambos hicieron tandas de cuatro y tres, además de entregas menores al acercarse al límite; producción comprometida máxima 12 y ningún acceso al hornillo del otro. Sin errores de consola. La captura advanced-desktop.png usa cámara normal.

Prueba de vigilancia Windows/WSL: se añadió temporalmente un comentario al catálogo español desde Windows, Vite detectó el cambio y recargó la página; el módulo HTTP contenía el comentario y los textos actuales. Se restauraron exactamente los bytes originales y se verificó una segunda recarga, con textos de entrega resueltos en los tres idiomas. No se cambió ninguna traducción durante esta prueba.

## Evidencia e idiomas

En artifacts/ (ignorado por Git):

- revision-qa.cjs, revision-{desktop,mobile}-results.json.
- revision-{desktop,mobile}-claim-{es,en,id}.png, capacity-{es,en,id}.png y capturas de preparación/cobro/reinicio.
- revision-desktop-offer-6.png y revision-desktop-offer-9.png.
- advanced-qa.cjs, advanced-results.json y advanced-desktop.png.
- watch-qa.cjs y watch-results.json: actualización Windows/WSL y restauración del catálogo.
- cook-batch-probe.mjs: simulación reproducible de diez minutos. before/after cambian también demanda; no atribuir toda diferencia a la planificación de cocineros.

**188 claves por catálogo**, con paridad de claves, parámetros y texto comprobada. Catálogos en src/i18n/catalogs/{es,en,id}.ts; revisión nativa en [id.ts](../src/i18n/catalogs/id.ts). Los textos de entrega ya estaban en los archivos al investigar las capturas del usuario; una versión antigua en navegador/servidor es una explicación compatible, no un diagnóstico histórico demostrado. Se reinició Vite con vigilancia por sondeo en WSL para detectar ediciones desde Windows.

workflow-*, discovery-*, orders-*, i18n-* y visual-* pertenecen a revisiones anteriores. Algunas capturas revision-* de octubre 2 también son históricas: esta comprobación usa los archivos enumerados con fecha octubre 12.

## Pendientes y límites

Revisión manual de progresión, tandas y demanda avanzada; teléfono físico y revisión nativa del indonesio. Sin pruebas en Safari/iOS o Firefox ni estudio prolongado de rendimiento. Una cola puede vaciarse; el nuevo tramo aumenta demanda, no garantiza ocupación constante ni mejora de retención.

No se publica ninguna versión. Guía y enlaces locales en [ENCARGOS.md](ENCARGOS.md).
