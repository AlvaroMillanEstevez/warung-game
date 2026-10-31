# Dirección visual — primera renovación

2026-10-04. Reglas y balance aprobados manualmente. Renovación visual aprobada manualmente. Idiomas y base aprobados. El experimento posterior añade tablón, empaquetado y cajero conservando esta dirección.

## Restaurante de juguete

Vista 2D inclinada, caras superiores y frontales, bordes redondeados y sombras de contacto en tres capas tenues. Madera cálida y crema como base, verde jade para identidad/acciones, coral como acento. El exterior tiene menor saturación. Cocina cerámica verde pálida y comedor de madera se distinguen por material; la franja de fila es una variación del suelo, sin colisión.

Identidad indonesia discreta: Warung Kita, Dapur kecil · Cerita besar, Selamat datang y un pequeño motivo textil de cuatro pétalos. No se añaden objetos decorativos que parezcan estaciones.

Paleta, colores de estado, variantes de piel/vestuario, tipografía, contornos, radios, sombras, capas y medidas de carga en **src/visuals/theme.ts**. Exporta variables CSS para el HUD y paneles. Fuentes del sistema (Trebuchet MS/Segoe UI/Arial), sin descargas. Los textos del mundo se rasterizan a resolución 3 para evitar bordes borrosos al ampliar; Graphics con antialias y sin pixelArt.

## Correcciones de entrada y rótulo

La alfombra anterior estaba bajo el punto inicial del jugador, alejada de la entrada real. Ahora WELCOME_RUG está en x666/y739, 206 × 49, sobre el umbral de clientes. Es pintura del suelo, sin huella ni acción. Los carriles conservan sus coordenadas.

El subtítulo anterior estaba centrado en y114; su parte inferior coincidía con la franja verde que empezaba en y115. **Diagnóstico: posición y contraste**, no máscara ni contenedor. Ambos textos ya tenían profundidad -90 frente a la pared -100: no era necesario poner textos encima de todo.

Ahora las dos líneas caben en una placa mural propia (WALL_SIGN), con contraste verde oscuro sobre crema. Siguen en la capa de pared/suelo. El símbolo y la barra de Caja conservan la elevación de 100 unidades. Su nombre baja a 12 unidades sobre el punto físico, con origen inferior y profundidad de suelo para que el personaje pueda taparlo. Tablón y preparación de encargos usan señales legibles, sin elevar todos los textos. Preparar encargo queda en la esquina superior derecha junto al mostrador, con un único punto para recogida y empaquetado. Papelera trasladada a la esquina inferior izquierda para despejar Oficina/Encargos. Una caja lista permanece llena y el tablón muestra contorno dorado hasta Entregar y cobrar. En móvil el rótulo puede salir del encuadre al alejarse: la cámara mantiene seguimiento y zoom aprobados.

## Mobiliario y personajes

Frigorífico con puertas rebajadas; hornillos con quemadores y mandos; mesas de madera con asientos acolchados; mostrador con bandeja y caja reconocible; papelera con abertura, símbolo y pedal; oficina integrada y alfombra redondeada. Ninguna huella, altura lógica, asiento, zona de trabajo o interacción se mueve.

Personajes con proporciones comunes, cabeza redondeada, manos, calzado y expresión sencilla. Propietario con cinta atada y delantal corto; cocineros con gorro y chaqueta; limpieza con gorra, tirantes cruzados y paño. Clientes con cuatro combinaciones deterministas de cabello, prenda y accesorios; sin cambiar intención ni comportamiento. Al mirar atrás se ve pelo, no una cara vacía.

CharacterArt dibuja las piezas una vez. Caminar transforma piernas, brazos y torso según desplazamiento efectivo: leve balanceo, sin mover pies lógicos, profundidad ni colisiones. Sin movimiento no oscila. Rótulos de cocineros a alturas distintas reducen el solapamiento al compartir frigorífico.

## Carga, estados e interacción

