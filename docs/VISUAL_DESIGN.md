# Dirección visual — primera renovación

2026-10-04. Reglas y balance aprobados manualmente. Renovación visual aprobada manualmente. Idiomas y base aprobados. El experimento posterior añade tablón, empaquetado y cajero conservando esta dirección.

## Restaurante de juguete

Vista 2D inclinada, caras superiores y frontales, bordes redondeados y sombras de contacto en tres capas tenues. Madera cálida y crema como base, verde jade para identidad/acciones, coral como acento. El exterior tiene menor saturación. Cocina cerámica verde pálida y comedor de madera se distinguen por material; la franja de fila es una variación del suelo, sin colisión.

Identidad indonesia discreta: Warung Kita, Dapur kecil · Cerita besar, Selamat datang y un pequeño motivo textil de cuatro pétalos. No se añaden objetos decorativos que parezcan estaciones.

Paleta, colores de estado, variantes de piel/vestuario, tipografía, contornos, radios, sombras, capas y medidas de carga en **src/visuals/theme.ts**. Exporta variables CSS para el HUD y paneles. Fuentes del sistema (Trebuchet MS/Segoe UI/Arial), sin descargas. Los textos del mundo se rasterizan a resolución 3 para evitar bordes borrosos al ampliar; Graphics con antialias y sin pixelArt.

## Correcciones de entrada y rótulo

La alfombra anterior estaba bajo el punto inicial del jugador, alejada de la entrada real. Ahora WELCOME_RUG está en x666/y739, 206 × 49, sobre el umbral de clientes. Es pintura del suelo, sin huella ni acción. Los carriles conservan sus coordenadas.

El subtítulo anterior estaba centrado en y114; su parte inferior coincidía con la franja verde que empezaba en y115. **Diagnóstico: posición y contraste**, no máscara ni contenedor. Ambos textos ya tenían profundidad -90 frente a la pared -100: no era necesario poner textos encima de todo.

Ahora las dos líneas caben en una placa mural propia (WALL_SIGN), con contraste verde oscuro sobre crema. Siguen en la capa de pared/suelo. El marcador de Caja (símbolo, rótulo y barra) se eleva 100 unidades visuales, por encima del personaje, con una marca en el punto de suelo para separarlo del decorado; su punto físico queda idéntico. Tablón, retirada y empaquetado también usan señales legibles sobre su mobiliario, sin elevar todos los textos. En móvil el rótulo puede salir del encuadre al alejarse: la cámara mantiene seguimiento y zoom aprobados.

## Mobiliario y personajes

Frigorífico con puertas rebajadas; hornillos con quemadores y mandos; mesas de madera con asientos acolchados; mostrador con bandeja y caja reconocible; papelera con abertura, símbolo y pedal; oficina integrada y alfombra redondeada. Ninguna huella, altura lógica, asiento, zona de trabajo o interacción se mueve.

Personajes con proporciones comunes, cabeza redondeada, manos, calzado y expresión sencilla. Propietario con cinta atada y delantal corto; cocineros con gorro y chaqueta; limpieza con gorra, tirantes cruzados y paño. Clientes con cuatro combinaciones deterministas de cabello, prenda y accesorios; sin cambiar intención ni comportamiento. Al mirar atrás se ve pelo, no una cara vacía.

CharacterArt dibuja las piezas una vez. Caminar transforma piernas, brazos y torso según desplazamiento efectivo: leve balanceo, sin mover pies lógicos, profundidad ni colisiones. Sin movimiento no oscila. Rótulos de cocineros a alturas distintas reducen el solapamiento al compartir frigorífico.

## Carga, estados e interacción

CargoView conserva cantidades exactas. Ingredientes: paquetes rectangulares con banda de hoja. Platos: óvalos claros con comida. Residuos: bolsas redondeadas con nudo. Tres columnas de hasta 16 simultáneas, separadas por seis unidades; límites de inventario intactos. Las torres quedan al lado del cuerpo; avisos y transferencias se sitúan por encima y se actualiza su área de exclusión para comentarios.

Cocción: wok y vapor más barra. Lista: plato y marca de verificación. Sucia: restos, servilleta y signo de exclamación. La lectura no depende solo de verde/coral. Interacciones: cápsula pequeña con flecha de recoger/depositar, moneda en Caja, puerta en Oficina y trazo de limpieza. Barras de permanencia y personal comparten dibujo; al quedar lista una ración tiene un asentamiento de 180 ms y 1,5 unidades como máximo, con tiempo activo. Sin partículas, filtros ni sacudidas.

## Interfaz y coste visual

HUD permanente únicamente dinero; durante un encargo activo se suma una tarjeta compacta con plato/progreso y bonus, respetando áreas seguras y sin capturar movimiento. Panel con título, estado escrito, nombre/efecto y precio separados. Disponible, falta de saldo, requisito pendiente y completado tienen texto y tratamiento distintos. Cabecera fija con Cerrar de 46 px, visible al desplazar la lista en móvil. Oficina, pausa y protección de compras se mantienen.

Mobiliario y piezas de personajes se construyen al crear sus vistas. Gráficos de carga se reutilizan sin redibujar cantidades iguales; estados de cocina/progreso cambian por escalones visuales pequeños. Marcha usa transformaciones de piezas. Sin motor 3D, assets externos, nuevas dependencias, audio ni reglas añadidas.

## Ampliación provisional: encargos

Tablón pequeño de corcho/madera con hoja y chincheta en la pared del fondo. Una exclamación discreta identifica la oferta; una flecha señala empaquetado hasta completar el primer encargo. Mesa compacta junto al tablón, con cinta y caja abierta que dibuja las raciones empaquetadas y muestra contador/barra. Se vacía al completar, cancelar o reiniciar. Las piezas se reutilizan y redibujan cuando cambia estado, nunca por cada frame.

Cajero con delantal coral, pajarita y placa, situado detrás del mostrador; sin carga inventada. Panel del tablón comparte colores y cabecera fija con oficina. Traducciones largas fluyen y permiten desplazamiento vertical, con cierre accesible.

Ver comprobaciones actuales en [VERIFICATION.md](VERIFICATION.md) y localización en [LOCALIZATION.md](LOCALIZATION.md). Arte provisional aprobado; no producir assets definitivos sin nueva petición.
