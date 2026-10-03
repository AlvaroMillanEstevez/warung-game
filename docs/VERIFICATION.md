# Verificación del Hito 4: personal y primeras mejoras

Fecha: 2026-10-03. Los hitos 1–3, incluido el control táctil y la cámara centrada, están aprobados manualmente por el usuario. Esta entrega queda pendiente de su revisión jugable.

## Entorno y comprobaciones

- WSL Ubuntu 22.04, Node 24.18.0, npm 11.16.0.
- Phaser 4.2.1, TypeScript estricto 7.0.2 y Vite 8.3.2. Sin dependencias nuevas ni cambios del lockfile.
- `npm test`: 33 pruebas correctas con node:test.
- `npm run typecheck`: correcto; también se ejecuta dentro del build.
- `npm run build`: correcto. Se conserva el aviso del bundle de Phaser superior a 500 kB (1.432,61 kB / 375,64 kB gzip).
- `git diff --check`: correcto.
- Sin publicación, push o persistencia.

## Reglas cubiertas

Se mantienen las pruebas de autoservicio, cobro único, filas sin adelantamientos, limpieza independiente de reservas, movimiento y cámara. Se adaptan los límites iniciales a 8/8/8 y los estados de cocción a su duración capturada.

Las pruebas nuevas cubren:

1. Saldo insuficiente, compra válida, descuento único con nivel esperado, máximos y ausencia de saldo negativo.
2. Capacidad real de las tres categorías tras 12 y 16; empleados permanecen en 4.
3. Cocciones activas conservan 4/3 s al mejorar; las nuevas usan 3/2 s. Permanencia iniciada conserva duración, siguiente ciclo usa la mejora.
4. Mesas ausentes antes de comprar, colocación rechazada sobre el jugador sin cobrar, integración de cuatro reservas y asientos.
5. Rutas entre todos los puntos de acción, filas, esperas, asientos, entradas y posiciones del personal con cuatro mesas. Se muestrean segmentos para comprobar huellas.
6. Circuito completo del cocinero con inventario independiente, transferencias solo en destinos y distancia por paso limitada a su velocidad.
7. Depósito de lotes parciales, stock objetivo 12, espera estable, reanudación al vender y depósitos manuales sobre el objetivo.
8. Si el stock llega al objetivo durante un viaje a cargar, cancela la carga y libera la posición; conserva ingredientes para demanda posterior.
9. Limpieza de reservas por antigüedad del pago, cliente que abandona su espera y come al llegar, conservación de asignación.
10. Prioridad de reservas sobre mesas sin cliente; antigüedad de suciedad para las restantes; vaciado parcial y capacidad completa.
11. Jugador y empleados compiten por una ración, posición o residuos de mesa: no duplican, pueden trabajar sobre otro recurso y liberan reservas.
12. Invalidación, ruta imposible y reinicio no dejan reservas huérfanas; reinicio restaura límites, tiempos, personal y dos mesas.

El dinero y ciertos estados específicos se preparan en pruebas como fixtures. No existe botón de dinero gratis ni cambio del saldo inicial normal.

## Navegador de escritorio

Edge/Chromium mediante Playwright instalado en el entorno, en modo headless; no se añadió al proyecto. Sin errores de consola ni excepciones durante las pruebas correctas.

- Apertura del panel con saldo cero: botones deshabilitados y fondos insuficientes.
- Abrir mientras se mantiene una tecla cancela movimiento/permanencia; reloj y posición quedan congelados.
- Doble clic en transporte compra un solo nivel y descuenta 60 una vez.
- Cierre sin desplazamiento residual ni tiempo acumulado; compra de ambos niveles y contrataciones desde el panel.
- Recorrido con teclado hasta Caja. Con reloj real, el cocinero completó frigorífico → hornillo → depósito y el jugador cobró al menos dos ventas estando quieto.
- Con ambos empleados y cuatro mesas se ejecutaron otros 600 s activos mediante pasos de 50 ms sobre la escena: 49 ventas, 21 limpiezas y 48 depósitos. Los empleados respetaron velocidad y muebles.
- En esa simulación de demanda normal bastó habitualmente la mesa 1. En el escenario adicional, los cuatro clientes alcanzaron físicamente sus respectivos asientos y quedaron comiendo en las mesas 1, 2, 3 y 4.
- Cooperación manual en el hornillo mediante permanencia de la escena: el cocinero fijó la posición 0 y el jugador recogió la ración de la posición 1.
- Reinicio con panel abierto: cerró diálogo, eliminó vistas del personal y mesas adicionales, liberó reservas y restauró saldo, carga y tiempos.

La prueba prolongada avanzó la simulación de manera controlada; no se presenta como diez minutos de rendimiento sostenido a tiempo real. Las pruebas de cooperación fijaron posiciones iniciales y recursos para reproducir la competencia; después usaron las acciones de la escena.

## Móvil emulado

Contexto con eventos táctiles a 390 × 844 y revisión de interfaz a 320 × 568, 844 × 390 y 568 × 320.

- Abrir con un contacto capturado cancela puntero, vector y progreso; reloj/posición congelados. La apertura de este caso se disparó desde DOM para mantener el contacto.
- Compras reales mediante taps para todas las opciones; el panel no mueve al jugador.
- Tras cerrar, un arrastre nuevo vuelve a desplazarlo; el anterior no se recupera.
- Diálogo contenido en pantalla, scroll interior, última compra y cierre accesibles, sin desbordamiento horizontal; botón Mejoras de al menos 44 px.
- Cooperación de limpieza sobre dos mesas sucias preparadas: el empleado reservó mesa 1; el jugador limpió mesa 2 mediante su permanencia y recibió un residuo. El empleado terminó la otra y descargó su residuo parcial en papelera. Ambas limpias, sin reservas huérfanas.
- Reinicio táctil correcto, sin errores de consola.

Las capturas finales se inspeccionaron en escritorio y móvil. Con carga 16/16/16, los contadores del HUD fueron exactos y la lista de comandos gráficos de las pilas tuvo el mismo tamaño que con carga 4/4/4 (2016 entradas), confirmando que no crece con los nuevos límites. También se verificó que el reinicio repone el temporizador del mensaje y deja progreso cero. Los marcadores de interacción siguen visibles y los círculos técnicos de filas/espera están ocultos por defecto.

## Evidencia y límites

Evidencia local en `artifacts/`, excluida de Git:

- `hito4-desktop.cjs` y `hito4-desktop-results.json`.
- `hito4-mobile.cjs` y `hito4-mobile-results.json`.
- `hito4-visual.cjs`, capturas `hito4-*.png` y resultados de revisión visual.
- Los archivos `selfservice-*`, `revision-*` y `hito3-*` corresponden a hitos anteriores.

Pendientes: revisión manual del Hito 4, balance económico y sensaciones del panel en teléfono físico. No se ha certificado Safari/iOS, Firefox, dispositivos lentos ni sesiones de juego de varias horas. La emulación no demuestra comodidad táctil. Los controles previos sí cuentan con aprobación manual del usuario.

Se conserva el límite de delta de 100 ms, sin avance offline. Personajes pueden cruzarse. No hay persistencia: recargar reinicia. No se aumentó la demanda para justificar mesas nuevas.

El recorrido de cada compra y de cooperación está en README.md. Detener el desarrollo tras este hito.
