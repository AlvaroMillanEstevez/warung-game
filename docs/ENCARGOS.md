# Experimento: cajero y encargos grandes

2026-10-05. La base y la localización están aprobadas. Esta ampliación queda pendiente de revisión manual del usuario. Es una actividad voluntaria para compartir producción entre clientes y encargos; no se presupone que mejore la retención.

## Valores provisionales

Todos en src/config.ts, sin dependencias nuevas ni servicios externos:

| Regla | Valor |
| --- | --- |
| Rapidez global | 800 / 600 / 400 ms; mejoras de 80 / 160 monedas |
| Abrir oficina o tablón | 1500 ms, independiente de rapidez |
| Cajero | 150 monedas; requiere primer cocinero; máximo uno |
| Primera oferta | 6 raciones de nasi goreng |
| Siguientes ofertas | 6, 8 o 10 raciones, elección uniforme |
| Pago base | Cantidad × precio normal (10) |
| Bonificación | 50 % de la base |
| Plazo de bonificación | 90 segundos activos desde aceptar |
| Espera de nueva oferta | 45 segundos activos desde completar o cancelar |

Un encargo de 6 paga 60 de base y 30 de bonificación; de 8, 80 + 40; de 10, 100 + 50. Los ingresos nunca cuentan como gasto acumulado. La compra del cajero sí cuenta. Demanda, precio normal, cocción, movimiento, consumo y demás precios conservados.

Los ciclos capturan rapidez al empezar a actuar. Mejorar no acorta el ciclo actual de jugador, cocineros, limpieza o cajero. El siguiente usa la nueva duración; trabajadores recién contratados heredan mejoras existentes.

## Una única caja

El cajero camina a su puesto detrás del mostrador, sin reservar durante el trayecto. Usa las mismas reglas de cabeza elegible por espera, stock real, cobro, entrega y reserva de mesa. Sin acción válida espera y reanuda con un ciclo completo.

La reserva checkout es exclusiva para jugador o cajero. Quien empieza conserva su ciclo: acercarse no lo reinicia ni permite una venta paralela. Completar revalida cliente, stock, mesa y ruta antes de descontar/cobrar/entregar. La reserva se libera al completar, cancelar, invalidar o reiniciar. El cajero no lleva comida ni cambia de profesión.

## Estados y comida

BulkOrders conserva cuatro estados explícitos: locked, offer, active y waiting. Son datos internos, independientes de Phaser/DOM.

1. El primer cocinero desbloquea una oferta de 6. Aviso breve y señal del tablón, sin abrir ventana.
2. La oferta no caduca. Aceptar su ID inicia un solo encargo con contador a cero y 90 s de bonificación; aceptar de nuevo no duplica.
3. Empaquetar completa automáticamente y paga una vez, o cancelar devuelve comida. Ambos pasan a espera de 45 s.
4. Al terminar la espera aparece una sola oferta. Un delta grande no acumula ofertas ni adelanta su aceptación.

El reloj se congela en oficina, tablón, DEV, pausa por foco y pestaña oculta. Reanudar descarta delta previo. Llegar a cero solo elimina bonificación; no cancela ni destruye comida.

Los platos proceden del circuito actual. Pueden ir directamente del hornillo al empaquetado o recogerse del stock en **Retirar platos**, detrás y a la derecha del mostrador. Cada ciclo retira uno, solo con encargo activo, respetando capacidad de platos y unidades pendientes menos platos transportados. No se aparta stock al aceptar. Si una venta consume la última ración antes de terminar la retirada, esta se invalida y no conserva progreso. Los cocineros reponen al disminuir el stock.

Empaquetar transfiere uno por ciclo y revalida ID/progreso del mismo encargo. Ingredientes y residuos no lo bloquean. La caja representa su contenido y muestra contador/barra. Los platos sobrantes siguen con el jugador al completar.

