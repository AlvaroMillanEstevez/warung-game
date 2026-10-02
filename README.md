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

Quédate quieto **1,5 segundos** junto al punto de acción. Aparece una barra de progreso. Intentar moverte, salir del punto o perder validez reinicia la espera. Después de completar debes **salir del radio y volver** para repetir. Empujar un mueble o pulsar teclas opuestas también cancela.

En caja se fija el cliente al iniciar la interacción y se revalida el mismo al completarla. Si deja de poder atenderse, no se cambia silenciosamente a otro: muévete para iniciar una nueva acción.

El lienzo ocupa el viewport dinámico sin scroll ni fullscreen. La cámara conserva escala uniforme y sigue al jugador sin mover los muebles. Foco, ocultación, cancelación del gesto y redimensionado cancelan controles y permanencia. Sin foco o con la pestaña oculta se detienen todos los relojes, sin compensar el tiempo al volver.

## Recorrido manual recomendado

1. **Frigorífico:** con manos vacías, espera para recoger ingredientes.
2. **Hornillo:** espera para cargarlos; sal del radio. Cocina durante 4 s aunque te alejes. Vuelve cuando esté listo y espera para recoger.
3. **Depositar:** lleva la ración al punto situado a la **izquierda del mostrador**. Repite para preparar varias.
4. **Caja:** delante del mostrador, espera con manos vacías. Atiende al cliente elegible más antiguo entre ambas cabezas. Cada compra correcta suma **10 monedas**, una sola vez.
5. **Para llevar:** el cliente recibe su ración y camina a la salida. Sal de la caja antes del siguiente cobro.
6. **Comer aquí:** el cliente reserva mesa y ración. Cuando esté sentado esperando, ve a **Recoger pedidos**, a la **derecha del mostrador**, con manos vacías.
7. Lleva el plato a la mesa indicada por el HUD y espera en su punto de servicio. No puedes entregarlo a otra mesa ni tirarlo a la basura.
8. El cliente come **6 s**, se levanta y sale. La mesa queda sucia y libre de asignación. No hay un segundo cobro.
9. Para probar la espera ante suciedad, deja al otro cliente con la segunda mesa asignada y cobra a un nuevo cliente que quiera comer aquí. Recibirá la mesa sucia y esperará en su lateral. Las mesas limpias libres tienen prioridad.
10. Con manos vacías, espera en la mesa sucia. Recoges residuos, conservas su reserva y el cliente avanza hasta sentarse. Lleva los residuos a la **papelera**, recoge su pedido y sírvelo. Si hay otro pedido pagado más antiguo con cliente sentado, se recoge primero.
11. Mantén ambas mesas asignadas y comprueba que la fila **para llevar** continúa. Repite varias ventas saliendo del radio de la caja entre cobros.

No hay impaciencia. Llegan clientes cada 8 s con intención fija, 50 % de cada tipo. Hay 3 plazas por fila y un máximo de 10 clientes dentro del local. Una llegada sin plaza se omite, sin cambiar de fila ni acumular deuda.

Solo se transporta una unidad. La papelera permite descartar ingredientes, comida sin asignar y residuos. El mostrador admite **5 raciones físicas**: disponibles más reservadas. Las reservadas permanecen visibles con borde coral hasta recogerlas. Llenarlo no termina la partida.

**DEV · provisional / Reiniciar prueba** borra clientes, filas, pedidos, reservas, suciedad, producción, carga, dinero, permanencia y temporizadores; devuelve al jugador al inicio sin recargar.

## Organización y parámetros

- `src/config.ts`: equilibrio, controles, cámara, tiempos, precio y límites.
- `src/world/layout.ts`: huellas originales y puntos de acción, entrada, filas, espera, asientos y salida.
- `src/simulation/Restaurant.ts`: clientes, fases permitidas, colas, mesas, pedidos y cobros; coordina las transferencias.
- `src/simulation/Production.ts`: carga, cocina, stock disponible y reservas físicas.
- `src/simulation/DwellInteraction.ts`: permanencia y bloqueo hasta salir.
- `src/world/navigation.ts`: grafo de visibilidad alrededor de muebles; comparte geometría con las colisiones.
- `src/scenes/RestaurantScene.ts`: integración, comando fijo durante la interacción y tiempo activo.
- `src/entities/`: controles, jugador y vistas de clientes. Las vistas no guardan copias de pedidos/stock.
- `src/world/Station.ts`, `InteractionMarker.ts`, `room.ts` y `camera.ts`: representación y encuadre.
- `tests/`: pruebas pequeñas sin framework adicional.
- `docs/GAME_DESIGN.md`, `ROADMAP.md` y `VERIFICATION.md`: reglas, alcance y comprobaciones.

Parámetros iniciales: permanencia 1500 ms, cocina 4000 ms, capacidad 5, llegada 8000 ms, consumo 6000 ms, precio 10. Los personajes pueden cruzarse al caminar; no hay colisiones rígidas entre ellos. Las plazas de espera son distintas y los recorridos rodean los muebles.

## Verificación y límites

Ver docs/VERIFICATION.md. Pruebas de reglas, typecheck, build y escenarios de navegador con teclado/Pointer Events y móvil emulado. La emulación no equivale a un teléfono físico ni verifica Safari/iOS.

Todo el arte sigue siendo provisional. No hay empleados, mejoras, nuevas recetas, tutoriales guiados ni guardado. Recargar reinicia la partida. Sin backend, servicios externos, publicación o progreso offline.

El delta activo se limita a 100 ms; por debajo de 10 FPS la simulación avanza más despacio. Vite mantiene el aviso de tamaño del bundle de Phaser (aprox. 1,42 MB / 371 kB gzip). No se ha ocultado el aviso. El siguiente paso es la revisión manual del hito 3.
