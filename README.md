# Warung Kita

Juego de gestión de un pequeño restaurante indonesio para navegador. **Hito 3: clientes, ventas, servicio y limpieza manual.** Los hitos 1 y 2 están revisados y aprobados manualmente por el usuario.

## Ejecutar desde WSL

```bash
cd /home/koke/projects/warungGame
npm ci
npm run dev
```

Abre http://localhost:5173/ en Windows. Las dependencias ya están instaladas; npm ci reinstala el lockfile. Vite escucha en todas las interfaces, puerto fijo 5173. En teléfono físico usa la IP LAN del ordenador; WSL2 puede necesitar red reflejada/reenvío y permiso del firewall. El proyecto no modifica la red del equipo.

Requisitos: Node 22.18 o posterior y npm 10 o posterior. Comprobado con Node 24.18.0 y npm 11.16.0 en WSL Ubuntu 22.04. Versiones fijadas: Phaser 4.2.1, Vite 8.3.2 y TypeScript 7.0.2. Sin dependencias nuevas para este hito.

- `npm test`: pruebas de producción, permanencia, clientes, reservas, limpieza y navegación con node:test.
- `npm run typecheck`: TypeScript estricto.
- `npm run build`: tipos y compilación en dist/.
- `npm run preview`: versión compilada en http://localhost:4173/.

## Controles y pantalla

WASD o flechas en ordenador. En táctil, apoya un dedo en el lienzo y arrastra respecto al contacto inicial. La distancia controla la velocidad; soltar o volver al origen detiene. Un segundo dedo no toma el control. Los botones quedan fuera del movimiento.

Quédate quieto **1,5 segundos** junto al punto de acción. Aparece una barra de progreso. Intentar moverte, salir del punto o perder validez reinicia la espera. Después de completar se reevalúa y comienza otro ciclo completo sin salir. Cada ciclo mueve **una unidad o un cliente**. Sin acción válida espera con progreso cero; reanuda automáticamente al cambiar las condiciones. Empujar un mueble o pulsar teclas opuestas también cancela.

En caja se fija el cliente al iniciar la interacción y se revalida el mismo al completarla. Si deja de poder atenderse, se cancela su progreso y se reevalúa con un temporizador nuevo. También se fija la posición concreta del hornillo en cada ciclo.

El lienzo ocupa el viewport dinámico sin scroll ni fullscreen. La cámara conserva escala uniforme y sigue al jugador sin mover los muebles. Foco, ocultación, cancelación del gesto y redimensionado cancelan controles y permanencia. Sin foco o con la pestaña oculta se detienen todos los relojes, sin compensar el tiempo al volver.

## Recorrido manual recomendado

1. **Frigorífico:** permanece quieto unos 6 s para recoger cuatro ingredientes, uno cada 1,5 s. Al llenarse espera.
2. **Hornillo:** permanece en el mismo punto. Carga ingredientes y recoge raciones automáticamente, cada transferencia con su propio ciclo. Las cuatro posiciones cocinan en paralelo durante 4 s y una lista ocupa su posición hasta recogerla.
3. **Depositar:** a la izquierda del mostrador, espera hasta vaciar los platos libres. Repite la producción para superar cinco raciones: el stock no tiene límite.
4. Recoge más ingredientes y **cobra llevando carga** en el punto frontal de caja. Atiende sucesivamente sin salir; cada venta suma 10 monedas una vez. Si faltan clientes o stock, espera y reanuda al disponer de ellos.
5. **Recoger pedidos:** a la derecha del mostrador, recoge sucesivamente pedidos pagados de clientes sentados. Comparte el máximo de cuatro platos con la comida libre. El HUD identifica pedido y mesa; ingredientes y residuos no bloquean.
6. **Mesas:** entrega en el punto frontal de la mesa indicada. El cliente come 6 s y deja suciedad. En ese mismo punto se limpia al cabo de otro ciclo, si cabe un residuo.
7. Para probar la reserva sucia, al servir **aléjate antes de que termine de comer**. Mantén la otra mesa asignada y cobra a un nuevo cliente para esa mesa sucia. Esperará en el lateral. Límpiala llevando ingredientes o platos: mantiene su reserva y se sienta. Recoge su pedido y vuelve al mismo punto para servir.
8. **Papelera:** permanece hasta vaciar los residuos. Comprueba que mantiene ingredientes, platos libres y pedidos pagados.
9. Inicia una permanencia y pulsa **Reiniciar prueba**: inventarios, cocina, clientes, pedidos, reservas, suciedad, caja y temporizadores vuelven a cero.

No hay impaciencia. Llegan clientes cada 8 s con intención fija, 50 % de cada tipo. Hay tres plazas por fila y diez clientes como máximo. Una llegada sin plaza se omite, sin cambiar de fila ni acumular deuda. Con ambas mesas asignadas, las ventas para llevar siguen funcionando.

Los límites de transporte son independientes: **4 ingredientes, 4 platos y 4 residuos simultáneamente**. Platos libres y pedidos identificados comparten los cuatro huecos de platos. El mostrador separa disponibles y reservados y dibuja una cantidad limitada de platos, aunque el stock crezca. La papelera **solo elimina residuos**; se retira el antiguo descarte de alimentos.

## Organización y parámetros

- `src/config.ts`: equilibrio, controles, cámara, tiempos, precio y límites.
- `src/world/layout.ts`: huellas originales y puntos de acción, entrada, filas, espera, asientos y salida.
- `src/simulation/Restaurant.ts`: clientes, fases permitidas, colas, mesas, pedidos y cobros; coordina las transferencias.
- `src/simulation/Production.ts`: inventario mixto, cuatro posiciones de cocina, stock disponible y reservas físicas.
- `src/simulation/DwellInteraction.ts`: ciclos completos consecutivos y cancelación del progreso.
- `src/world/navigation.ts`: grafo de visibilidad alrededor de muebles; comparte geometría con las colisiones.
- `src/scenes/RestaurantScene.ts`: integración, comando fijo durante la interacción y tiempo activo.
- `src/entities/`: controles, jugador y vistas de clientes. Las vistas no guardan copias de pedidos/stock.
- `src/world/Station.ts`, `InteractionMarker.ts`, `room.ts` y `camera.ts`: representación y encuadre.
- `tests/`: pruebas pequeñas sin framework adicional.
- `docs/GAME_DESIGN.md`, `ROADMAP.md` y `VERIFICATION.md`: reglas, alcance y comprobaciones.

Parámetros iniciales: permanencia 1500 ms, cocina 4000 ms, inventario 4 ingredientes / 4 platos / 4 residuos, hornillo 4 posiciones, mostrador sin límite, llegada 8000 ms, consumo 6000 ms, precio 10. Los personajes pueden cruzarse al caminar; no hay colisiones rígidas entre ellos. Las plazas de espera son distintas y los recorridos rodean los muebles.

## Verificación y límites

Ver docs/VERIFICATION.md. Pruebas de reglas, typecheck, build y escenarios de navegador con teclado/Pointer Events y móvil emulado. La emulación no equivale a un teléfono físico ni verifica Safari/iOS.

Todo el arte sigue siendo provisional. No hay empleados, mejoras, nuevas recetas, tutoriales guiados ni guardado. Recargar reinicia la partida. Sin backend, servicios externos, publicación o progreso offline.

El delta activo se limita a 100 ms; por debajo de 10 FPS la simulación avanza más despacio. Vite mantiene el aviso de tamaño del bundle de Phaser (aprox. 1,42 MB / 371 kB gzip). No se ha ocultado el aviso. El siguiente paso es volver a probar manualmente esta revisión del hito 3.