Cancelar pide confirmación dentro del tablón. Devuelve exactamente lo empaquetado al stock una sola vez; conserva lo transportado y no cambia dinero. No se convierte la comida en premio ni penalización.

## Presentación e integración

Tablón en la pared del fondo junto al empaquetado, entre frigorífico y hornillo. Nuevas huellas/puntos en src/world/layout.ts; las estaciones existentes no se desplazan. El indicador de Caja sube visualmente 100 unidades sobre el personaje, con una marca en el suelo mediante src/visuals/theme.ts sin mover la zona física.

Oficina y tablón abren tras 1,5 s y requieren salir/volver. El panel cancela teclas/gestos y evita transmitir toques al lienzo. Una tarjeta pequeña aparece solo durante el encargo: nasi goreng, progreso y segundos de bonus; agotado el plazo muestra el texto sin bonificación.

La misión «Completa tu primer encargo» es opcional y sin recompensa extra. Una flecha discreta indica empaquetado durante el primer encargo; la primera entrega marca cumplimiento y muestra celebración localizada. No hay sistema genérico de misiones.

Nuevos textos en los catálogos existentes src/i18n/catalogs/{es,en,id}.ts: prefijo bulk.*, estaciones, acciones/resultados y cajero. Se mantienen parámetros completos y números del locale. [Catálogo indonesio para revisión](../src/i18n/catalogs/id.ts).

DEV borra cajero, operación de caja, oferta/activo/espera, comida empaquetada, caja dibujada, temporizadores, objetivo, paneles y referencias. IDs anteriores no se reutilizan. Reinicio y recarga no conservan partida; solo idioma.

## Recorrido manual de evaluación

1. Reinicia desde DEV y sirve normalmente hasta contratar al primer cocinero (100). Observa el aviso y la señal del tablón del fondo. Abre y cierra sin aceptar; vuelve más tarde: la oferta sigue allí.
2. Acepta los 6 platos. Produce tú algunas raciones y llévalas directamente al empaquetado. Revisa el ritmo de 0,8 s, contenido de caja, HUD y pago de 90 si llegas a tiempo. El objetivo se marca sin premio añadido.
3. Contrata cajero (150) y limpieza si lo deseas. Al aparecer la siguiente oferta, acepta y retira parte del mostrador. Deja algunas raciones para clientes: observa ventas, reposición y el tiempo que dedicas al encargo. Compara con retirar todas las disponibles.
4. Ayuda en caja antes de que el cajero reclame una venta, y después mientras ya está atendiendo. Solo una barra/operación debe estar activa en caja y cada cliente paga una vez. Depósito y retirada siguen accesibles.
5. Compra rapidez: siguientes acciones a 0,6 y 0,4 s; oficina/tablón mantienen 1,5 s. Abre paneles y cambia de pestaña: el bonus debe congelarse. Cerrar no debe abrir de nuevo hasta salir/volver.
6. Deja agotar un plazo. Conserva la comida y termina: cobra solo base. En otro encargo empaqueta dos, conserva platos contigo y cancela con confirmación: vuelven exactamente dos al mostrador, sin cambiar saldo ni carga.
7. Alterna es/en/id en oficina. Revisa ofertas, cantidades, cajero, expiración, confirmación y mensajes en vertical/horizontal. Reinicia con encargo y caja activos: desaparecen todos sus estados.
8. Valora si elegir cuándo aceptar y cuánto stock retirar aporta decisiones, o si solo genera desplazamiento repetitivo. Anota saturación de filas, falta/exceso de stock y facilidad de llegar al bonus. Estos datos guiarán otra petición; no se ajustan automáticamente.

Pruebas, evidencia y límites en [VERIFICATION.md](VERIFICATION.md). Móvil emulado no acredita comodidad en un dispositivo físico. Nuevas recetas, frigoríficos, horas punta, edición de distribución y locales quedan solo en roadmap. Sin publicación ni push.
