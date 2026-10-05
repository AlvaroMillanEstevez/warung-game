# Verificación de localización es / en / id

Fecha: 2026-10-05. La renovación visual anterior está aprobada manualmente. Esta entrega añade idiomas y mantiene reglas, balance y funcionamiento. Pendiente revisión lingüística humana, especialmente indonesio.

## Comprobaciones ejecutadas

- npm test: **67 pruebas correctas** (62 de reglas/controles existentes y 5 de localización), node:test sin framework adicional.
- npm run typecheck: correcto.
- npm run build: correcto. JavaScript **1.470,63 kB / 387,38 kB gzip**. Permanece el aviso de bundle Phaser superior a 500 kB.
- git diff --check: correcto.
- Phaser 4.2.1, TypeScript estricto, Vite, npm y package-lock.json conservados; sin dependencias nuevas.
- No se usaron APIs de traducción ni servicios externos. Sin publicación ni push.

Los cambios de los modelos solo sustituyen respuestas textuales por claves/parámetros tipados. No cambian ramas de decisión, transferencias, precios, velocidades, reservas, recorridos o relojes. Las aserciones antiguas sobre frases españolas ahora comprueban claves estables.

## Pruebas de localización

- **122 claves** por catálogo, mismos parámetros por clave y ningún texto vacío.
- Elección guardada válida prioritaria; elección inválida ignorada.
- Orden de preferencias del navegador, es-ES/es-MX, en-US/en-GB e id-ID; mayúsculas y respaldo inglés.
- Lectura y escritura de almacenamiento bloqueadas, incluidos errores al acceder a window.localStorage.
- Solo se escribe warung-kita.language al elegir; detectar no persiste una elección implícita.
- Clave ausente recupera inglés y registra un aviso una vez por idioma/clave; el adaptador del juego solo avisa en desarrollo.
- Parámetros numéricos con Intl.NumberFormat para es-ES/en-US/id-ID, incluidos miles y decimales.
- Cambio de idioma sin mutar el descriptor de mensaje; suscripciones y cancelación.

## Navegador real, escritorio y móvil emulado

Edge/Chromium headless con Playwright ya disponible en el entorno. **Cero errores de consola/excepciones y cero avisos de traducción ausente** en el recorrido final. Capturas abiertas e inspeccionadas, además de las comprobaciones automatizadas.

Se probaron siete arranques reales: español como segunda preferencia tras francés, indonesio regional, inglés regional, preferencias no soportadas, guardado prioritario, guardado corrupto y almacenamiento bloqueado. El selector funciona también sin almacenamiento.

En el local ampliado con seis mesas, dos hornillos, dos cocineros, limpieza y ocho clientes:

- Apertura por permanencia en oficina, pausa y selector mediante eventos de interfaz.
- Se serializó el estado completo de Restaurant, incluidos Maps, antes/después de cada cambio es/en/id: **idéntico**, con dinero, inventarios, clientes, empleados, tareas, reservas y temporizadores.
- Misma instancia de cada vista de cliente/empleado, sin reconstruir el restaurante.
- HUD y saldo con números locales; todos los marcadores, profesiones, comentarios, aviso contextual y transferencia activa actualizados.
- Subtítulo mural traducido, dentro de la placa; textura de texto Phaser existente regenerada.
- Estados disponible, fondos insuficientes y máximo observados en panel. Requisito de segundo cocinero comprobado y capturado en los tres idiomas.
- Confirmación de compra traducida después de cambiar de idioma.
- Cierre mantiene bloqueo hasta salir de oficina; teclado vuelve a mover tras cerrar.
- Reinicio DEV conserva idioma y borra partida. Recargar conserva idioma y vuelve a saldo cero.
- localStorage contiene únicamente la preferencia, sin serialización del restaurante.

Se prepararon fondos, compras, inventarios, algunos mensajes y posiciones para aislar los casos. Los cambios de idioma del panel se hicieron con el selector real. Las capturas generales del mundo usan un encuadre de documentación; las móviles mantienen la cámara del juego.

## Presentación móvil

Los tres idiomas se comprobaron en **390 × 844, 320 × 568, 844 × 390 y 568 × 320** píxeles CSS: doce combinaciones.

- Diálogo dentro de pantalla, sin desbordamiento horizontal; selector contenido.
- Cabecera y Cerrar visibles incluso al desplazar hasta la última tarjeta, objetivo de 46 px.
- Traducciones largas envuelven en paneles estrechos; precios y requisitos pasan a otra línea cuando hace falta.
- Capturas verticales de paneles y mensajes en los tres idiomas inspeccionadas; también horizontal y escritorio.
- Cierre por toque no provoca reapertura inmediata. Pausas y controles conservados.

La prueba es emulación táctil, no un teléfono físico ni una evaluación de comodidad real. Sin certificación Safari/iOS o Firefox ni de rendimiento prolongado en móviles lentos.

## Evidencia local

En artifacts/, ignorado por Git:

- i18n-qa.cjs e i18n-qa-results.json: recorrido y resultados.
- i18n-desktop-{es,en,id}-panel.png: panel ampliado.
- i18n-world-{es,en,id}.png: rótulos, personal y mensajes.
- i18n-mobile-{390,320,844,568}-{es,en,id}-panel.png: panel en cada orientación/tamaño.
- i18n-mobile-{es,en,id}-messages.png: mensajes y cámara de móvil.
- i18n-requirement-{es,en,id}.png: requisito de contratación.

Las evidencias visual-* corresponden a la renovación visual anterior, ya aprobada. team-*, local-* y experience-* son revisiones más antiguas.

Guía y excepciones en [LOCALIZATION.md](LOCALIZATION.md); catálogo indonesio en [id.ts](../src/i18n/catalogs/id.ts). Detener para revisión, sin añadir funcionalidades.
