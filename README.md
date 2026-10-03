# Warung Kita

Prototipo de gestión de un warung para navegador. **Hito 4: personal y primeras mejoras**, listo para revisión manual. Los hitos anteriores, incluidos el control táctil y la cámara centrada, están aprobados por el usuario.

## Ejecutar desde WSL

```bash
cd /home/koke/projects/warungGame
npm run dev
```

Abre http://localhost:5173/ en Windows. Dependencias instaladas; `npm ci` reinstala el lockfile. Node >=22.18, npm >=10. Phaser 4.2.1, TypeScript estricto y Vite, sin dependencias nuevas.

- `npm test`: reglas, empleados, compras, navegación y controles con node:test.
- `npm run typecheck`: comprobación de tipos.
- `npm run build`: compilación de producción.
- `npm run preview`: versión compilada en http://localhost:4173/.

Vite escucha en todas las interfaces, puerto fijo 5173. Un teléfono físico puede necesitar configuración LAN/WSL/firewall; el proyecto no cambia esa configuración.

## Jugar

WASD/flechas o arrastre relativo desde una zona libre del lienzo. El origen queda fijo en pantalla, sin inercia. Soltar, cancelar, perder foco o cambiar orientación cancela el movimiento. Cámara centrada directamente en el jugador, también junto a paredes; HUD fijo y exterior decorativo.

Quédate quieto en un punto de acción. Cada ciclo mueve una unidad o cobra a un cliente, y comienza otro ciclo completo si hay trabajo. La intención de moverse cancela aunque choques con un mueble. Sin acción válida no acumula tiempo.

Frigorífico → hornillo → Depositar → Caja. Capacidad inicial independiente 8/8/8; cuatro posiciones de cocina con relojes propios y stock ilimitado en el mostrador. Los clientes reciben su plato al pagar 10 monedas. Si la mesa asignada está sucia esperan junto a caja; limpiar la conserva y les permite caminar al asiento. Comen allí durante 6 s, ensucian y salen. Papelera elimina solo residuos.

Llegan cada 8 s, 50 % por tipo, hasta tres por fila y diez en total. Se atiende la cabeza elegible más antigua; las mesas asignadas no bloquean ventas para llevar. Las compras no aumentan la demanda.

## Compras y personal

Abre **Mejoras** desde cualquier lugar. El juego queda en pausa y cancela tu gesto y permanencia. Cada opción muestra efecto, nivel, precio y disponibilidad. Cerrar reanuda sin tiempo acumulado; vuelve a pulsar una tecla o inicia otro arrastre para moverte.

| Compra | Efecto | Monedas |
| --- | --- | --- |
| Cocinero | Un empleado, carga propia de 4 ingredientes y 4 platos | 100 |
| Limpieza | Una persona, carga propia de 4 residuos | 80 |
| Transporte | 8 → 12 → 16 por categoría del jugador | 60 / 120 |
| Acciones del jugador | 1,5 → 1,2 → 0,9 s | 80 / 160 |
| Hornillo | Nuevas raciones: 4 → 3 → 2 s | 100 / 200 |
| Mesa 3 / Mesa 4 | Una plaza por compra en una posición fija | 80 / 140 |

El cocinero recoge ingredientes por lotes ajustados a las posiciones disponibles. Prioriza recoger raciones listas, deposita al llenarse o cuando no quedan listas accesibles, aunque lleve menos de cuatro. Su objetivo de stock es 12: deja de iniciar nuevas cocciones, termina lo iniciado y reanuda al bajar el stock. No limita tus depósitos.

Limpieza prioriza mesas sucias reservadas por antigüedad del cliente que espera; después las demás por antigüedad de suciedad. Lleva residuos a papelera al llegar a cuatro o quedarse sin mesas que pueda atender. Sin tareas espera en un punto apartado.

Ambos se desplazan, tardan 1,5 s por transferencia y tienen inventarios independientes. No cobran ni reparten. Reservan una posición/ración del hornillo o los residuos de una mesa; puedes seguir trabajando sobre otros recursos. La tarea mantiene su objetivo hasta completarse o invalidarse.

Las nuevas mesas aparecen con silla, colisión, asiento y limpieza al comprarlas. Si alguien ocupa el espacio, no cobra: cierra el panel, deja pasar al personaje o muévete y vuelve a intentarlo. Las rutas se recalculan sin mover instantáneamente a los actores.

