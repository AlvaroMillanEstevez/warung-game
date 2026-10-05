# Verificación del experimento de cajero y encargos

Fecha: 2026-10-05. Base y localización aprobadas manualmente; esta ampliación queda pendiente de la revisión del usuario. Sin publicación ni push.

## Comprobaciones ejecutadas

- npm test: **77 pruebas correctas** en la ejecución final (67 de regresión y 10 nuevas de cajero/encargos).
- npm run typecheck: correcto.
- npm run build: correcto. JavaScript **1.492,04 kB / 393,37 kB gzip**; permanece el aviso del bundle de Phaser superior a 500 kB.
- git diff --check: correcto.
- Phaser 4.2.1, TypeScript estricto, Vite, npm y package-lock.json conservados, sin dependencias nuevas.
- No se usaron servicios externos durante el juego, assets descargados ni APIs de traducción.

## Reglas verificadas

- Cajero: requisito de primer cocinero, 150 monedas, gasto acumulado, débito único, máximo uno, profesión fija sin inventario ficticio.
- Jugador primero conserva la caja; cajero andando no la reclama; cajero primero no pierde progreso ante intentos del jugador. Una venta consume/cobra una sola vez.
- Rapidez capturada 800/600/400 ms, mejora en curso conserva duración y contrataciones nuevas heredan nivel. Apertura de paneles independiente a 1500 ms.
- Retirada y venta compiten por la última ración en ambos órdenes. Nunca doble plato ni stock negativo; cajero espera y reanuda tras reposición real.
- Primer cocinero desbloquea una oferta de 6, aviso consumido una vez, oferta sin caducidad, aceptación por ID una vez, siguientes cantidades 6/8/10 y espera de 45 s sin acumulación.
- Retirada de una unidad por ciclo, capacidad y límite pendiente menos carga; otras categorías independientes; no cobra.
- Empaquetado de comida cocinada: unidad por ciclo, comandos antiguos inválidos, sobrantes conservados, base/bonus una vez y sin sumar gasto ni recompensa de misión.
- Bonus cero conserva comida/encargo y permite entregar por base.
- Cancelar devuelve exactamente lo empaquetado una vez, conserva carga/saldo y objetivo pendiente.
- DEV borra cajero, reserva de caja, encargos, comida y objetivo. IDs anteriores permanecen inválidos.
- Navegación existente entre destinos con la nueva huella de empaquetado y separación de caja/depósito/retirada. Reglas de ambos cocineros, limpieza, mesas y filas conservadas.

## Navegador de escritorio y móvil emulado

Edge/Chromium headless con Playwright disponible en el entorno. **Recorrido final correcto, sin errores de consola/excepciones ni avisos de traducción ausente.** Capturas abiertas e inspeccionadas.

- Primer encargo completado con seis raciones producidas y recogidas mediante permanencias reales de la escena, sin inyectar comida. Empaquetado progresivo; pago de 90 una vez.
- Segundo encargo desde el mostrador compartido con ventas del cajero a cinco clientes, producción real y reposición del cocinero hasta el objetivo.
- Tercer encargo entregado fuera del plazo, solo base.
- Confirmación de cancelar/seguir; devolución exacta de dos empaquetados, conservando carga y saldo.
- Oficina, tablón, pausa por foco y pestaña oculta mantienen una instantánea de simulación idéntica (relojes, comida, dinero, clientes y tareas). Reanudar no acumula deuda.
- Tablón abre a 1,5 s; cerrar no reabre sin salir/volver. Teclado tras modal, entrada mantenida cancelada y toque de panel sin arrastrar al jugador.
- Arrastre táctil emulado mediante eventos de entrada del navegador: movimiento relativo y liberación del puntero.
- Cambio es/en/id no modifica instantánea de simulación. Rótulos Phaser, panel, HUD, contratación y mensajes se traducen.
- Reinicio con panel/encargo activo limpia estado y referencias.
- Indicador de Caja elevado 100 unidades visuales; zona física intacta, señal de suelo y rótulo por encima del personaje. Captura adicional con jugador/cajero en sus puestos: orders-mobile-checkout-selected.png.

El recorrido usa fondos y posiciones preparados para aislar interacciones y un reloj controlado. En el primer caso el cocinero desbloqueado se deja en espera solo como fixture para que las seis raciones procedan del jugador. Los casos posteriores usan empleados autónomos. Las permanencias, validaciones y transferencias son las del juego; no acredita una sesión de balance natural de principio a fin.

Ofertas en los tres idiomas y doce combinaciones: **390 × 844, 320 × 568, 844 × 390 y 568 × 320** px CSS. Diálogos dentro de pantalla sin desbordamiento horizontal; cierre fijo accesible al desplazar. Encargo activo, confirmación, HUD/mensajes y compra del cajero revisados en vertical; capturas de escritorio y horizontal adicionales. La vista general usa encuadre de documentación; las móviles conservan cámara normal.

## Idiomas y evidencia local

**176 claves por catálogo**, ampliando el sistema aprobado. La prueba de paridad de claves/parámetros está incluida en las 77 pruebas correctas de la ejecución final. Se conservan detección regional, preferencia guardada, respaldo inglés, formatos numéricos y tolerancia a almacenamiento bloqueado.

En artifacts/, ignorado por Git:

- orders-qa.cjs y orders-qa-results.json: recorrido final y resultados.
- orders-desktop-offer-es.png, orders-desktop-manual-packing.png, orders-desktop-cancel-es.png.
- orders-world-{es,en,id}.png: mundo, tablón, personal y progreso; estas vistas preceden al ajuste final de Caja. orders-mobile-checkout-selected.png recoge la posición final con progreso visible.
- orders-mobile-{390,320,844,568}-{es,en,id}-offer.png: ofertas por tamaño/idioma.
- orders-mobile-{es,en,id}-{active,confirm,hud,cashier}.png: estados y textos nuevos.
- i18n-* y visual-* corresponden a las entregas anteriores aprobadas, con sus propios recorridos y capturas.

No es un dispositivo táctil físico ni una prueba Safari/iOS, Firefox o de rendimiento prolongado. Valores de balance y utilidad de la actividad pendientes de revisión manual. Las nuevas frases indonesias quedan disponibles para una hablante nativa en [id.ts](../src/i18n/catalogs/id.ts). Recorrido de evaluación en [ENCARGOS.md](ENCARGOS.md).
