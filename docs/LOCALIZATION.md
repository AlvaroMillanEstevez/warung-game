# Localización es / en / id

2026-10-05. La localización base está aprobada manualmente. Los catálogos de cajero/encargos se amplían el 2026-10-11 con requisito del tablón, orientación hacia tablón/empaquetado y aviso de destino; sin biblioteca nueva ni guardado de partida. Revisión 2026-10-12: Preparar encargo, entrega/cobro en tablón, recompensa fijada y capacidad deshabilitada (ahora oculta).

## Catálogos para revisión

| Idioma | Catálogo |
| --- | --- |
| Español | [src/i18n/catalogs/es.ts](../src/i18n/catalogs/es.ts) |
| English | [src/i18n/catalogs/en.ts](../src/i18n/catalogs/en.ts) |
| Bahasa Indonesia | **[src/i18n/catalogs/id.ts](../src/i18n/catalogs/id.ts)** |

Hay 276 claves estables en cada catálogo. Inglés define el tipo Key; español e indonesio deben satisfacer el mismo conjunto mediante TypeScript. Una prueba comprueba igualdad de claves, textos no vacíos y los mismos parámetros por traducción. No se añadió una biblioteca de idiomas ni se usan servicios externos.

Para revisar el indonesio con una hablante nativa:

1. Editar solo el texto a la derecha de cada clave en id.ts, conservando comillas y estructura.
2. Mantener marcadores como {count}, {price}, {capacity}, {slots} y {seconds}; pueden cambiar de posición en la frase. Los números se formatean automáticamente.
3. Mantener Warung Kita y nasi goreng. Los nombres del selector se muestran siempre en su idioma nativo. El rótulo cultural Selamat datang permanece en la alfombra.
4. Revisar especialmente bulk.*, station.*, effect.*, reason.* y comment.* en el contexto del juego. Los comentarios deben ser breves y amistosos; no implican paciencia ni penalizaciones.
5. Ejecutar npm test y npm run typecheck; comprobar la oficina y bocadillos en 320/390 px y horizontal. No modificar claves para corregir una traducción.

Las traducciones están redactadas e integradas, pero no se presentan como revisadas por una hablante nativa.

## Textos incluidos

Panel de oficina completo: cabecera, selector, saldo, nombre/efecto/nivel/siguiente mejora, precio, estado, requisitos, máximos, confirmaciones y compra rechazada. También dinero del HUD, avisos de pausa y demanda, límites de carga, problemas de acción, feedback de transferencias, rótulos de estaciones y filas, profesiones, comentarios de clientes, subtítulo mural, título/descripción de página y etiquetas de accesibilidad. Título y botones de DEV incluidos. La ampliación añade contratación/requisitos del cajero, señales funcionales, tablón, ofertas, cantidades, base/bonus/plazo, tarjeta de progreso, empaquetado, objetivo, confirmación/devolución al cancelar y celebración de entrega.

Excepciones: Warung Kita, nasi goreng y Selamat datang decorativo. El volcado de datos de DEV conserva sus nombres de campo, IDs, estados y claves de mensaje como datos técnicos; los errores de invariantes dirigidos a la consola tampoco son mensajes de juego. No hay instrucciones de juego sin traducir.

## Selección y almacenamiento

Al iniciar, se lee warung-kita.language. Solo es, en o id son elecciones guardadas válidas. Sin una, se recorre navigator.languages en orden, usando navigator.language si la lista está vacía. Se reconoce la subetiqueta base de variantes como es-ES, es-MX, en-US, en-GB e id-ID, sin distinguir mayúsculas. Si ninguna coincide, inglés.

No se usa ubicación, IP ni zona horaria. Detectar un idioma no escribe una preferencia: solo elegir en el selector la guarda. El acceso y la escritura a localStorage están protegidos ante excepciones; si se bloquean, el idioma cambia para la sesión. La partida normal y DEV se guardan por separado; reiniciar no borra la preferencia. Recargar ofrece continuar la partida guardada.

## Integración ligera

- core.ts es independiente de Phaser/DOM: selección, almacenamiento tolerante, catálogos, suscripción específica al idioma y formateador. Intl.NumberFormat usa es-ES, en-US o id-ID; se reutiliza por idioma.
- index.ts conecta navegador/DOM y registra avisos de claves ausentes solo en desarrollo, una vez por idioma/clave. La ausencia recurre al catálogo inglés.
- Los modelos devuelven Key o Message ({ key, params }), nunca una traducción ligada a un idioma. Clientes y tareas conservan sus claves. Las condiciones no comparan frases traducidas.
- El selector actualiza documento y panel, rótulos de Phaser, feedback, avisos y bocadillos ya visibles. Se conserva su duración restante; no se reinician relojes ni se muta la simulación.
- localizedLabel actualiza setText y regenera la textura de texto de Phaser. Rótulos estrechos admiten ancho máximo. No hay texto funcional incrustado en imágenes descargadas o texturas estáticas.
- Cada etiqueta retira su suscripción al destruirse; panel y escena también la liberan. No se reconstruye el restaurante al cambiar de idioma.
- La cabecera conserva Cerrar fijo; las tarjetas y controles permiten saltos de línea en móvil. HUD mantiene dinero y añade una tarjeta compacta durante un encargo activo o listo para entregar.

## Actualización local desde Windows/WSL

Los textos de entrega bulk.ready, bulk.reward, bulk.readyHelp, bulk.claim y bulk.returnBoard están incluidos en los tres catálogos. Una prueba específica verifica su resolución y parámetros, además de la paridad general. Se ha comprobado su presentación en el navegador.

vite.config.ts activa sondeo de archivos únicamente cuando Node se ejecuta en WSL. Las ediciones desde Windows a través de la ruta de WSL pueden no generar los eventos que Vite espera; el sondeo evita mantener módulos antiguos durante desarrollo. Si una pestaña conservaba una versión previa, recargar obtiene los catálogos actuales y reinicia la partida. Esto no modifica la detección de idioma ni añade almacenamiento.

## Verificación y límites

Resultados, capturas y tamaños en [VERIFICATION.md](VERIFICATION.md). El navegador emulado no acredita comodidad en teléfono físico. La base tiene aprobación manual del usuario; las nuevas traducciones de encargos se ofrecen para revisión lingüística, especialmente indonesio. Sin publicación ni push.

Economía física: se localizan proveedor, ofertas, motivos de bloqueo, saldo/deuda/stock, bandeja, avisos iniciales y de reposición, amortización y recompensa neta de encargos. Revisar los valores de supplier.*, economy.*, bulk.rewardNet, bulk.firstPaidNet y bulk.paidNet en src/i18n/catalogs/id.ts con una hablante nativa.

Ajuste de suministro: supplier.largeLocked y supplier.largeUnlocked localizados en es/en/id; ofertas y confirmación reutilizan parámetros de cantidad/precio.

Apertura y guardado: claves opening.*, tutorial.*, session.*, save.* y common.cancel. Selector también en Partida y ajustes y pantallas de inicio/continuación para no depender de la oficina aún ausente. El idioma conserva su clave anterior independiente.

## Progresión normal (2026-10-21)

Nuevas claves opening.office/orders, tutorial.office/orders y progress.*: construcciones, precios, oficina, primera mesa con papelera, requisitos de limpieza y aviso de zona de encargos. Revisar especialmente estos textos en id.ts con una hablante nativa.
