# Verificación: autoservicio, carga y movimiento

Fecha: 2026-10-03. Los hitos 1 y 2 y la revisión anterior de inventario/ciclos están aprobados manualmente. Este informe corresponde al autoservicio y movimiento; sustituye las expectativas anteriores de reparto y espera junto a la mesa.

## Herramientas y resultados

- WSL Ubuntu 22.04, Node 24.18.0, npm 11.16.0.
- Phaser 4.2.1, TypeScript 7.0.2 y Vite 8.3.2. Sin dependencias nuevas ni cambios de lockfile.
- `npm test`: **23 pruebas correctas**, con node:test.
- `npm run typecheck`: correcto, también dentro de la compilación final.
- `npm run build`: correcto. JS: 1.416,94 kB / 371,13 kB gzip. Se conserva el aviso de Vite por superar 500 kB.
- `git diff --check`: correcto.
- Sin publicación ni push.

## Reglas comprobadas

1. Venta atómica: una ración menos y un cobro por cliente; repetir comando no duplica transferencia ni dinero.
2. Selección de la cabeza elegible más antigua entre filas, sin adelantar. Falta de mesas no bloquea llevar.
3. Mesa limpia: el cliente sale de caja con plato y empieza a comer únicamente al alcanzar su asiento.
4. Dos mesas sucias: dos reservas distintas y dos puntos diferentes junto a caja. Clientes conservan plato y no consumen durante espera.
5. Limpiar conserva la reserva y activa únicamente el cliente correspondiente. Si iba hacia su punto de espera, cambia ruta desde su posición actual, sin teletransporte.
6. Comer termina una sola vez, deja suciedad, libera mesa y permite la salida física.
7. Inventario independiente 4/4/4; sin platos vinculados del jugador, reparto ni stock pagado reservado.
8. Limpieza con ingredientes/platos, bloqueo solo al llenarse residuos y papelera exclusiva para residuos.
9. Producción continua, cuatro posiciones con tiempos propios, prioridad de recogida y mostrador sin límite.
10. Reinicio desde camino a espera, espera, camino a mesa, comida y salida; borra platos de clientes, reservas, órdenes, inventario y relojes. Comandos antiguos no vuelven a ser válidos.
11. Rutas entre destinos explícitos, incluidos los nuevos puntos junto a caja, sin atravesar muebles y respetando velocidad.
12. Arrastre: zona muerta, curva progresiva, vector limitado, sin acumulación ni aceleración diagonal; desplazamiento equivalente a 20, 30, 60 y 120 FPS.
13. Margen exterior calculado para contener la vista desde todas las esquinas, incluyendo relaciones de aspecto extremas.

## Navegador de escritorio

Edge/Chromium 154.0.4258.48, headless mediante Playwright local. Sin errores de consola ni excepciones.

- Producción completa de cuatro raciones con teclado y permanencias reales, desde frigorífico hasta depósito.
- Comprobación de +1 al recoger y −1 al depositar.
- Dos clientes recibieron plato en caja, caminaron a mesas limpias, comieron y dejaron suciedad.
- Después, dos clientes reservaron esas mesas sucias y esperaron con plato junto a caja; dos ventas para llevar continuaron. Se comprobaron stock, dinero y ausencia de cobros repetidos.
- Limpieza con ingredientes y un plato transportados: solo el cliente de esa mesa comenzó su recorrido y comió al llegar.
- Papelera vació residuos y conservó alimentos.
- Cámara centrada directamente en las cuatro esquinas transitables, sin límites del restaurante ni cambio de proporciones.
- Extensión exterior contenía toda la vista a 1440 × 1000, 390 × 844, 844 × 390, 320 × 568, 568 × 320 y 2560 × 1080, sin scroll.
- Reinicio eliminó clientes esperando, sus platos, reservas, temporizadores y feedback.

