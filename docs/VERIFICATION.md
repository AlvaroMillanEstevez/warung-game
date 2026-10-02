# Verificación del hito 2

Fecha: 2026-10-02. El hito 1 fue revisado y aprobado manualmente por el usuario antes de este encargo.

## Entorno y compilación

- WSL Ubuntu 22.04, Node 24.18.0 y npm 11.16.0.
- Se conservan Phaser 4.2.1, Vite 8.3.2 y TypeScript 7.0.2.
- No se han añadido dependencias. El mínimo de Node pasa a 22.18 para el ejecutor nativo de pruebas sobre módulos TypeScript.
- `npm test`: **10 pruebas correctas**.
- `npm run typecheck`: correcto.
- `npm run build`: correcto, incluida la revisión final de la barra de permanencia.
- `git diff --check`: correcto.
- `npm install --package-lock-only --ignore-scripts`: metadatos sincronizados; auditoría sin vulnerabilidades.
- Vite conserva el aviso por el tamaño del bundle: aprox. 1.401 kB sin comprimir / 366 kB gzip. No se ha ocultado el aviso.
- La versión compilada se sirvió con `npm run preview`: carga, desplazamiento con teclado, permanencia y recogida de ingredientes correctos. Solo solicitó HTML, JS y CSS del servidor local.
- No se han hecho commits, push, publicaciones ni cambios de red.

## Pruebas pequeñas de reglas

En `tests/production.test.mjs`, con `node:test` y sin framework adicional:

1. Una unidad transportada: el frigorífico no duplica ni sustituye lo que se lleva.
2. Transferencia única al hornillo, rechazo de recogida temprana y de carga con hornillo ocupado.
3. Mostrador lleno: se conserva la sexta ración; depósito y descarte no duplican unidades.
4. Un comando elegido antes revalida origen/destino al ejecutarse.
5. Reiniciar limpia producción, carga, existencias y finalización.
6. Seguir en la zona no encadena carga/recogida, tampoco tras cancelar o cambiar selección.
7. Intentar moverse cancela aunque el cuerpo no se desplace.
8. Salir, cambiar de estación o perder una condición reinicia el plazo.
9. Cancelar elimina progreso parcial; no se añade tiempo a una simulación detenida.
10. El reinicio libera también los bloqueos de permanencia.

## Navegador

Edge/Chromium 154.0.4258.48 en modo headless, con Playwright ya disponible en el entorno. Scripts y capturas locales en `artifacts/hito2-*`, fuera de Git; no se incorpora una suite extensa al proyecto.

### Circuitos reales de entrada

- **Teclado:** se recorrió físicamente el mapa desde el punto inicial y se produjeron/depositaron **cinco raciones** hasta completar el mostrador. El recorrido no escribió inventario ni recolocó al jugador.
- Se esperó junto al hornillo después de cargar hasta terminar la cocción: la ración no se recogió automáticamente. Fue necesario salir y regresar.
- La cocción continuó al alejarse.
- Tras depositar, permanecer sobre el punto no repitió transferencias.
- **Táctil emulado:** se recorrió el circuito completo de una ración mediante contacto inicial, arrastre relativo y liberación, sin modificar el estado para adelantarlo.

### Escenarios aislados

Se utilizaron posiciones/estados controlados para aislar estas condiciones:

- Empujar contra el frigorífico durante más de 1,5 s no activa la recogida.
- Una pulsación breve de movimiento reinicia progreso parcial.
- El botón provisional reinicia sin recargar y sin iniciar movimiento táctil.
- La pérdida de foco cancela entrada/permanencia; la cocina no avanza durante la pausa ni compensa tiempo al recuperar foco.
- Un evento de visibilidad con documento oculto simulado pausa la cocción. Restaurar visibilidad no añade progreso offline.
- La sexta ración permanece en las manos al intentar depositar en un mostrador lleno.
- La papelera descarta mediante permanencia una sola vez; con manos vacías explica que no hay nada que descartar.
- Las mesas no se seleccionan ni generan acciones.

### Arrastre, cámara e interfaz

Pasaron 27 comprobaciones en la ejecución táctil final, incluyendo:

- Volver al origen detiene manteniendo contacto.
- Un segundo dedo no mueve ni cambia el origen; no hereda el control al levantar el primero.
- Cancelar el gesto detiene al jugador y elimina el indicador.
- Un pequeño desplazamiento dentro de la tolerancia permite la permanencia.
- Rotar/redimensionar cancela el gesto y el progreso.
- La captura de Pointer Events libera correctamente al soltar fuera del área; esta salida se ejercitó con un puntero de ratón.
- Lienzo cubriendo exactamente el viewport, sin scroll y con zoom uniforme a 320×568, 390×844, 568×320 y 844×390.
- Interfaz y botón dentro del viewport, sin desbordamiento en esos tamaños.
- Ningún error de consola ni excepción en la ejecución táctil final y en las comprobaciones complementarias.

Durante las pruebas se corrigió un aviso de Phaser al intentar cancelar un touchcancel no cancelable: se deshabilitaron sus manejadores redundantes y se mantuvo una única implementación de entrada mediante Pointer Events.

## Revisión visual

Se inspeccionaron capturas de escritorio, móvil vertical y horizontal: local, carga, hornillo listo y mostrador completo. Se ajustó la carga para que siga visible al mirar hacia arriba. La barra de permanencia se trasladó debajo del nombre de la estación y se verificó visualmente para evitar que el cuerpo del jugador la oculte.

La distribución y las huellas de los muebles del hito 1 se conservaron. El encuadre nuevo muestra una parte del restaurante cuando hace falta y sigue al jugador; no deforma ni redistribuye el local.

## No comprobado físicamente

- Teléfono/tableta reales, sensaciones con dedos físicos y barras dinámicas de Safari/iOS.
- Safari, Firefox, hardware lento o sesiones prolongadas.
- Muescas y zonas seguras reales: se usan variables CSS env, pero las capturas emuladas no reproducen un dispositivo con muesca.
- Acceso desde otro dispositivo mediante la red de WSL/firewall.
- Cambios de aplicación nativa: foco/visibilidad se comprobaron con eventos y estado simulados, no con una sesión manual de cambio de aplicaciones.

La emulación móvil no se presenta como prueba en un teléfono físico. El siguiente paso es la revisión manual de esta base de producción por el usuario.
