# Economía física — 2026-10-20

**Progresión normal vigente:** ver [PROGRESSION.md](PROGRESSION.md). Oficina 50; primera mesa con papelera 40 y siguientes 60/80/140/220/320; zona de encargos 50 tras cocinero. Sin zona construida no hay ofertas. Estas compras cuentan como inversión; DEV mantiene sus instalaciones concedidas sin gasto.


Actualización 2026-10-21: normal comienza con 150/local cerrado/sin instalaciones; presupuesto y guardado en [OPENING_AND_SAVE.md](OPENING_AND_SAVE.md). El inicio 30/local operativo descrito abajo se conserva solo como fixture avanzado. Gasto de apertura separado de inversión y suministros.


Economía base aprobada manualmente; ajuste de suministro/demanda pendiente de revisión. Sin publicación, guardado de partida ni servicios externos.

## Valores y conceptos

Configuración central: `ECONOMY` en `src/config.ts`. Cartera inicial 30, frigorífico 0, bandeja 0 y deuda 0. Paquete de 10 ingredientes: 30 al contado o deuda fija de 33. Una unidad produce una ración; venta ordinaria 10. Capacidad de transporte 8 por categoría, mostrador y frigorífico sin máximo. Encargos conservan 4/6/9, base 40/60/90 y bonus 20/30/45.

Cartera, bandeja, deuda y gasto de mejoras son independientes. Suministros, fiado, amortización y recogida no incrementan demanda. Solo las mejoras y contrataciones correspondientes lo hacen.

`src/simulation/Economy.ts` centraliza devolución = min(deuda, floor(bruto / 2)); neto = bruto - devolución. Ventas de jugador y cajero reducen deuda y dejan neto en bandeja. Encargos aplican la misma regla sobre base más bonus realmente ganado al entregar en tablón y abonan neto directamente a cartera. Empaquetar y cancelar no amortizan. Recoger dinero no amortiza de nuevo. No hay intereses temporales, multas ni vencimientos.

Ejemplo: deuda 33; seis ventas de 10 devuelven 5 cada una y acumulan 30; la séptima devuelve 3 y añade 7. Resultado: deuda 0, bandeja 37. Diez ventas dejan 67. Desde cartera/stock/deuda 0 se puede pedir fiado, producir, vender, recoger 37 y comprar otro paquete al contado, quedando 7 en cartera.

## Puntos y panel

Proveedor abajo junto a la entrada: punto (596,690), huella (560,740,72,32). Abrir por 1,5 s pausa simulación, elimina entradas y exige salir/volver tras cerrar. Muestra stock, cartera, deuda, dos ofertas y explicación. Cada paquete necesita una pulsación explícita. Contado permitido con deuda; no admite otro fiado hasta deuda 0. Revisión de compra y listener de un uso impiden repetir el mismo evento obsoleto. Reposición inmediata, sin transporte ni límite de almacenamiento.

Bandeja detrás del mostrador, a la izquierda de Caja: punto (600,181), huella (575,145,50,18). Punto independiente de venta, depósito y preparación. Un ciclo con la rapidez actual recoge todo el efectivo existente al completarse, incluso con todas las categorías llenas. Si llega más, hace falta otro ciclo entero. Revisiones invalidan comandos ya consumidos. Importe exacto junto a la bandeja; hasta tres montones representativos, nunca un objeto por moneda. HUD solo muestra cartera.

## Recursos y personal

Production mantiene stock físico y reservas de ingredientes por actor. Reservar no consume; completar transfiere exactamente uno. Cancelar, invalidar, faltar ruta o reiniciar libera la reserva. El último ingrediente no puede duplicarse. Ingredientes transportados se excluyen del frigorífico.

Cocineros conservan tandas y objetivo conjunto 12. Al agotarse el frigorífico terminan cargas/cocciones/platos existentes y esperan sin desplazamientos inútiles; reponer reactiva trabajo automáticamente. Papelera solo destruye residuos. Cancelar tareas conserva carga; cancelar encargo devuelve empaquetados al mostrador; un encargo listo sigue siendo cobrable. No se añade suministro gratuito.

