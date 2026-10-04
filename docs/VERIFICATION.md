# Verificación de oficina, demanda y dos cocineros

Fecha: 2026-10-04. Los hitos 1–4, la revisión de experiencia y el cierre anterior del local están aprobados manualmente. Estos nuevos ajustes quedan pendientes de revisión jugable.

## Comprobaciones ejecutadas

- npm test: **62 pruebas correctas**, node:test, sin framework adicional.
- npm run typecheck: correcto.
- npm run build: correcto. JavaScript **1.442,66 kB / 378,95 kB gzip**; continúa el aviso del bundle de Phaser superior a 500 kB.
- git diff --check: correcto.
- Phaser 4.2.1, TypeScript estricto, Vite, npm y lockfile conservados; ninguna dependencia nueva.
- Sin publicación ni push.

## Reglas

Las pruebas anteriores conservan permanencia, inventarios, transferencias atómicas, filas, mesas, limpieza, mejoras, comentarios y navegación. Las revisadas/nuevas cubren:

1. Espera sin movimiento, desplazamiento efectivo, demora única de 8 s, ausencia de reinicio al moverse otra vez, depósitos irrelevantes y reinicio DEV. La cocina autónoma puede completar 12 sin activar llegadas.
2. Frecuencias absolutas 0,8 / 1,2 / 1,5; intervalos 10.000 / 6.666,67 / 5.333,33 ms; límites de gasto 299/300/599/600, gasto solo por compras correctas, aviso consumible único y tramo final directo.
3. Cambio de tramo conserva el reloj del primero; después programa un intervalo completo sin deuda ni ráfaga. Filas llenas no desvían intención.
4. Segundo cocinero por 220, primero por 100, requisito de primer cocinero y segundo hornillo operativo; un nivel sin hornillo real no basta. Máximo dos, descuento único y «Equipo completo».
5. Capacidad y rapidez globales heredadas antes/después de contratar; profesiones e inventarios independientes. Asignación fija con dos y acceso a ambos con uno.
6. Contratar el segundo conserva posición, libera tareas del primero incompatibles con su nueva asignación y no teletransporta.
7. Objetivo conjunto 12: stock, platos de ambos, cocinando/listos y cargas reservadas sin duplicación. Reserva durante el viaje; competencia por la última capacidad; revalidación ante producción manual.
8. Cancelar, invalidar, ruta imposible o reset liberan capacidad y recursos. Ventas permiten reanudar sin reservas huérfanas.
9. Dos cocineros producen simultáneamente, usan solo su hornillo, caminan a velocidad configurada, depositan lotes parciales y vuelven a trabajar tras ventas con seis mesas.
10. Jugador colabora en ambos, no toma recursos reservados y puede superar 12; los cocineros terminan lo ya producido.
11. Oficina sin mueble/huella antigua, alfombra accesible, zonas sin solapamientos y rutas a todas las estaciones.
12. Zoom exactamente 0,85 del cálculo anterior, exterior suficiente en esquinas y arrastre CSS independiente del encuadre.

Fondos y estados específicos se preparan en tests; no existe dinero gratis en la interfaz.

## Navegador de escritorio

Edge/Chromium headless con Playwright ya disponible en el entorno, sin instalar dependencias. Viewport 1440 × 1000. Sin errores de consola ni excepciones.

- Espera y teclado contra la pared no activan llegadas.
- Recorrido real con teclado desde inicio a alfombra de oficina; apertura por permanencia antes del primer cliente. Pausa de la cuenta inicial, conservada durante compras que cruzan ambos tramos.
- Una tarjeta para contratar; requisito visible antes de comprar otro hornillo, segunda contratación habilitada después, «Equipo completo» al llegar a dos.
- Primer cliente llega sin stock preparado. Cerrar oficina no la reabre; salir y regresar sí.
- Compra por interfaz de dos cocineros, limpieza, mejoras, dos hornillos y seis mesas.
- Con jugador atendiendo caja y equipo completo se avanzaron **600 s activos en pasos de 50 ms**: **112 ventas, 82 limpiezas, 61 depósitos de cada cocinero**. Se observaron cocciones simultáneas y asignaciones correctas; producción comprometida máxima **12**, sin atravesar mobiliario.
- Reinicio con F2 elimina empleados y vistas, asignaciones, reservas, gasto y activación; restaura un hornillo y oficina disponible.
- Capturas inspeccionadas: puerta/alfombra integradas y legibles, dos cocineros visibles y cámara más alejada. Zoom de juego calculado, sin reducirlo adicionalmente para las capturas.

Los 600 s son simulación controlada, no diez minutos de rendimiento sostenido en tiempo real. Compras avanzadas usan fondos preparados; se preparan algunas posiciones para aislar pruebas.

## Móvil emulado

Edge/Chromium con eventos táctiles. Inicio a 390 × 844; comprobación adicional a 320 × 568, 844 × 390 y 568 × 320.

- Recorrido por arrastre hasta oficina; contacto quieto se cancela al abrir. Compras mediante taps, mejoras antes de contratar y capacidad 16 heredada por ambos.
- Pausa de cuenta inicial durante compras; cerrar permanece cerrado y no deja movimiento residual.
- Mismo gesto de **40 píxeles CSS** probado con zoom 1 / 2 / 0,85: vector idéntico x=0,3558136, y=0.
- Handler de visibilidad y protección de la escena: cuenta inicial congelada en 3000 ms con pestaña oculta simulada; volver descarta delta grande, sin cliente anticipado ni puntero retenido.
- Dos cocineros, dos hornillos y seis mesas en las cuatro resoluciones. Zoom 1,294946 en 390 × 844 y 0,9775 en las otras tres; tamaños del HUD/panel independientes.
- Diálogos dentro de viewport, sin desbordamiento horizontal; última compra y cierre accesibles mediante scroll. Objetivo táctil de dinero de al menos 44 px.
- Pulsación prolongada de dinero abre DEV; reinicio táctil borra segundo cocinero y vistas, reservas, gasto, activación y bloqueo de oficina.
- Capturas de mundo, oficina y panel revisadas visualmente.

## Exterior y evidencia

Se verificaron en navegador las cuatro esquinas transitables para 1440 × 1000 y los cuatro tamaños móviles: **20 encuadres contenidos en el exterior decorativo**. Capturas de esquina revisadas; el margen se recalcula con el zoom nuevo.

Evidencia local ignorada por Git en artifacts/:

- team-revision.cjs y team-revision-results.json.
- team-corners.cjs y team-corners-results.json.
- team-*.png: oficina, ambos cocineros, paneles y encuadres.
- local-* y experience-* corresponden a versiones anteriores y no describen las reglas actuales.

README, diseño, roadmap y AGENTS actualizados, retirando el arranque por depósito.

## Límites pendientes

Revisión humana del ritmo económico y sensaciones de control, teléfono físico y sesiones prolongadas. Emular móvil no acredita comodidad táctil real. Sin certificación Safari/iOS, Firefox ni dispositivos lentos. Los personajes pueden cruzarse; delta máximo 100 ms, sin progreso offline ni persistencia.

Recorrido manual en [README.md](../README.md), incluido observar amarillo en hornillo izquierdo y coral en derecho, vender varias raciones y comprobar que ambos reanudan. Detener aquí para revisión.
