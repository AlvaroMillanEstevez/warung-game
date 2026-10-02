# Verificación de la revisión funcional del hito 3

Fecha: 2026-10-02. Hitos 1 y 2 aprobados manualmente. Esta revisión sustituye las comprobaciones anteriores de una sola carga, bloqueo hasta salir, mostrador de cinco platos y descarte de alimentos. Queda pendiente que el usuario vuelva a probar el hito 3.

## Reglas y herramientas

- WSL Ubuntu 22.04, Node 24.18.0 y npm 11.16.0.
- Phaser 4.2.1, TypeScript 7.0.2 y Vite 8.3.2; sin dependencias nuevas.
- `npm test`: 24 pruebas correctas con node:test.
- `npm run typecheck`: correcto.
- `npm run build`: correcto; bundle JS de 1.417,56 kB / 371,18 kB gzip. Se mantiene el aviso de Vite para chunks mayores de 500 kB.
- `git diff --check`: correcto.
- Sin commits, push ni publicación.

## Cobertura de reglas

- Cuatro ingredientes con cuatro ciclos completos, sin salir. Lleno espera sin progreso.
- Cuatro posiciones cocinan en paralelo con relojes independientes; las listas ocupan capacidad hasta recoger.
- Prioridad de recogida seguida de carga; carga permitida con platos llenos si hay hueco e ingredientes.
- Cada ciclo fija su posición de hornillo: una ración que termina en otra posición no cambia la acción en curso.
- Capacidad independiente de ingredientes, platos y residuos; platos libres y pedidos comparten límite.
- Identidad y antigüedad de pedidos, recogida solo con cliente sentado, mesa correcta y rechazo de duplicados.
- Stock superior a cinco y reservas separadas; una ración reservada no se vende para llevar.
- Caja continua con todas las categorías llenas. Espera sin stock y reinicia un ciclo completo cuando aparece.
- Cabezas elegibles entre filas sin adelantar; las mesas asignadas no bloquean ventas para llevar.
- Reserva de mesa sucia, espera lateral, limpieza conservando cliente y recorrido al asiento.
- Un único punto alcanzable por mesa sirve y limpia. Residuos llenos bloquean solo limpiar.
- Papelera vacía residuos y conserva ingredientes, comida libre y pedidos.
- Movimiento, salida, invalidez, cambio de objetivo, foco y reinicio cancelan progreso; no se arrastra tiempo sobrante.
- Reinicio de inventarios, posiciones de cocina, existencias, reservas, clientes, pedidos, suciedad, dinero y relojes.
- Rutas libres entre destinos y velocidad de movimiento; límites de llegada y filas sin deuda.

## Navegador de escritorio

Edge/Chromium 154.0.4258.48, headless con Playwright disponible en el entorno. Sin errores de consola ni excepciones.

- Producción completa de cuatro raciones con teclado y permanencias reales: frigorífico → hornillo → depósito. No se recolocó al jugador ni se escribió su inventario para este recorrido.
- Cinco cobros consecutivos sin abandonar caja: dos reservas de mesa y tres ventas para llevar, llevando 4 ingredientes, 4 platos y 4 residuos. El tercer cliente para comer permaneció bloqueado por mesas asignadas, sin impedir ventas para llevar.
- Depósito continuo, stock por encima de cinco, recogida continua de dos pedidos, entrega a sus mesas y consumo.
- Papelera vacía cuatro residuos y conserva ingredientes; en otra visita conserva ambos pedidos pagados.
- Reserva de mesa sucia, limpieza con ingredientes, cliente conservado y desplazamiento hasta sentarse.
- Sin abandonar ese punto, la interacción inicia servicio cuando se dispone del plato correspondiente.
- Caja sin stock permanece con progreso cero. Agotar stock durante un ciclo lo cancela; reponerlo inicia una espera completa antes del cobro.
- Blur detiene tiempo de simulación y cocina. Reinicio DEV durante una permanencia elimina también comando y progreso.

Para escenarios concretos se prepararon intenciones, raciones adicionales y carga mediante operaciones del modelo. La prueba de limpiar y después servir sin moverse introdujo la recogida del pedido mediante el modelo una vez sentado el cliente; así se comprobó la reevaluación del punto sin contradecir la regla de que no se recoge antes de sentarse. El circuito normal de recogida en mostrador y entrega también se recorrió.

## Móvil emulado y revisión visual

Contexto táctil 390 × 844, con arrastre y eventos de contacto/liberación:

- Cuatro ingredientes y cuatro raciones producidas/depositadas mediante ciclos continuos.
- Caja sucesiva, recogida de pedido, servicio y posterior limpieza automática desde el mismo punto; residuos a papelera.
- Volver al origen detiene; segundo dedo ignorado y sin heredar control.
- Cancelar contacto detiene; redimensionar cancela entrada.
- Reinicio con toque en el botón, sin iniciar gesto de movimiento.
- Lienzo completo, ausencia de scroll, zoom uniforme y HUD/contexto/botón dentro de pantalla a 320 × 568, 390 × 844, 568 × 320 y 844 × 390.
- Se inspeccionaron capturas de carga 4/4/4, servicio/limpieza, pedido identificado y HUD móvil.

Sin errores de consola ni excepciones. Es emulación de Chromium, no prueba en dispositivo físico.

Evidencia local excluida de Git en `artifacts/revision-*`: scripts de escritorio y táctil, informes JSON y capturas. La evidencia `hito3-*` corresponde a la versión anterior y no valida las reglas nuevas.

## Pendiente y límites

- Revisión manual del usuario y teléfono/tableta físico; Safari/iOS, Firefox, hardware lento y sesiones prolongadas.
- Acceso LAN/WSL/firewall desde otro equipo no verificado en esta revisión.
- Arte y balance provisionales; personajes pueden cruzarse.
- El delta activo sigue limitado a 100 ms y no hay progreso offline.
- No se ha avanzado a empleados, mejoras, nuevas recetas, tutoriales o persistencia.

Recorrido manual actualizado en README.md, con la preparación para reservar una mesa sucia. El desarrollo se detiene tras esta revisión.