## Recorrido manual del Hito 4

1. **Inicio y panel:** reinicia. Comprueba saldo 0, carga 0/8 en cada categoría y dos mesas. Abre Mejoras: fondos insuficientes. Hazlo mientras te mueves o estás a mitad de una acción: todo debe detenerse. Cierra: no debe continuar el movimiento anterior ni completarse la acción cancelada.
2. **Dinero:** produce y vende. Cada venta suma 10 monedas. Diez ventas permiten contratar al cocinero si no has gastado antes. No hay dinero gratis en la interfaz.
3. **Cocinero (100):** contrátalo y permanece en Caja. Observa su recorrido frigorífico/hornillo/depósito y las ventas cuando repone stock. Sal de Caja para dejar subir el stock: debe parar en torno a 12 al terminar los platos iniciados. Vuelve a vender para que reanude.
4. **Limpieza (80):** contrata tras ensuciar mesas. Observa desplazamiento, recogida y descarga, también con un solo residuo. Para probar prioridad, deja ambas sucias, cobra reservas y contrata después: atenderá primero la reserva más antigua y su cliente abandonará la espera con el plato.
5. **Transporte (60 y 120):** compra cada nivel por separado. Llena ingredientes hasta 12 y luego 16; comprueba que platos y residuos tienen el mismo límite independiente. Las pilas dibujadas quedan acotadas a cuatro objetos; el HUD es exacto y conserva +1/−1. Los empleados siguen en 4.
6. **Rapidez (80 y 160):** prueba recogida, depósito, caja y limpieza tras cada compra: 1,2 y 0,9 s por ciclo. El panel cancela cualquier ciclo del jugador al abrirse. Las acciones del personal y el consumo del cliente mantienen sus tiempos.
7. **Hornillo (100 y 200):** inicia una cocción, abre Mejoras y compra. Esa ración conserva los 4 s originales; las nuevas duran 3 s. Repite con el segundo nivel, 2 s. Sirve tanto al cocinero como a ti.
8. **Mesas (80 y 140):** compra cada una, a la izquierda y entre las mesas originales. Acércate y rodea sus huellas; comprueba su punto de limpieza. Espera clientes para observar reserva, llegada al asiento, suciedad y limpieza. Si hay un personaje en el lugar de colocación, comprueba rechazo sin gasto y reintenta al liberarse.
9. **Cooperación:** con raciones listas, acércate al hornillo mientras el cocinero recoge; cada actor debe retirar una ración distinta. Con dos mesas sucias, deja que limpieza fije una y limpia la otra. Si ambos quieren la misma, espera sin progreso; moverte libera tu reserva. Ninguna unidad se duplica.
10. **Reinicio:** prueba con empleados trabajando, clientes esperando, cocciones y mejoras activas. DEV restaura dos mesas, 8/8/8, 1,5 s, 4 s y saldo 0; desaparecen empleados, tareas, recursos, clientes, reservas y progreso. La operación también cierra el panel y limpia entradas.

Los precios son hipótesis de balance. La demanda conservada puede hacer que muchas veces baste una sola mesa: ampliar capacidad no genera clientes nuevos.

## Organización y límites

Configuración en `src/config.ts`; distribución en `src/world/layout.ts`. `Restaurant` coordina compras, clientes, mesas, dinero y reservas; `Production` ejecuta transferencias sobre el `Inventory` del actor; `Staff` lleva tareas y rutas de las dos profesiones. `UpgradePanel` usa DOM sencillo; las vistas se dibujan con Phaser. Sin ECS ni framework nuevo.

Diseño detallado en `docs/GAME_DESIGN.md`, alcance en `docs/ROADMAP.md` y resultados en `docs/VERIFICATION.md`. Las pruebas de navegador son de escritorio y móvil emulado; no certifican Safari/iOS ni comodidad en un dispositivo físico.

No hay guardado: recargar empieza de cero. Arte y economía provisionales; personajes pueden cruzarse. Delta activo máximo 100 ms: por debajo de 10 FPS la simulación avanza más despacio. Se conserva el aviso de tamaño del bundle de Phaser.

Detener tras el Hito 4 para revisión manual. Sin recetas nuevas, más hornillos, niveles del personal, cajero, tutoriales, arte final, publicidad, publicación ni push.