CargoView conserva cantidades exactas. Ingredientes: paquetes rectangulares con banda de hoja. Platos: óvalos claros con comida. Residuos: bolsas redondeadas con nudo. Tres columnas de hasta 16 simultáneas, separadas por seis unidades; representación preparada para 16, aunque esta revisión fija capacidad jugable 8 y deshabilita su mejora, cuya tarjeta no se muestra en la oficina. Las torres quedan al lado del cuerpo; avisos y transferencias se sitúan por encima y se actualiza su área de exclusión para comentarios.

Cocción: wok y vapor más barra. Lista: plato y marca de verificación. Sucia: restos, servilleta y signo de exclamación. La lectura no depende solo de verde/coral. Interacciones: cápsula pequeña con flecha de recoger/depositar, moneda en Caja, puerta en Oficina y trazo de limpieza. Barras de permanencia y personal comparten dibujo; al quedar lista una ración tiene un asentamiento de 180 ms y 1,5 unidades como máximo, con tiempo activo. Sin partículas, filtros ni sacudidas.

## Interfaz y coste visual

HUD permanente únicamente dinero; durante un encargo activo o listo se suma una tarjeta compacta con plato/progreso y bonus, respetando áreas seguras y sin capturar movimiento. Panel con título, estado escrito, nombre/efecto y precio separados. Disponible, falta de saldo, requisito pendiente y completado tienen texto y tratamiento distintos. Cabecera fija con Cerrar de 46 px, visible al desplazar la lista en móvil. Oficina, pausa y protección de compras se mantienen.

Mobiliario y piezas de personajes se construyen al crear sus vistas. Gráficos de carga se reutilizan sin redibujar cantidades iguales; estados de cocina/progreso cambian por escalones visuales pequeños. Marcha usa transformaciones de piezas. Sin motor 3D, assets externos, nuevas dependencias, audio ni reglas añadidas.

## Ampliación provisional: encargos

Revisión 2026-10-11: tablón de corcho/madera en pared izquierda debajo de Oficina. Hojas, chinchetas e icono de caja, rótulo Encargos y requisito discreto antes del cocinero. Su punto de suelo no se eleva y está separado de oficina, papelera y demás estaciones. Una exclamación identifica ofertas; orientación inferior solo fuera de cámara hasta primera apertura. Empaquetado conserva su sitio en cocina: aviso al aceptar, orientación durante 8 s activos y flecha local hasta primera visita. Ayudas no capturan entradas, se ocultan mientras hay arrastre o panel y quedan lejos del dinero/carga del jugador. Mesa compacta de empaquetado, con cinta y caja abierta que dibuja las raciones empaquetadas y muestra contador/barra. Se vacía al completar, cancelar o reiniciar. Las piezas se reutilizan y redibujan cuando cambia estado, nunca por cada frame.

Cajero con delantal coral, pajarita y placa, situado detrás del mostrador; sin carga inventada. Panel del tablón comparte colores y cabecera fija con oficina. Traducciones largas fluyen y permiten desplazamiento vertical, con cierre accesible.

Ver comprobaciones actuales en [VERIFICATION.md](VERIFICATION.md) y localización en [LOCALIZATION.md](LOCALIZATION.md). Arte provisional aprobado; no producir assets definitivos sin nueva petición.

## Proveedor y bandeja (2026-10-20)

Añadidos mediante Graphics reutilizados, con el tema existente: suministro con sacos/factura cerca de entrada y bandeja tras el mostrador a la izquierda de Caja. Sus huellas y zonas están separadas de las anteriores. Frigorífico muestra cantidad física exacta; bandeja importe exacto y hasta tres montones representativos. Se redibujan al cambiar datos/idioma, sin objetos por moneda. Proveedor usa diálogo con cierre accesible y botones adaptables; HUD conserva solo cartera. Sin assets externos ni renovación artística adicional.

## Apertura guiada

Normal inicia sin muebles operativos, oficina ni tablón. Suelo/paredes deteriorados mediante tinte y grietas Graphics; reforma única retira deterioro. Marca de construcción solo para el objetivo actual; instalación materializa el mismo mueble existente. HUD añade objetivo breve y menú de partida; orientación fuera de cámara y textos es/en/id. Sin renovación artística ni assets externos.
