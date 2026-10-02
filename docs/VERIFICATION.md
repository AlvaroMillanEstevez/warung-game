# Verificación del hito 1

Fecha: 2026-10-02. Entorno: WSL Ubuntu 22.04, Node 24.18.0, npm 11.16.0.

## Compilación y dependencias

- `npm install`: correcto; 19 paquetes instalados, auditoría sin vulnerabilidades.
- `npm ls --depth=0`: Phaser 4.2.1, TypeScript 7.0.2, Vite 8.3.2.
- `npm run typecheck`: correcto.
- `npm run build`: correcto, genera `dist/`.
- Aviso de Vite: bundle JS de Phaser y juego de aproximadamente 1.391 kB sin comprimir / 363 kB gzip. No es un error; se conserva visible y no se ha ocultado aumentando el umbral.
- No se ha publicado, hecho push, creado remotos ni modificado trabajo previo. El directorio inicial solo contenía un repositorio Git sin commits.

## Pruebas funcionales en navegador

Edge/Chromium 154.0.4258.48 en modo headless, con Playwright ya disponible en el entorno. No se añadió ninguna dependencia de pruebas al proyecto. Los scripts y las capturas de esta comprobación están en `artifacts/`, excluido de Git.

Pasaron **47 comprobaciones**, combinando entrada de teclado y táctil, lectura de estado de la escena y comprobaciones geométricas:

- W y flechas producen desplazamiento; diagonales normalizadas.
- Simulación de movimiento a 30, 60 y 120 FPS: 185 unidades en un segundo en espacio libre.
- Colisiones con las seis estaciones usando movimiento de teclado.
- Límites del local y subpasos frente a desplazamientos grandes.
- Los seis puntos de interacción permiten colocar al jugador y están conectados a la zona inicial (búsqueda sobre la geometría).
- Selección de una sola estación, priorizando el punto válido más cercano.
- Rechazo de interacciones desde detrás de muebles y a través de un obstáculo próximo.
- Interacción E y mensaje correspondiente en frigorífico, hornillo, mostrador, ambas mesas y papelera.
- Profundidad del jugador respecto a mostrador y mesas, por delante y por detrás.
- Limpieza de teclas y parada al emitir pérdida de foco; recuperar foco no reanuda teclas antiguas.
- Movimiento mediante eventos táctiles de navegador y parada tras touchCancel.
- Joystick e interacción con un segundo dedo simultáneos.
- Sin desplazamiento de página por el gesto sobre el joystick.
- Cancelación del gesto al redimensionar.
- Proporción del mundo conservada; controles y mensajes visibles sin desbordamiento en 320×568 y 844×390.
- Interfaz completa visible en escritorio a 1280×720.
- Ninguna excepción ni error de consola durante la ejecución.

La prueba coloca al jugador en posiciones controladas para aislar cada colisión/interacción; comprueba además la conectividad geométrica del local. Las pruebas de FPS invocan la actualización con deltas controlados: no constituyen un benchmark de dispositivos.

## Revisión visual

Se inspeccionaron capturas de escritorio (1440×1080), móvil vertical (390×844 y 320×568) y móvil horizontal (844×390), además de capturas del jugador delante y detrás del mostrador y de una mesa. El local permanece completo, el personaje queda correctamente tapado por los muebles al pasar detrás y se dibuja encima al pasar delante.

Se corrigieron los desbordamientos detectados inicialmente a 1280×720, 320×568 y 844×390.

## Compilación servida

Se arrancó `npm run preview` en el puerto 4173 y se comprobó por separado la versión compilada: carga del lienzo, desplazamiento con A e interacción con Mesa 1. Sin errores de consola. Las únicas solicitudes de la página fueron HTML, JS y CSS del servidor local; no hubo llamadas externas.

## Pendiente de comprobar

- Teléfono o tableta físicos y sensaciones con dedos reales.
- Safari/iOS, Firefox y navegadores antiguos.
- Rendimiento prolongado o hardware de baja potencia.
- Acceso desde otro dispositivo a través de la red de WSL y del firewall.
- La pérdida de foco se verificó mediante eventos de navegador; no se automatizó un cambio de aplicación nativa.

El navegador integrado no pudo arrancar por un fallo del entorno de automatización. La verificación se completó con Edge headless y revisión de sus capturas; no se presenta como una sesión de juego manual en un dispositivo real.
