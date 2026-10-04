# Warung Kita

Prototipo de gestión de un warung para navegador. Hitos 1–4, revisión de experiencia y cierre del primer local aprobados manualmente. **Revisión de oficina, cámara, demanda y segundo cocinero implementada, pendiente de revisión manual.**

## Ejecutar desde WSL

```bash
cd /home/koke/projects/warungGame
npm run dev
```

Abre [el juego local](http://127.0.0.1:5173/) en Windows. Node >=22.18, npm >=10; Phaser 4.2.1, TypeScript estricto y Vite. Sin dependencias nuevas; npm ci reinstala desde package-lock.json.

- npm test: reglas, transferencias, navegación y controles con node:test.
- npm run typecheck: tipos.
- npm run build: tipos y compilación de producción.
- npm run preview: versión compilada en el puerto 4173.

Vite escucha en todas las interfaces en el puerto fijo 5173. Acceder desde un teléfono físico puede requerir configuración LAN/WSL/firewall; el proyecto no cambia esa configuración.

## Jugar

WASD/flechas o arrastre relativo desde una zona libre del lienzo. Diagonales normalizadas, origen fijo en píxeles CSS y sin inercia. Soltar, cancelar, perder foco u orientar/redimensionar elimina entradas. Cámara centrada directamente en el jugador, ahora con **zoom ×0,85** respecto al encuadre anterior: 15 % más alejado, sin modificar mundo, velocidades, colisiones o radios. El dinero y los paneles conservan tamaño de pantalla.

Permanece quieto en un punto de acción. Cada ciclo transfiere una unidad o atiende a un cliente; si hay trabajo empieza otro ciclo completo. Intentar moverse cancela aunque no puedas desplazarte. Sin acción válida no se acumula progreso.

**Frigorífico → hornillo → Depositar → Caja.** Cada hornillo tiene cuatro posiciones independientes. Recoge ingredientes, carga, espera cocción, recoge platos y deposítalos en el mostrador. Stock sin límite; inventarios independientes de ingredientes, platos y residuos.

**Caja está detrás del mostrador**, arriba a la derecha: accede desde cocina por su pasillo izquierdo y gira a la derecha por detrás. Depositar está en el lateral izquierdo y tiene un punto distinto. No puedes cobrar desde el lado público ni desde laterales fuera de la zona trasera. Caja admite cualquier carga.

Una venta cobra 10 y entrega directamente una ración. Comer dentro reserva mesa, priorizando limpia. Si está sucia, el cliente espera con su plato junto a caja; limpiar conserva la reserva y lo envía al asiento. Solo come al llegar. Para llevar recibe comida y sale. La zona de mesa solo limpia; la papelera retira un residuo por ciclo.

## Oficina y compras

La **Oficina** está integrada en la pared izquierda. Su alfombra interior tiene el indicador de interacción. Permanece allí para abrir Mejoras; no hay mueble que bloquee el paso ni otra habitación. El panel pausa todo y cancela entradas. Tras cerrarlo debes salir de la zona y volver para reabrir.

| Compra | Efecto | Precio |
| --- | --- | --- |
| Contratar cocinero | Máximo dos; segundo requiere primero y segundo hornillo operativo | 100 / 220 |
| Limpieza | Una persona para mesas y residuos | 80 |
| Capacidad del equipo | 8 → 12 → 16 por categoría aplicable | 60 / 120 |
| Rapidez del equipo | 1,5 → 1,2 → 0,9 s por acción | 80 / 160 |
| Cocina más rápida | Nuevas cocciones: 4 → 3 → 2 s en ambos hornillos | 100 / 200 |
| Añadir mesa | Cuatro compras sucesivas: 2 → 6 mesas | 80 / 140 / 220 / 320 |
| Añadir hornillo | Una compra: 1 → 2, cuatro posiciones cada uno | 180 |

Capacidad y rapidez afectan al jugador y empleados actuales/futuros. Cada cocinero lleva ingredientes/platos; limpieza solo residuos. Las categorías no comparten espacio. Acciones y cocciones iniciadas conservan su duración; las siguientes usan la mejora. Rapidez no cambia desplazamiento ni consumo.

Una tarjeta de cocineros muestra requisito y precio siguiente; con dos muestra **Equipo completo**. Mesas: **Espacio completo** a seis. Hornillos: **Máximo alcanzado** a dos. Las compras revalidan saldo y nivel para cobrar una vez. Si un actor ocupa una huella futura se rechaza sin cobrar: cierra, despeja el espacio y vuelve. No quedan compras pendientes. Las rutas se recalculan desde posiciones actuales.

Mesas en dos columnas y tres filas, sin números en el escenario ni panel normal. Identificadores técnicos solo en DEV.

## Cooperación

Con un cocinero, puede usar ambos hornillos. Con dos, **Cocinero 1** (delantal amarillo) usa el inicial y **Cocinero 2** (delantal coral) el adicional. Comparten frigorífico y depósito, con carga y tareas propias. No cambian de hornillo para ayudarse. El jugador puede trabajar en cualquier posición libre de cualquiera.

El objetivo **conjunto de 12 raciones** cuenta stock del mostrador, platos transportados por cocineros, raciones cocinando/listas de ambos hornillos y reservas de cargas automáticas pendientes. No cuenta ingredientes ni duplica raciones. Reservar capacidad al comenzar el viaje evita que ambos reclamen la última unidad. Cancelar o invalidar libera capacidad y posición.

Al alcanzar el objetivo dejan de iniciar cocciones, pero recogen y depositan las ya producidas, incluidos lotes parciales. Reanudan tras ventas y conservan ingredientes sobrantes. La producción manual no tiene este límite y puede superar 12.

Limpieza prioriza reservas antiguas y después suciedad antigua. Vacía residuos cuando se llena o no queda tarea, aunque lleve uno. Ningún empleado cobra ni reparte.

## Inicio y demanda

El **primer desplazamiento efectivo** activa una cuenta atrás única de **8 segundos de simulación activa**. Después aparece el primer cliente en la entrada exterior y camina hacia su fila, aunque no se haya producido comida. Moverse contra un obstáculo sin desplazarse no activa el reloj. Detenerse no lo reinicia; paneles y pestaña oculta lo pausan. Depositar platos no influye.

Las llegadas posteriores usan intervalo base 8 s dividido por la frecuencia absoluta del tramo:

| Gasto en compras correctas | Frecuencia | Intervalo |
| --- | --- | --- |
| Menos de 300 | 0,8 | **10 s** |
| 300 a menos de 600 | 1,2 | **6,67 s** |
| Desde 600 | 1,5 | **5,33 s** |

Cambiar tramo muestra un aviso y comienza un intervalo nuevo completo, sin ráfaga ni deuda. Si aún no llegó el primero conserva su cuenta atrás. No se multiplican tramos entre sí ni se aumenta más allá del último. Ingresos, saldo e intentos fallidos no suman gasto.

Intención **70 % comer dentro / 30 % para llevar**, fijada una vez; filas **20/10**, máximo global **48**. Fila llena omite la llegada sin desviar intención ni acumular deuda. Mesas asignadas no impiden ventas para llevar.

## Recorrido manual de esta revisión

1. **Inicio:** abre DEV con F2 o mantén dinero 1,2 s; reinicia. Sin moverte no aparecen clientes. Da un paso y espera: primero a los 8 s activos sin necesitar comida. Abrir oficina o cambiar pestaña congela la cuenta.
2. **Oficina y encuadre:** acércate a la alfombra «Oficina» en pared izquierda. Prueba permanencia, pausa, cierre sin reapertura y salir/volver. Recorre bordes en vertical y horizontal: exterior completo, controles iguales y panel legible.
3. **Primera venta:** prepara platos y deposita; ve a Caja por detrás. Revisa cobro continuo y progreso visible. Desde delante no cobra.
4. **Contratación:** reúne 100 y contrata al primero. La misma tarjeta explica el requisito del segundo. Compra otro hornillo por 180; reúne 220 y contrata al segundo. Gasto acumulado 500 si solo hiciste estas compras: intervalo 6,67 s. La tarjeta queda en «Equipo completo». Otras compras hasta 600 activan 5,33 s.
5. **Trabajo simultáneo:** sitúate en el pasillo central de cocina para observar los dos hornillos. Cada cocinero toma ingredientes, camina al suyo, carga/recoge y deposita. Amarillo usa el izquierdo y coral el derecho. Sin ventas terminan en 12 raciones conjuntas; cobra varias y vuelve a mirar: ambos reanudan. Puedes producir en una posición libre sin duplicar recursos. DEV muestra asignaciones, stock, producción comprometida y cargas reservadas.
6. **Mejoras y ampliación:** prueba capacidad/rapidez antes y después de contratar; ambos heredan valores. Compra cuatro mesas por 80/140/220/320 y revisa circulación y limpieza. Huellas ocupadas rechazan sin cobrar.
7. **Reinicio:** con ambos trabajando, abre DEV y reinicia. Vuelve a dos mesas, un hornillo, ningún empleado, gasto cero, frecuencia 0,8 y espera del primer movimiento. Desaparecen tareas, inventarios, reservas, comentarios y referencias de interacción.

Los tests preparan fondos y estados de ocupación para casos concretos; no hay dinero gratis en interfaz.

## Organización y límites

Configuración en src/config.ts; distribución en src/world/layout.ts. Restaurant coordina compras, clientes, mesas, dinero y reservas, incluida capacidad de producción. Production realiza transferencias y cocina; Staff mantiene dos profesiones y sus identidades. Reglas independientes de Phaser/DOM; sin sistemas genéricos ni framework adicional.

Consulta [diseño](docs/GAME_DESIGN.md), [roadmap](docs/ROADMAP.md) y [verificación](docs/VERIFICATION.md).

Arte, precios y demanda provisionales. Sin guardado; recargar empieza de cero. Personajes pueden cruzarse. Delta activo máximo 100 ms: por debajo de 10 FPS avanza más despacio. Continúa el aviso del bundle de Phaser. Móvil emulado no acredita comodidad en teléfono físico; pendientes otros navegadores y balance manual.

**Detener tras esta revisión.** Sin nuevos locales, recetas, guardado, objetivos finales, más personal, publicación ni push.
