# Warung Kita

Prototipo de gestión de un warung para navegador. **Hitos 1–4 aprobados manualmente. Revisión de experiencia y balance implementada, pendiente de revisión manual.**

## Ejecutar desde WSL

```bash
cd /home/koke/projects/warungGame
npm run dev
```

Abre [el juego local](http://127.0.0.1:5173/) en Windows. También puede usarse localhost:5173. Dependencias instaladas; `npm ci` reinstala el lockfile. Node >=22.18, npm >=10. Phaser 4.2.1, TypeScript estricto y Vite; sin dependencias nuevas.

- `npm test`: reglas, compras, navegación y controles con node:test.
- `npm run typecheck`: comprobación de tipos.
- `npm run build`: comprobación de tipos y compilación de producción.
- `npm run preview`: versión compilada en el puerto 4173.

Vite escucha en todas las interfaces, puerto fijo 5173. Un teléfono físico puede necesitar configuración LAN/WSL/firewall; el proyecto no cambia esa configuración.

## Jugar

WASD/flechas o arrastre relativo desde una zona libre del lienzo. El origen queda fijo en pantalla, sin inercia. Soltar, cancelar, perder foco o cambiar orientación cancela el movimiento. Cámara centrada directamente en el jugador; HUD fijo con **dinero y Mejoras**.

Quédate quieto en un punto de acción. Cada ciclo mueve una unidad o cobra a un cliente y comienza otro ciclo completo si hay trabajo. La intención de moverse cancela aunque choques con un mueble. Sin acción válida no acumula tiempo.

Frigorífico → hornillo → Depositar → Caja. Capacidad inicial independiente de 8 ingredientes, 8 platos y 8 residuos. Cuatro posiciones de cocina con relojes propios; stock ilimitado en el mostrador. Cada venta entrega directamente un plato al cliente y suma 10 monedas. Si la mesa asignada está sucia, espera con su plato junto a caja; limpiarla conserva la reserva y le permite caminar al asiento. Come allí durante 6 s, ensucia y sale. La papelera elimina solo residuos.

Las torres muestran la cantidad exacta de cada categoría para jugador y personal. Se conservan puntos de interacción, progreso, señales de cocción y mensajes breves en el mundo. No hay contadores técnicos permanentes.

## Compras y equipo

Abre **Mejoras** desde cualquier lugar. Pausa toda la simulación y cancela tu gesto y permanencia. Cerrar reanuda sin tiempo acumulado; pulsa otra tecla o inicia otro arrastre para moverte.

| Compra | Efecto | Monedas |
| --- | --- | --- |
| Cocinero | Ingredientes y platos; hereda la capacidad y rapidez del equipo | 100 |
| Limpieza | Residuos; hereda la capacidad y rapidez del equipo | 80 |
| Capacidad del equipo | 8 → 12 → 16 por categoría aplicable de cada actor | 60 / 120 |
| Rapidez del equipo | 1,5 → 1,2 → 0,9 s por acción | 80 / 160 |
| Hornillo | Nuevas raciones: 4 → 3 → 2 s | 100 / 200 |
| Mesa 3 / Mesa 4 | Una plaza por compra en la fila inferior | 80 / 140 |

Las mejoras globales afectan al personal existente y al contratado después. El cocinero solo tiene ingredientes/platos; limpieza solo residuos. No comparten inventarios. Cada acción captura su duración al empezar a actuar: mejorar no acelera una acción ya iniciada. Un trabajador que todavía camina toma el nuevo tiempo al llegar. Abrir el panel cancela el ciclo del jugador; congela las tareas del personal.

Rapidez no modifica desplazamiento, consumo ni cocción. La mejora del hornillo tampoco cambia las cocciones ya iniciadas.

El cocinero recoge ingredientes según capacidad y demanda restante, recoge raciones listas y deposita también lotes parciales. Su objetivo es 12 raciones disponibles: termina lo iniciado y reanuda al bajar el stock. No limita tus depósitos. Limpieza prioriza reservas antiguas y luego suciedad antigua; vacía su carga al llenarse o quedarse sin mesas que pueda atender, aunque lleve un solo residuo. Nadie cobra ni reparte.

Las cuatro mesas forman una cuadrícula regular de dos filas. Los espacios inferiores permanecen vacíos hasta la compra. Las rutas automáticas los reservan desde el inicio; el jugador puede atravesarlos mientras no haya mesa. Si un actor ocupa la futura huella, la compra se deshabilita sin cobrar: cierra el panel, deja libre el espacio y reintenta. Al comprar se recalculan rutas desde las posiciones actuales, conservando tareas y reservas.

## Demanda, filas y comentarios

Llegada base cada **8 s**, con intención fija **70 % comer dentro / 30 % para llevar**. Las filas tienen **20 y 10 plazas**, respectivamente; el límite global es **48 clientes en todos los estados**. Son carriles paralelos con plazas distintas que continúan al exterior. Solo los clientes pueden recorrer esa franja; el jugador conserva su área transitable.

Se atiende la cabeza elegible más antigua. Las mesas asignadas no bloquean pedidos para llevar. Una fila llena omite su llegada sin desviar al cliente ni acumular llegadas pendientes.

Al alcanzar o superar **300 monedas en compras correctas acumuladas**, la frecuencia aumenta una única vez ×1,5: intervalo aproximado **5,33 s**. No cuentan saldo, ingresos ni compras fallidas. Aparece “¡El warung atrae más clientes!” y se inicia un intervalo nuevo, sin ráfaga. Las siguientes compras no vuelven a multiplicar la demanda.

Algunos clientes comentan tras un umbral individual de 10–15 s esperando. Los bocadillos duran 2,5 s, solo se muestran en cámara, con un máximo de dos y al menos 20 s entre comentarios del mismo cliente. Evitan la carga y desaparecen al atender. No hay paciencia, abandono ni penalizaciones.

## Recorrido manual de esta revisión

1. **Inicio y pausa:** abre DEV con **F2**, o mantén pulsado el dinero **1,2 s**, y reinicia. Deben quedar saldo/gasto 0, dos mesas, capacidades 8 y acciones de 1,5 s. Cierra DEV. Comprueba que el HUD solo muestra dinero y Mejoras. Abre Mejoras durante movimiento o permanencia: todo se detiene; al cerrar no hay desplazamiento residual ni tiempo recuperado.
2. **Equipo antes de mejorar:** produce y vende a 10 monedas. Compra cocinero (100), limpieza (80) y primer transporte (60). El gasto acumulado será **240** aunque el saldo varíe. En DEV puedes comprobar gasto e intervalo de 8000 ms. Ambos empleados deben tener capacidad 12 en sus categorías; el jugador, 12 en cada una.
3. **Salto de demanda:** reúne 80 y compra rapidez del equipo. El gasto pasa de **240 a 320**: aparece una sola notificación y el intervalo cambia a unos **5333 ms**, sin clientes instantáneos. Las acciones siguientes duran 1,2 s. Compras posteriores mantienen esa frecuencia; los intentos sin fondos no suman gasto.
4. **Acción en curso:** abre Mejoras cuando un empleado esté actuando, compra el siguiente nivel de rapidez y cierra. Debe terminar el ciclo con su duración anterior; el siguiente usa 0,9 s. Repite con el hornillo: las raciones iniciadas conservan 4/3 s, las siguientes usan 3/2 s.
5. **Contratación posterior:** en otra partida, compra capacidad antes de contratar. El nuevo empleado hereda 12, o 16 si compraste ambos niveles. Comprueba también que un contratado después de mejorar rapidez usa el nivel vigente. Las descargas parciales deben seguir funcionando.
6. **Mesas y filas:** compra las dos mesas inferiores y recorre pasillos/puntos de limpieza. Comprueba rechazo sin gasto si estás sobre una futura mesa. Deja crecer las filas: plazas separadas, extensión exterior, sin círculos. Con todas las mesas asignadas, los pedidos para llevar siguen avanzando si hay stock. El jugador no sale al tramo peatonal.
7. **Lectura visual:** compara en DEV el inventario con torres de 10 ingredientes, 7 platos y 5 residuos; prueba después 16 simultáneos por categoría aplicable. Observa también las torres del personal. Deja esperar clientes visibles: algunos comentan, nunca más de dos a la vez, sin tapar carga; al atender se retira su mensaje.
8. **Cooperación y reinicio:** produce y limpia junto al personal, verificando que cada unidad se transfiere una vez y que las reservas permiten trabajar sobre otros recursos. Reinicia con mejoras, filas, comentarios y producción activos. Deben desaparecer empleados, tareas, cargas, pedidos, reservas y mesas compradas; gasto cero, demanda base sin activar, comentarios vacíos y límites/tiempos iniciales.

Llegar de forma natural a todas las cargas y filas máximas puede requerir una partida prolongada. Las pruebas automatizadas preparan además esos estados para comprobarlos de forma reproducible; no hay dinero gratis en la interfaz.

## Organización y límites

Equilibrio y controles en `src/config.ts`; distribución en `src/world/layout.ts`. Restaurant coordina clientes, mesas, compras, dinero y reservas; Production ejecuta transferencias sobre el Inventory del actor; Staff mantiene las dos profesiones. Las reglas no dependen de Phaser/DOM. Graphics reutilizados para las torres; sin ECS ni framework adicional.

Diseño detallado en [GAME_DESIGN.md](docs/GAME_DESIGN.md), alcance en [ROADMAP.md](docs/ROADMAP.md) y resultados en [VERIFICATION.md](docs/VERIFICATION.md).

Balance y arte provisionales. No hay guardado: recargar empieza de cero. Los personajes pueden cruzarse. Delta activo máximo 100 ms: por debajo de 10 FPS la simulación avanza más despacio. Se conserva el aviso de tamaño del bundle de Phaser. Escritorio y móvil emulado verificados; pendientes sensaciones en teléfono físico, balance manual y otros navegadores.

**Detener aquí para revisión.** No añadir recetas, más hornillos, niveles del personal, cajero, tutoriales, arte final ni guardado. Sin publicación ni push.
