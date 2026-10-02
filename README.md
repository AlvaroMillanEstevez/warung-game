# Warung Kita

Juego de gestión de un pequeño restaurante indonesio para navegador. **Hito 2: controles por arrastre, interacción por permanencia y producción manual de nasi goreng.** La base del hito 1 fue revisada y aprobada manualmente por el usuario.

## Ejecutar desde WSL

```bash
cd /home/koke/projects/warungGame
npm ci
npm run dev
```

Abre **http://localhost:5173/** en Windows. Las dependencias ya están instaladas; `npm ci` reinstala exactamente el lockfile. Vite escucha en todas las interfaces y usa el puerto fijo 5173. Para un móvil físico, usa la IP LAN del ordenador; WSL2 puede necesitar red reflejada o reenvío de puerto y permiso del firewall. Este proyecto no modifica la red del equipo.

## Requisitos y comandos

Node **22.18 o posterior** y npm 10 o posterior. Se ha comprobado con Node 24.18.0 y npm 11.16.0 en WSL Ubuntu 22.04. El requisito de Node permite ejecutar las pequeñas pruebas TypeScript con el soporte nativo de Node, sin añadir un framework.

| Dependencia | Versión fijada |
| --- | --- |
| Phaser | 4.2.1 |
| Vite | 8.3.2 |
| TypeScript | 7.0.2 |

- `npm run dev`: desarrollo en http://localhost:5173/.
- `npm run typecheck`: TypeScript estricto.
- `npm test`: pruebas pequeñas de producción y permanencia, con el ejecutor nativo de Node.
- `npm run build`: tipos y compilación en `dist/`.
- `npm run preview`: previsualización de `dist/` en http://localhost:4173/.

El código usa las declaraciones y el JSDoc de la versión instalada de Phaser. Referencias: [Phaser 4.2.1](https://github.com/phaserjs/phaser/releases/tag/v4.2.1), [cámara de esa versión](https://github.com/phaserjs/phaser/blob/v4.2.1/src/cameras/2d/Camera.js), [ScaleManager 4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js).

## Controles actuales

**Ordenador:** WASD o flechas. También se puede probar el arrastre con ratón.

**Táctil:** apoya un dedo en el lienzo y desplázalo respecto al punto inicial. La dirección y distancia controlan el movimiento. Volver cerca del origen detiene al jugador sin soltar; levantar el dedo también lo detiene. No se camina hacia un destino tocado. Un indicador aparece solo durante el gesto. Los dedos adicionales no toman el control y los botones de interfaz no inician movimiento.

**Acción automática:** permanece quieto **1,5 segundos** en un punto accesible. Aparece una barra junto a la estación. Solo se elige una estación; se conservan distancia y línea libre de obstáculos. Si intentas moverte —incluso contra un mueble o con teclas opuestas—, sales de la zona, cambias de estación o deja de ser válida la acción, el progreso vuelve a cero.

Después de completar una acción debes **salir de su radio y volver a entrar** para activar otra. Esperar sobre el hornillo no encadena carga y recogida. Pausar o cambiar de selección sin salir no elimina ese bloqueo.

La pérdida de foco, pestaña oculta, cancelación del gesto y redimensionado limpian controles y permanencia. Mientras la pestaña esté oculta o sin foco, la simulación queda pausada. Al volver no se suma tiempo offline.

## Circuito manual

1. Ve al punto del **frigorífico**, con las manos vacías. Quédate quieto 1,5 s para recibir ingredientes para nasi goreng.
2. Ve al **hornillo vacío** y espera 1,5 s. Se transfieren los ingredientes y comienza la cocción.
3. Sal de la zona. El hornillo cocina durante **4 s**, aunque te alejes.
4. Cuando indique **Listo**, vuelve con manos vacías y espera 1,5 s para recoger la ración.
5. Llévala al **mostrador** y espera 1,5 s para depositarla.
6. Repite hasta **5 raciones**: se anuncia que el circuito de prueba está completado.

Solo transportas una unidad. El frigorífico tiene suministro ilimitado; el hornillo procesa una ración cada vez. Si el mostrador está lleno, conservas la ración. La **papelera** descarta lo transportado con la misma permanencia; con manos vacías no hace nada. Las mesas conservan gráficos y colisiones y no ofrecen acciones.

El botón **DEV · provisional / Reiniciar prueba** vacía manos, hornillo, existencias y progreso, y devuelve al jugador al inicio sin recargar. Es una herramienta temporal de desarrollo, no una mecánica de progresión.

## Pantalla y representación

El lienzo ocupa el área visible del navegador, sin scroll ni paneles exteriores. Usa altura dinámica y márgenes seguros para la interfaz. No solicita fullscreen ni intenta ocultar las barras del navegador.

La cámara usa zoom uniforme, seguimiento suave y límites dentro del mundo. En móvil vertical se ve una parte del local y se recorre moviendo al jugador. Las posiciones, tamaños físicos y distribución del restaurante no cambian al redimensionar. El arrastre utiliza píxeles CSS relativos al contacto inicial, independientes del zoom y del desplazamiento de cámara; cualquier cambio de tamaño cancela el gesto anterior.

Todo el arte es provisional, dibujado con Phaser. Los pies determinan la profundidad; la colisión usa una huella rectangular pequeña, no la altura dibujada del personaje o los muebles. Se muestran la carga, el progreso/estado del hornillo y las raciones del mostrador. Las explicaciones y avisos aparecen dentro del juego y no lo bloquean.

## Código y parámetros

- `src/config.ts`: mundo, paleta, velocidad, cámara, alcance, permanencia, cocción, capacidad y control táctil.
- `src/main.ts`: Phaser con lienzo adaptable y observación del tamaño disponible.
- `src/scenes/RestaurantScene.ts`: coordinación, tiempo activo de simulación y presentación de estados.
- `src/entities/Controls.ts`: teclado y Pointer Events con captura; intención de movimiento y pausa.
- `src/entities/Player.ts`: representación del jugador y su carga.
- `src/simulation/Production.ts`: inventario, estados del hornillo y transferencias validadas; no depende de Phaser, DOM o controles.
- `src/simulation/DwellInteraction.ts`: permanencia, cancelación y bloqueo hasta salir.
- `src/world/layout.ts`: distribución original, huellas y accesos.
- `src/world/collision.ts` y `interaction.ts`: colisión y selección accesible.
- `src/world/room.ts`, `Station.ts` y `camera.ts`: representación y encuadre.
- `tests/production.test.mjs`: pruebas de reglas mediante Node.

Parámetros iniciales: `INTERACTION.dwellMs = 1500`, `PRODUCTION.cookingMs = 4000`, `PRODUCTION.counterCapacity = 5`. `CONTROLS` centraliza zona muerta, recorrido máximo y tolerancia; `CAMERA`, encuadre y suavizado.

## Verificación y límites

Consulta `docs/VERIFICATION.md` para pruebas realizadas y pendientes.

No hay clientes, colas, ventas, cobro, servicio, suciedad, empleados, economía o guardado. Recargar la página reinicia la prueba. Sin backend, assets remotos, servicios de IA, dependencias de pago, publicación o progreso offline.

El delta activo se limita a 100 ms para evitar saltos tras bloqueos; por debajo de 10 FPS la simulación avanza más despacio. El bundle de Phaser genera un aviso de tamaño en Vite (aprox. 1,40 MB / 366 kB gzip), sin impedir compilar. Las pruebas móviles por emulación no sustituyen a un teléfono físico ni garantizan Safari/iOS.
