# Verificación de la revisión de experiencia y balance

Fecha: 2026-10-03. Los hitos 1–4 están aprobados manualmente. Esta revisión queda pendiente de la revisión jugable del usuario.

## Entorno y comprobaciones

- WSL Ubuntu 22.04, Node 24.18.0, npm 11.16.0.
- Phaser 4.2.1, TypeScript estricto 7.0.2 y Vite 8.3.2. Sin dependencias nuevas ni cambios del lockfile.
- `npm test`: **43 pruebas correctas**, con node:test.
- `npm run typecheck`: correcto, ejecutado también dentro del build.
- `npm run build`: correcto; JavaScript 1.437,94 kB / 377,41 kB gzip. Sigue el aviso del bundle de Phaser superior a 500 kB.
- `git diff --check`: correcto.
- Sin publicación, push ni persistencia.

## Reglas cubiertas

Se conservan pruebas de producción, permanencia continua, controles, cámara, transferencias atómicas, autoservicio, asignación/limpieza independientes y cooperación. La revisión comprueba:

1. Capacidades globales 8/12/16 para empleados presentes y posteriores, sin añadir categorías inaplicables.
2. Lotes de ingredientes según capacidad y necesidad; depósitos y eliminación de residuos parciales, objetivo de stock 12.
3. Duración capturada al empezar a actuar; una mejora no completa tareas iniciadas ni cambia desplazamiento, consumo o cocción.
4. Gasto acumulado por compras correctas, cruce 240 → 320, activación única, exclusión de fallos/ingresos/saldo y ausencia de llegada inmediata.
5. Intención 70/30 decidida una vez; omisión sin desvío ni deuda cuando se llena la fila elegida o el límite global.
6. Treinta plazas distintas, separadas y accesibles; recorridos sobre huellas actuales/futuras, tramo exterior solo para clientes.
7. Pedidos para llevar atendibles con todas las mesas asignadas y ambas filas largas.
8. Seguridad de compra de mesas, acceso a todos los destinos, recálculo desde posiciones actuales sin teletransporte ni pérdida de tareas/reservas. Un cliente que ya sale por su carril no retrocede al recalcular.
9. Umbral individual de comentarios, participación, comprobación por intervalos, duración, máximo dos, visibilidad, enfriamiento y retirada al cobrar.
10. Reinicio de gasto, demanda, comentarios, capacidades, tiempos, empleados, reservas, producción y mesas.

Dinero y estados concretos se preparan como fixtures para aislar casos. El juego normal conserva saldo inicial cero y precio de venta 10; no hay control de dinero gratis.

## Navegador de escritorio

Edge/Chromium headless mediante Playwright ya instalado en el entorno; no se añadió al proyecto. Servidor Vite local. Sin errores de consola ni excepciones en las ejecuciones correctas.

- Movimiento con teclado hasta frigorífico y caja; recogida continua y feedback de carga.
- HUD reducido a dos botones, DEV oculto, apertura mediante F2 y reinicio completo.
- Compras desde el panel: mejoras globales, una notificación al superar el umbral, capacidad 16 para cada categoría aplicable.
- Panel abierto congela reloj, clientes y personal; cancela entradas y progreso del jugador.
- Simulación de 600 s activos con personal, cuatro mesas y demanda aumentada, avanzando la escena en pasos de 50 ms. El circuito mantiene ventas y limpieza sin atravesar muebles.
- Escenario preparado con cuatro clientes comiendo, filas de 20/10 y treinta posiciones distintas. Clientes recorren sus rutas hasta los destinos.
- Inspección de torres 10/7/5 y máximos: jugador 16/16/16, cocinero 16/16, limpieza 16. Instrumentación de llamadas Graphics confirma el número de piezas; una actualización sin cambios no redibuja. Profundidad por pies.
- Capturas revisadas de panel, distribución, filas exteriores y cargas máximas.

La simulación acelerada no equivale a diez minutos de rendimiento sostenido a tiempo real. El escenario de máxima ocupación prepara inventarios, pedidos y tiempos específicos. La captura de conjunto usa cámara de prueba alejada para abarcar las treinta plazas; la cámara normal sigue centrada en el jugador.

## Móvil emulado

Contexto con eventos táctiles a 390 × 844; revisión adicional en 320 × 568, 844 × 390 y 568 × 320.

- Arrastre relativo, cancelación de contacto capturado al abrir panel y ausencia de movimiento residual. En ese caso se abre por DOM para mantener el contacto durante la comprobación.
- Compras mediante taps; personal contratado después de transporte hereda capacidad 16.
- HUD con dinero y Mejoras dentro de pantalla, objetivos de al menos 44 px, panel con scroll interior sin desbordamiento horizontal y última compra/cierre accesibles.
- Cargas máximas visibles al lado del cuerpo en vertical y horizontal.
- Dos comentarios visibles como máximo; desaparecen al mover la cámara fuera de sus clientes. Se prepara participación/espera para reproducir el escenario.
- Pérdida de foco congela relojes; al recuperar foco se descarta un delta simulado de diez minutos sin nuevas llegadas.
- Mantener dinero abre DEV; reinicio táctil elimina clientes, comentarios, personal, gasto, demanda aumentada y mesas compradas.
- Sin errores de consola ni excepciones.

La emulación no demuestra comodidad en un teléfono físico. No se ha certificado Safari/iOS, Firefox, dispositivos lentos ni sesiones de varias horas.

## Evidencia y pendientes

Evidencia local en `artifacts/`, excluida de Git:

- `experience-desktop.cjs` y `experience-desktop-results.json`.
- `experience-mobile.cjs` y `experience-mobile-results.json`.
- Capturas `experience-*.png` de interfaz, cargas, comentarios, mesas y filas.
- Los archivos `hito4-*`, `selfservice-*`, `revision-*` y `hito3-*` documentan entregas anteriores.

Pendientes: revisión manual del recorrido en README, balance económico y sensaciones táctiles en dispositivo físico. Valores provisionales: demanda 70/30, intervalo 8 → 5,33 s al gastar 300, filas 20/10 y límite global 48. Se conserva el límite de delta activo de 100 ms y la ausencia de progreso offline.

**Detener el desarrollo tras esta revisión**, antes de ampliar el siguiente hito. El recorrido manual de demanda y mejoras globales está en [README.md](../README.md).
