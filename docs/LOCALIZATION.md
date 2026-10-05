# Localización es / en / id

2026-10-05. La renovación visual anterior está aprobada manualmente. Se añade localización sin modificar reglas, balance, controles, cámara ni guardado de partida.

## Catálogos para revisión

| Idioma | Catálogo |
| --- | --- |
| Español | [src/i18n/catalogs/es.ts](../src/i18n/catalogs/es.ts) |
| English | [src/i18n/catalogs/en.ts](../src/i18n/catalogs/en.ts) |
| Bahasa Indonesia | **[src/i18n/catalogs/id.ts](../src/i18n/catalogs/id.ts)** |

Hay 122 claves estables en cada catálogo. Inglés define el tipo Key; español e indonesio deben satisfacer el mismo conjunto mediante TypeScript. Una prueba comprueba igualdad de claves, textos no vacíos y los mismos parámetros por traducción. No se añadió una biblioteca de idiomas ni se usan servicios externos.

Para revisar el indonesio con una hablante nativa:

1. Editar solo el texto a la derecha de cada clave en id.ts, conservando comillas y estructura.
2. Mantener marcadores como {count}, {price}, {capacity}, {slots} y {seconds}; pueden cambiar de posición en la frase. Los números se formatean automáticamente.
3. Mantener Warung Kita y nasi goreng. Los nombres del selector se muestran siempre en su idioma nativo. El rótulo cultural Selamat datang permanece en la alfombra.
4. Revisar especialmente station.*, effect.*, reason.* y comment.* en el contexto del juego. Los comentarios deben ser breves y amistosos; no implican paciencia ni penalizaciones.
5. Ejecutar npm test y npm run typecheck; comprobar la oficina y bocadillos en 320/390 px y horizontal. No modificar claves para corregir una traducción.

Las traducciones están redactadas e integradas, pero no se presentan como revisadas por una hablante nativa.

## Textos incluidos

Panel de oficina completo: cabecera, selector, saldo, nombre/efecto/nivel/siguiente mejora, precio, estado, requisitos, máximos, confirmaciones y compra rechazada. También dinero del HUD, avisos de pausa y demanda, límites de carga, problemas de acción, feedback de transferencias, rótulos de estaciones y filas, profesiones, comentarios de clientes, subtítulo mural, título/descripción de página y etiquetas de accesibilidad. Título y botones de DEV incluidos.

Excepciones: Warung Kita, nasi goreng y Selamat datang decorativo. El volcado de datos de DEV conserva sus nombres de campo, IDs, estados y claves de mensaje como datos técnicos; los errores de invariantes dirigidos a la consola tampoco son mensajes de juego. No hay instrucciones de juego sin traducir.

## Selección y almacenamiento

Al iniciar, se lee warung-kita.language. Solo es, en o id son elecciones guardadas válidas. Sin una, se recorre navigator.languages en orden, usando navigator.language si la lista está vacía. Se reconoce la subetiqueta base de variantes como es-ES, es-MX, en-US, en-GB e id-ID, sin distinguir mayúsculas. Si ninguna coincide, inglés.

No se usa ubicación, IP ni zona horaria. Detectar un idioma no escribe una preferencia: solo elegir en el selector la guarda. El acceso y la escritura a localStorage están protegidos ante excepciones; si se bloquean, el idioma cambia para la sesión. No hay persistencia del restaurante. Reiniciar desde DEV no borra la preferencia; recargar restaura solo el idioma, con partida nueva.

## Integración ligera

- core.ts es independiente de Phaser/DOM: selección, almacenamiento tolerante, catálogos, suscripción específica al idioma y formateador. Intl.NumberFormat usa es-ES, en-US o id-ID; se reutiliza por idioma.
- index.ts conecta navegador/DOM y registra avisos de claves ausentes solo en desarrollo, una vez por idioma/clave. La ausencia recurre al catálogo inglés.
- Los modelos devuelven Key o Message ({ key, params }), nunca una traducción ligada a un idioma. Clientes y tareas conservan sus claves. Las condiciones no comparan frases traducidas.
- El selector actualiza documento y panel, rótulos de Phaser, feedback, avisos y bocadillos ya visibles. Se conserva su duración restante; no se reinician relojes ni se muta la simulación.
- localizedLabel actualiza setText y regenera la textura de texto de Phaser. Rótulos estrechos admiten ancho máximo. No hay texto funcional incrustado en imágenes descargadas o texturas estáticas.
- Cada etiqueta retira su suscripción al destruirse; panel y escena también la liberan. No se reconstruye el restaurante al cambiar de idioma.
- La cabecera conserva Cerrar fijo; las tarjetas y controles permiten saltos de línea en móvil. HUD sigue mostrando únicamente dinero.

## Verificación y límites

Resultados, capturas y tamaños en [VERIFICATION.md](VERIFICATION.md). El navegador emulado no acredita comodidad en teléfono físico. Pendiente revisión lingüística humana, especialmente indonesio. Sin publicación ni push.