El recorrido de producción y las interacciones se realizaron con controles reales. Para reproducir escenarios concretos se fijaron intenciones y se prepararon raciones/carga adicionales mediante operaciones del modelo. Las posiciones de esquina se fijaron como escenarios de cámara, sin confundirlo con navegación manual.

## Control táctil emulado

Contexto táctil a 390 × 844, con eventos de contacto, arrastre, liberación y cancelación:

- Mantener un desplazamiento de 60 px sin nuevos eventos conservó origen y vector mientras cambió el scroll de cámara.
- La magnitud medida fue 0,6979536; distancia recorrida concordó con 185 × magnitud × tiempo activo.
- Soltar puso el vector a cero inmediatamente y no hubo desplazamiento posterior.
- Ruido dentro de zona muerta no movió al jugador.
- Segundo dedo ignorado, sin heredar control al soltar el primero.
- Cancelación, pérdida de foco y cambio de orientación eliminaron movimiento residual.
- Recorrido táctil de caja con dos reservas sucias y una venta para llevar; limpieza de ambas mesas y comida automática.
- HUD anclado y contenido en 320 × 568, 390 × 844, 568 × 320 y 844 × 390.
- Sin errores de consola ni excepciones.

La preparación de mesas sucias en esta prueba se hizo mediante ventas, movimiento y consumo del modelo. Caja y limpieza posteriores usaron arrastre y permanencia del juego.

### Hallazgo sobre el arrastre

No se confirmó un error de coordenadas ni acumulación: la implementación anterior ya usaba origen fijo y clientX/clientY, independientemente de la cámara. Sí había seguimiento de cámara con retraso (0,12) y una respuesta que alcanzaba máximo a 58 px.

Se aplica seguimiento directo, recorrido de 76 px, zona muerta explícita de 12 px y curva de exponente 1,25. Esto ofrece más recorrido para regular velocidad y conserva la parada inmediata. Son parámetros de prueba; la comodidad no queda demostrada por estas comprobaciones y requiere evaluación del usuario en dispositivo físico.

## Revisión visual final

Se inspeccionaron las pilas de 1, 2, 3 y 4 ingredientes/residuos, así como carga mixta completa en las cuatro direcciones. Se corrigió una ocultación de los ingredientes al mirar hacia arriba: la bandeja queda al lado del cuerpo y el texto de transferencia por encima, sin tapar cara o puntos de acción.

Se revisaron capturas de clientes esperando junto a caja con plato, limpieza, esquinas con césped/acera/calle y cámara centrada. Tras el ajuste de carga se verificaron de nuevo retrato 390 × 844, horizontal 568 × 320, feedback y reinicio, sin errores de consola. Las pruebas y build finales se ejecutaron después de ese ajuste.

Evidencia local excluida de Git:
- `artifacts/selfservice-desktop.cjs`, `selfservice-mobile.cjs`, `selfservice-visual.cjs`.
- Informes `selfservice-desktop-results.json`, `selfservice-mobile-results.json`, `selfservice-visual-results.json`.
- Capturas `selfservice-*`; para carga usar las capturas finales `selfservice-cargo-final-*`.
- Las evidencias `revision-*` y `hito3-*` corresponden a diseños anteriores.

## Pendiente y límites

- Valoración manual de autoservicio, carga y sensaciones del movimiento.
- Teléfono/tableta físico, Safari/iOS, Firefox, dispositivos lentos y sesiones prolongadas.
- La emulación no acredita comodidad táctil, muescas o barras dinámicas de un dispositivo real.
- Arte y balance provisionales; personajes pueden cruzarse.
- Delta máximo de 100 ms: por debajo de 10 FPS el juego avanza más despacio; sin progreso offline.
- Sin empleados, mejoras, nuevas recetas, tutoriales ni persistencia. El futuro camarero se limita a limpieza y residuos.

El recorrido manual está actualizado en README.md. Detener el desarrollo tras esta revisión para que el usuario pruebe.
