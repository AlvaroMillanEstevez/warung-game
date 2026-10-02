# Warung Kita

Prototipo de un pequeño restaurante indonesio para navegador. **Hito 1: espacio, movimiento e interacciones de prueba.** No se han implementado clientes, cocina, inventario, empleados, economía ni guardado.

## Arrancar desde WSL

```bash
cd /home/koke/projects/warungGame
npm ci
npm run dev
```

Abre **http://localhost:5173/** desde el navegador de Windows. Las dependencias ya están instaladas en esta entrega; `npm ci` sirve para reinstalar exactamente el lockfile. El servidor escucha en todas las interfaces para permitir pruebas locales. El puerto es fijo: si está ocupado, Vite lo indica en lugar de cambiarlo silenciosamente.

Para probar en un móvil físico, usa la dirección LAN del ordenador y el puerto 5173. Según la configuración de WSL2, puede requerir red reflejada o reenvío del puerto y permiso del firewall; la IP interna de WSL no siempre es accesible desde el teléfono. No se ha configurado ni modificado la red del equipo.

## Versiones

| Herramienta | Versión comprobada / instalada |
| --- | --- |
| Node.js (WSL) | 24.18.0 |
| npm (WSL) | 11.16.0 |
| Phaser | 4.2.1 |
| Vite | 8.3.2 |
| TypeScript | 7.0.2 |

Node debe satisfacer `^20.19.0 || >=22.12.0`, el requisito de Vite. npm 10 o superior. Las dependencias directas están fijadas y todas las transitivas se registran en `package-lock.json`. El juego se sirve íntegramente desde este proyecto, sin assets remotos, CDN, backend o llamadas a servicios.

Referencias: [Phaser 4.2.1](https://github.com/phaserjs/phaser/releases/tag/v4.2.1), [Graphics de esa versión, con JSDoc](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/graphics/Graphics.js), [ScaleManager 4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js), [guía de Vite](https://vite.dev/guide/). Las declaraciones de API usadas están también en `node_modules/phaser/types/phaser.d.ts`.

## Comandos

- `npm run dev`: Vite con recarga durante desarrollo, puerto 5173.
- `npm run typecheck`: comprobación estricta, sin emitir archivos.
- `npm run build`: comprueba tipos y produce `dist/`.
- `npm run preview`: sirve la compilación en http://localhost:4173/.

## Controles y alcance

- WASD o flechas: mover; diagonales normalizadas.
- E: interactuar una vez por pulsación con la estación válida más cercana.
- En pantallas táctiles o estrechas: joystick analógico y botón Interactuar. Se pueden usar simultáneamente.
- Acércate a los pequeños puntos del suelo: la estación elegida se ilumina y su nombre aparece debajo del local.
- La respuesta es únicamente «Nombre: interacción preparada». No modifica datos del juego.
- Al perder foco, ocultar la página, redimensionar, soltar o cancelar el gesto se limpia la entrada.
- Las estaciones son frigorífico, hornillo, mostrador, dos mesas y papelera.

Los gráficos se dibujan con Phaser (Graphics, formas y texto), sin imágenes externas. El local se muestra completo, con cámara fija y proporción constante; los controles HTML conservan su tamaño táctil aunque el lienzo se reduzca.

## Mapa del código

- `src/main.ts`: configuración de Phaser, arranque y ajuste del lienzo.
- `src/config.ts`: tamaños del mundo, paleta, velocidad, cuerpo de colisión y alcance.
- `src/scenes/RestaurantScene.ts`: composición de la escena y mensajes de prueba.
- `src/entities/Player.ts`: personaje, orientación y movimiento en unidades por segundo.
- `src/entities/Controls.ts`: teclado, joystick, foco y cancelación.
- `src/world/layout.ts`: datos de estaciones, huellas y puntos de acceso.
- `src/world/room.ts` y `Station.ts`: representación gráfica.
- `src/world/collision.ts` y `interaction.ts`: movimiento y selección con visibilidad.
- `src/style.css` e `index.html`: interfaz y controles adaptables.

La posición del jugador representa el centro de sus pies. Su huella rectangular se compara con huellas de muebles expandidas por la mitad de su cuerpo. Pequeños subpasos evitan atravesar muebles en un frame lento y permiten deslizar por sus bordes. La profundidad del personaje usa la Y de los pies; la del mueble, el borde frontal de su huella. Su altura visual no se usa para bloquear el paso.

La velocidad usa delta en segundos, con límite de 100 ms para evitar saltos tras bloqueos prolongados. En condiciones normales es independiente de FPS; por debajo de 10 FPS se limita deliberadamente el avance. Una línea hasta el punto de interacción se comprueba contra todas las huellas expandidas, incluida la estación objetivo.

## Comprobaciones y revisión manual

```bash
npm run typecheck
npm run build
```

Consulta `docs/VERIFICATION.md` para los resultados concretos de esta entrega.

1. Camina con WASD y flechas; compara una recta con una diagonal.
2. Empuja cada mueble y las cuatro paredes; comprueba que puedes rodearlos.
3. Pasa por detrás y por delante de las mesas y del mostrador.
4. Acércate a cada punto, pulsa E y comprueba los seis nombres.
5. Intenta interactuar desde detrás de un mueble: no debe elegirse a través de él.
6. Mantén movimiento y cambia de ventana; al volver debes estar parado.
7. Reduce la ventana, gira la pantalla y prueba joystick + Interactuar a la vez.
8. Arrastra el joystick fuera del círculo y suelta: se centra y deja de mover.

## Límites conocidos

Es una base, con geometría provisional y colisiones rectangulares; no hay navegación automática ni animaciones de sprites. En móvil vertical el local completo se reduce: los nombres de estación también están en la interfaz con texto legible. El soporte de navegador exige un navegador moderno. El bundle completo de Phaser produce un aviso de tamaño de Vite (aprox. 1,39 MB antes de gzip); no impide compilar. No hay service worker ni garantía de uso sin conexión tras cerrar la página. No se ha publicado el proyecto.