Aviso bajo al cruzar de más de 3 a 3 o menos, rearmado al reponer por encima de 3. Indicación inicial al proveedor, aviso de primera venta sobre recogida y avisos limitados de amortización/deuda saldada. Textos completos es/en/id en `src/i18n/catalogs/`.

## Recorrido manual

1. Abrir sin parámetro: 30 monedas, frigorífico/bandeja/deuda vacíos.
2. Ir al proveedor y comprar al contado: cartera 0, stock 10. Comprobar pausa y que cerrar no reabre sin salir.
3. Recoger ingredientes, cocinar, recoger platos, depositar y atender Caja. Cartera permanece 0; bandeja crece 10 por venta.
4. Recoger bandeja y volver a comprar. Comprobar conteo exacto y ninguna subida de demanda por suministros.
5. Para fiado, abrir `http://127.0.0.1:5173/?monedas=0` en desarrollo. Pedir fiado, comprobar segundo fiado bloqueado, cocinar/vender siete raciones: deuda 0 y bandeja 37. Recoger y comprar al contado.
6. Con `?monedas=2000`, contratar dos cocineros, segundo hornillo, limpieza y cajero. Comprar un paquete; esperar agotamiento y finalización de comida. Reponer y observar reanudación sin órdenes manuales.
7. Probar encargo con deuda, con/sin bonus, y cancelación de uno parcialmente empaquetado. El cobro es único y neto en cartera; cancelar recupera comida.
8. Cambiar idiomas en oficina, revisar proveedor/stock/bandeja/avisos y cierre en móvil. DEV reinicia todos los estados económicos.

DEV restaura 30 por defecto; una URL local válida conserva su saldo de prueba al reiniciar, como la herramienta anterior. Parámetro ausente/inválido o producción usa 30. No genera ingreso comercial ni gasto. Solo persiste `warung-kita.language`; recargar inicia una partida nueva. Esta excepción de saldo DEV es deliberada para conservar fixtures, no guardado de partida.

## Paquete grande y demanda — ajuste 2026-10-21

Dos mesas iniciales (`tables.slice(0, 2)` en layout.ts). Tres mesas totales más cocinero, limpieza y cajero: 80 + 100 + 80 + 150 = **410**. Precios sin cambios. Umbral elegido y confirmado: **500 monedas invertidas**, independientemente de la combinación comprada. Configuración compartida: ECONOMY.largeSupplyUnlockSpending.

Desde 500, el proveedor ofrece **50 ingredientes por 150**, exclusivamente al contado. Antes muestra requisito de inversión. Aviso breve una vez al cruzar; sin HUD nuevo. Puede comprarse con deuda, usando únicamente cartera. Pequeños de 10 por 30 y fiado 33 siguen disponibles. Reposición aditiva e ilimitada: tres paquetes pequeños añaden 30; grande con 20 deja 70. Cada nueva pulsación válida puede comprar; reutilizar el evento/cotización consumidos no duplica.

| Inversión | Multiplicador absoluto | Intervalo |
| --- | --- | --- |
| 0–299 | ×0,8 | 10 s |
| 300–499 | ×1,2 | 6,67 s |
| 500–999 | ×2 | 4 s |
| Desde 1000 | ×2,4 | 3,33 s |

El tramo 500 sustituye ×1,7; el avanzado se adelanta de 1300 a 1000 por petición posterior. No hay otros tramos. Se conserva el mecanismo de cambio: siguiente intervalo entero, sin ráfagas ni retroactividad; primera llegada mantiene su cuenta atrás. Suministros/deuda/amortización/cartera/DEV no suman inversión. Reiniciar bloquea grande y rearma aviso, con demanda inicial.

Recorrido de revisión: abrir ?monedas=2000 y verificar grande bloqueado; comprar cocinero (100), limpieza (80), dos mesas (80+140) y cocina rápida (100): inversión 500. Visitar proveedor, comprar tres pequeños y comprobar +30; comprar grande y comprobar +50/-150; pedir fiado y repetir grande para comprobar deuda sin cambios. Reiniciar: vuelve el bloqueo aunque la cartera de prueba sea 2000. Para comprobar ×2,4, invertir hasta 1000; no exige una combinación concreta.
