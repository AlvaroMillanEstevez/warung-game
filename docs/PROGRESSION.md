# Del local recién abierto al restaurante completo

Hito 2026-10-21, posterior a la apertura y guardado aprobados manualmente. Implementación local para revisión; sin publicación ni push. Una sola simulación para normal y DEV, sin recetas, jornadas, historia nueva ni cambios de arte/cámara/controles.

## Compras y requisitos

| Compra | Monedas | Requisito / resultado |
| --- | ---: | --- |
| Oficina | 50 | Apertura completada y primera venta recogida; construcción física en x113/y478 |
| Primera mesa + papelera | 40 | Oficina; ambas instalaciones se validan y compran juntas |
| Mesas 2 / 3 / 4 / 5 / 6 | 60 / 80 / 140 / 220 / 320 | Oficina y mesa anterior; una tarjeta, seis ubicaciones fijas |
| Primer cocinero | 100 | Oficina; no requiere comedor |
| Limpieza | 80 | Primera mesa y papelera instaladas |
| Cajero | 150 | Primer cocinero |
| Segundo hornillo | 180 | Oficina |
| Segundo cocinero | 220 | Primer cocinero y segundo hornillo |
| Zona de encargos | 50 | Primer cocinero; construcción física en x90/y581, junto a oficina |
| Rapidez del equipo | 80 / 160 | Oficina; tiempos conservados 0,8 → 0,6 → 0,4 s |
| Cocina más rápida | 100 / 200 | Oficina; tiempos conservados 4 → 3 → 2 s |

La zona de encargos incluye tablón, estación de empaquetado y sus interacciones. La capacidad sigue en 8 y su tarjeta permanece oculta. Precios en `PROGRESSION` y `UPGRADES` de src/config.ts. DEV conserva sus dos mesas iniciales y precios de ampliación 80/140/220/320; no se cuentan como inversión sus instalaciones concedidas.

Las construcciones físicas se descubren aunque falte dinero. Permanecer 1,5 s abre información/confirmación pausada; únicamente confirmar cobra. El marcador muestra precio y aspecto de obra. Tras construir oficina/zona hay que salir y volver para abrir su panel: el gesto anterior no lo abre ni acepta un encargo. Cancelación, confirmación repetida o ubicación ocupada no cobran.

La primera mesa instala papelera inferior izquierda y habilita el comedor solo después de una compra válida. Hasta entonces todas las llegadas son para llevar; después, las futuras usan 65 % comedor / 35 % llevar. No se altera intención, pedido, cola o temporizador de los clientes existentes. Limpiar manualmente y vaciar residuos funciona sin empleado; limpieza mantiene las reservas y desbloquea clientes que esperan mesa limpia. Comprar cualquier mueble comprueba conjuntamente ocupación y destinos, y recalcula rutas desde las posiciones actuales sin teletransportar ni borrar reservas/cargas.

No existe oferta ni reloj de encargo antes de construir toda la zona. Tras construir se reutiliza BulkOrders: 4/6/9 raciones y luego alternancia 6/9, base 10 por ración, bonus 50 % durante 90 s activos. Preparar encargo alterna retirar una ración del mostrador y empaquetarla; al completar queda listo y se cobra explícitamente en el tablón, con amortización de deuda. La construcción no acepta la primera oferta. Cancelación y devolución siguen intactas.

## Inversión y demanda

`opening.spent` sigue registrando únicamente las cuatro compras iniciales (120). `totalSpent` registra una vez oficina, mesas, zona de encargos, contrataciones y mejoras. No suma ingredientes, deuda/amortización, saldo inicial/DEV, ventas ni recogida de bandeja. Se persiste el total real, sin recalcularlo desde muebles al continuar.

| Inversión acumulada | Multiplicador absoluto | Intervalo |
| --- | ---: | ---: |
| 0–299 | ×0,8 | 10 s |
| 300–499 | ×1,2 | 6,67 s |
| 500–999 | ×2 | 4 s |
| Desde 1000 | ×2,4 | 3,33 s |

