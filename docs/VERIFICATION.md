# Verificación del hito 3

Fecha: 2026-10-02. Los hitos 1 y 2 están revisados manualmente y aprobados por el usuario. Esta verificación técnica corresponde a clientes, ventas, servicio y limpieza; queda pendiente la revisión manual del hito 3.

## Entorno y comprobaciones

- WSL Ubuntu 22.04, Node 24.18.0 y npm 11.16.0.
- Phaser 4.2.1, TypeScript 7.0.2 y Vite 8.3.2; sin cambios de dependencias ni lockfile.
- `npm test`: **21 pruebas correctas**, las 10 existentes y 11 nuevas de restaurante/navegación.
- `npm run typecheck`: correcto.
- `npm run build`: correcto, también después de los ajustes visuales finales.
- `git diff --check`: correcto.
- Bundle final: aproximadamente 1.417,58 kB / 371,18 kB gzip. Vite conserva el aviso de chunks mayores de 500 kB.
- No se han hecho commits, push, publicaciones ni cambios de red.

## Pruebas de reglas

Se mantiene el ejecutor nativo node:test, sin framework adicional.

Las pruebas existentes conservan: inventario de una unidad, cocina, transferencias, capacidad, revalidación, permanencia separada, intención de movimiento, bloqueo hasta salir y reinicio. Solo se renombra el antiguo estado de prueba completada como estado de capacidad.

Las nuevas pruebas cubren:

1. Cabeza elegible con mayor espera entre ambas filas, sin adelantar ni cobrar dos veces.
2. Ventas para llevar con ambas mesas asignadas; una mesa no se asigna otra vez.
3. Reservadas incluidas en capacidad, imposibles de vender para llevar; recoger libera espacio.
4. Recogida solo con cliente sentado, rechazo de mesa equivocada/descarte del plato pagado/entrega duplicada.
5. Consumo, salida, suciedad, preferencia por mesa limpia, reserva de sucia, espera lateral, limpieza conservando cliente y transferencia de residuos.
6. Limpieza mientras el cliente sigue caminando: conserva reserva y recorre el tramo pendiente al asiento.
7. Comando preparado que pierde validez: no cambia cliente ni cobra parcialmente.
8. Reinicio completo, IDs distintos y rechazo de comandos de la partida anterior; reloj de llegada desde cero.
9. Límites de fila/clientes, intención fija y llegada omitida sin deuda ni desvío.
10. Ruta entre cada par de destinos explícitos, muestreo de segmentos libres y movimiento completo limitado por velocidad sin atravesar muebles.
11. Tres radios del mostrador separados y accesibilidad de todos los puntos de acción.

## Navegador de escritorio

Edge/Chromium **154.0.4258.48**, headless mediante Playwright disponible en el entorno.

Se probaron controles y permanencias reales de la aplicación; para reproducir los escenarios específicos se fijaron intenciones y se prepararon algunas raciones mediante las operaciones de producción del modelo. No se confunde esa preparación con producción manual completa de todas las raciones.

- Se produjo **una ración completa con teclado**, desde el punto inicial hasta depósito, sin recolocar al jugador ni escribir inventario. Se cobró una venta para llevar y se comprobó que no ocupa las manos.
- Dos clientes reservaron mesas y raciones mediante permanencia real en caja.
- Recogida del pedido pagado más antiguo, rechazo en la mesa equivocada y entrega correcta.
- Consumo durante 6 s, suciedad visible, liberación al levantarse y recorrido de salida.
- Nuevo cliente reservado en la mesa sucia, con la otra mesa aún asignada; espera lateral visible.
- Limpieza mediante permanencia, residuos en manos, reserva conservada y desplazamiento hasta el asiento.
- Residuos a la papelera, recogida primero del pedido más antiguo y servicio de ambos pedidos pendientes.
- Un plato pagado permaneció en las manos tras esperar en la papelera; el mensaje indicó que debía entregarse.
- **Cinco ventas consecutivas** con ambas filas pobladas: dos reservas de mesa y tres ventas para llevar. El tercer cliente de comer aquí quedó esperando sin bloquear las ventas para llevar.
- Permanecer en caja después del cobro no generó otra venta.
- Se alteró deliberadamente la validez de un comando ya iniciado: durante la permanencia no se cambió al otro cliente elegible; fue necesario moverse y volver.
- Reinicio DEV: caja, carga, pedidos, filas, clientes, reservas, mesas y vistas antiguas limpios.

### Pausa

Con cocina y consumo activos, clientes presentes y una llegada próxima, se simularon eventos de visibilidad/documento oculto. No cambiaron el tiempo de simulación, el temporizador de llegada, la cocina ni los clientes durante la pausa. Al volver no hubo compensación del tiempo transcurrido.

También se ejercitó blur/focus: el reloj quedó detenido sin foco. Son pruebas de los manejadores mediante eventos/estado controlados, no una sesión manual cambiando de aplicación nativa.

## Móvil emulado

Con contexto táctil a 390 × 844 y eventos de contacto/arrastre/liberación:

- Recorrido a caja y compra por permanencia.
- Recogida del pedido sentado y servicio en la mesa correcta, recorriendo el mapa con arrastre.
- Volver al origen detiene sin soltar.
- El segundo dedo no mueve al jugador ni hereda el control.
- Cancelar el contacto detiene y elimina el indicador.
- Reinicio mediante toque real en el botón: vacía restaurante y no inicia movimiento.
- Redimensionar durante arrastre cancela la entrada.
- Lienzo del tamaño exacto del viewport, sin scroll, zoom uniforme y HUD/contexto/botón dentro de los límites a **320 × 568, 390 × 844, 568 × 320 y 844 × 390**.

No hubo errores de consola ni excepciones en las ejecuciones de escritorio, táctil y revisión visual final.

## Revisión visual y versión compilada

Se inspeccionaron capturas de venta para llevar, cliente comiendo, espera ante suciedad, residuos transportados, mesas reservadas y filas completas.

Se ajustaron las etiquetas de mesa para no cubrir los cuerpos en fila y se separó el número de cliente de la etiqueta LLEVAR para evitar solapamiento entre las tres plazas. Se revisaron nuevamente escritorio y los cuatro tamaños móviles tras esos cambios. Los muebles conservaron sus huellas y posiciones.

La compilación final se sirvió con `npm run preview`: carga, movimiento con teclado, recogida de ingredientes por permanencia y llegada automática correctos. Solo solicitó HTML, JS y CSS locales; sin errores de consola.

Evidencia local en `artifacts/hito3-*`, excluida de Git:
- Scripts de escritorio, móvil, revisión visual y producción.
- Informes `hito3-desktop-results.json`, `hito3-mobile-results.json`, `hito3-visual-results.json` y `hito3-production-results.json`.
- Capturas de cada escenario y tamaño.

## Pendiente y límites

- Prueba manual en un teléfono/tableta físico; la emulación no demuestra sensaciones táctiles reales, muescas ni barras dinámicas de Safari/iOS.
- Safari, Firefox, hardware lento y sesiones prolongadas.
- Acceso desde otro equipo por LAN/WSL/firewall.
- Ajuste del ritmo, precio y límites, todos provisionales y centralizados.
- Arte y animación siguen siendo provisionales. Los personajes pueden cruzarse al caminar; esperan en plazas distintas.
- Sin empleados, mejoras, nuevas recetas, tutoriales guiados o persistencia. No se continúa con esos sistemas en este hito.

El recorrido manual completo está en README.md, incluida la preparación necesaria para reservar una mesa sucia cuando la otra sigue asignada.
