# Warung Kita

Prototipo de warung para navegador. Hito 3: **producción, autoservicio, ventas y limpieza**. Esta revisión incorpora feedback de carga y cámara centrada; queda pendiente probar las sensaciones de movimiento.

## Ejecutar desde WSL

```bash
cd /home/koke/projects/warungGame
npm run dev
```

Abre http://localhost:5173/ en Windows. Dependencias instaladas; `npm ci` reinstala el lockfile. Node >=22.18, npm >=10. Phaser 4.2.1, TypeScript 7.0.2 y Vite 8.3.2, sin dependencias nuevas.

- `npm test`: reglas, navegación, arrastre y geometría del exterior con node:test.
- `npm run typecheck`: TypeScript estricto.
- `npm run build`: compilación de producción.
- `npm run preview`: versión compilada en http://localhost:4173/.

Vite escucha en todas las interfaces, puerto fijo 5173. Un teléfono físico puede necesitar configuración LAN/WSL/firewall; el proyecto no cambia esa configuración.

## Controles y cámara

WASD/flechas o arrastre relativo desde cualquier zona libre del lienzo. El contacto fija un origen en pantalla. Alejarse controla dirección y velocidad; volver a la zona muerta, soltar o cancelar detiene. Sin inercia ni joystick fijo. Segundo dedo ignorado. Foco y orientación cancelan el gesto anterior.

Revisión del control: el cálculo ya usaba coordenadas de pantalla coherentes, sin acumulación ni dependencia de cámara. Se elimina el seguimiento con retraso de la cámara, se amplía recorrido de 58 a 76 px y zona muerta de 10 a 12 px, y se usa una curva progresiva de exponente 1,25. El ajuste necesita evaluación manual; las pruebas automáticas no confirman comodidad.

La cámara centra el cuerpo del jugador incluso junto a paredes, con seguimiento directo y zoom uniforme. El suelo transitable y sus colisiones siguen iguales. El exterior decorativo se dimensiona según el viewport y zoom, con acera, calle y árboles geométricos. No es transitable. HUD y mensajes permanecen anclados a pantalla.

Quietud de **1,5 s** activa una acción. Cada ciclo atiende un cliente o mueve una unidad y vuelve a empezar sin salir si hay otra acción válida. Movimiento/invalidez cancelan; sin recursos no se acumula progreso. Pestaña oculta o sin foco pausa todos los relojes.

## Recorrido de prueba

1. Frigorífico: recoge de uno en uno hasta cuatro. Observa la pila de ingredientes y el indicador +1.
2. Hornillo: permanece para cargar y recoger. Cuatro posiciones, 4 s cada una; cada transferencia tiene su propio ciclo.
3. Deposita a la izquierda del mostrador: −1 por plato. Stock ilimitado; el jugador puede llevar a la vez 4 ingredientes, 4 platos y 4 residuos.
4. Caja delante del mostrador: cobra sucesivamente aun llevando carga. Cada cliente consume una ración y paga 10 monedas una sola vez.
5. Comer aquí: el cliente recibe su plato en caja, camina a una mesa limpia y come al sentarse. **Ya no hay recogida ni reparto del jugador.**
6. Deja que ambas mesas queden sucias, sin limpiarlas todavía. Cobra a dos nuevos clientes para comer aquí: reservan mesas distintas y esperan con sus platos en dos puntos al lado de caja. Comprueba que se sigue vendiendo para llevar.
7. Limpia una mesa desde su punto frontal, llevando ingredientes o platos. Recoges un residuo y solo su cliente abandona caja, camina al asiento y come. La reserva no se pierde.
8. Repite limpiezas para observar de uno a cuatro residuos. En papelera desaparecen uno por ciclo y los alimentos se conservan.
9. Mantén un arrastre constante mientras te acercas a paredes y esquinas. Comprueba el centrado y el exterior; suelta y cambia orientación para comprobar la parada.
10. Reinicia con clientes esperando limpieza o comiendo: desaparecen platos, reservas, clientes, progreso y feedback.

Los clientes llegan cada 8 s con intención fija (50 % por tipo), hasta tres por fila y diez en total. Se atiende la cabeza elegible más antigua. Mesas asignadas no bloquean ventas para llevar. Al terminar los 6 s de comida, el cliente ensucia, libera la mesa y sale.

## Organización

- `src/config.ts`: equilibrio, controles, cámara y feedback.
- `src/world/layout.ts`: huellas, puntos de acción, filas, asientos y esperas junto a caja.
- `src/simulation/Restaurant.ts`: autoservicio, clientes, mesas, cobros y trazabilidad.
- `src/simulation/Production.ts`: inventario simple, hornillos y stock.
- `src/simulation/DwellInteraction.ts`: ciclos continuos.
- `src/entities/Controls.ts` y `drag.ts`: eventos y vector relativo independiente de cámara.
- `src/world/viewport.ts`, `camera.ts` y `room.ts`: geometría visible, seguimiento y exterior decorativo.
- `src/entities/Player.ts` y `CustomerView.ts`: carga, feedback y platos de clientes.
- `docs/GAME_DESIGN.md`, `ROADMAP.md` y `VERIFICATION.md`: reglas, alcance y evidencias.

## Límites

Revisar docs/VERIFICATION.md. Móvil emulado no equivale a teléfono físico ni valida Safari/iOS. La sensación del arrastre sigue pendiente de prueba manual. Arte y equilibrio son provisionales; personajes pueden cruzarse.

El delta activo máximo es 100 ms; por debajo de 10 FPS la simulación avanza más despacio. Vite conserva el aviso de tamaño del bundle de Phaser (aprox. 1,42 MB / 372 kB gzip).

Sin empleados, mejoras, recetas nuevas, tutoriales o guardado. El futuro camarero limpiará mesas y recogerá residuos; el reparto queda fuera del diseño actual. Sin publicación, push ni servicios externos. Detener aquí el desarrollo para probar autoservicio y movimiento.