Paquete grande 50 ingredientes / 150 monedas desde 500 invertidas. Cambio de tramo reutiliza el siguiente intervalo completo, sin ráfagas ni deuda de llegadas. La primera llegada normal conserva sus 2 s tras abrir. Instalar mesa por sí solo no reinicia reloj; si su gasto cruza un tramo, aplica el mecanismo común.

## Guardado y migración

Formato JSON **2** en src/persistence/Save.ts. Las claves de almacenamiento se mantienen deliberadamente estables (`warung-kita.save.v1` y `warung-kita.dev-save.v1`) para encontrar los guardados existentes; su sufijo no indica la versión del contenido actual.

Migración explícita de un payload v1 validado: añade `progression` (oficina, papelera, zona y avisos), sin cambiar cartera, deuda, recursos, clientes, gasto ni compras. En normal las tres instalaciones nuevas empiezan ausentes; si ya se recogió la primera venta, el objetivo pasa a oficina. En DEV se reconocen los sistemas previamente concedidos, sin sumar inversión. Formato desconocido/corrupto se conserva hasta confirmación de nueva partida. La migración se escribe como v2 en el siguiente guardado normal, sin borrar primero el original.

Las mesas reales persisten en `tables` y su compra sucesiva en `levels.tables`: normal 0–6, DEV 0–4 compras más dos iniciales. La validación comprueba coincidencia exacta de IDs y requisitos, incluida papelera ↔ primera mesa y zona ↔ cocinero/oficina. Los objetivos se derivan de hechos guardados; los avisos pendientes se consumen una sola vez y persisten. Resto de datos, aislamiento DEV, tolerancia a almacenamiento bloqueado, intervalos de 5 s y ausencia de tiempo offline se mantienen. Al cargar se reconstruyen rutas de clientes y tareas de empleados desde cargas/posiciones actuales.

## Recorrido manual desde el guardado anterior

1. Abrir **la misma dirección/origen y navegador** usados antes, sin `?monedas`, y pulsar Continuar. Comprobar saldo, deuda e ingredientes. Si falta recoger la primera venta, terminar ese paso.
2. Ver objetivo y obra de oficina junto a la pared. Entrar aunque no se disponga de 50: comprobar precio, cerrar y seguir vendiendo/recogiendo bandeja hasta ahorrar.
3. Confirmar oficina (50). Comprobar que no se abre otro panel solo por seguir en el punto. Salir y volver; entrar a mejoras.
4. Comprar primera mesa + papelera (40). Ver aviso; producir, cobrar a un comensal, esperar que coma, limpiar su mesa y vaciar la bolsa en papelera inferior izquierda.
5. Contratar cocinero (100), antes o después de las mesas. La obra de zona de encargos aparece junto a oficina; antes de construir no hay ofertas ni empaquetado. Confirmar conjunto (50), salir y volver al tablón.
6. Aceptar 4 raciones; dejar al cocinero producir y reponer ingredientes. Permanecer en Preparar encargo hasta tener las cuatro empaquetadas. Volver al tablón y Entregar y cobrar; comprobar cartera/deuda, sin segundo cobro.
7. Contratar cajero/limpieza, comprar segundo hornillo y cocinero, ampliar hasta seis mesas y mejorar velocidades. Comprobar bloqueo explicado de limpieza sin mesa y segundo cocinero sin segundo hornillo.
8. Recargar antes/después de las construcciones y con encargo listo. Deben conservarse compras, saldo, mesa/papelera, equipo y progreso. Revisar es/en/id y móvil. Nueva partida confirmada vuelve a cero instalaciones, 150 monedas y apertura guiada.

Pruebas/evidencias en [VERIFICATION.md](VERIFICATION.md). Catálogos en `src/i18n/catalogs/{es,en,id}.ts`; nuevas claves `opening.office`, `opening.orders`, `tutorial.office`, `tutorial.orders` y `progress.*`. Indonesio pendiente de revisión nativa; móvil emulado no equivale a teléfono físico.
