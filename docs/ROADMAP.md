# Hoja de ruta

- [x] **Hitos 1–4**: controles, producción, autoservicio, contratación, mejoras y cooperación. Aprobados manualmente.
- [x] **Experiencia y balance**: mejoras globales, torres exactas, comentarios, filas largas y demanda por gasto. Aprobados manualmente.
- [x] **Cierre del primer local**: seis mesas, dos hornillos, oficina, caja trasera y HUD de dinero. Aprobado manualmente.
- [x] **Oficina, cámara, demanda y segundo cocinero**: reglas, coordinación y objetivo conjunto aprobados manualmente.
- [x] **Renovación visual integral y correcciones de lectura**: aprobadas manualmente.
- [x] **Localización es/en/id y base**: aprobadas manualmente.
- [x] **Experimento autorizado**: rapidez global 0,8/0,6/0,4 s; cajero único; tablón, retirada, empaquetado y encargos voluntarios. Objetivo de primer encargo sin recompensa extra.
- [x] **Ajuste adicional**: indicador de caja elevado visualmente, misma zona física.
- [x] **Revisión manual del experimento**: el usuario confirma funcionamiento y pide mejorar descubrimiento y actividad.
- [x] **Descubrimiento y demanda (2026-10-11)**: tablón junto a oficina, requisito visible, orientación inicial, proporción 65/35 y último tramo desde 500 a frecuencia 1,7.
- [x] **Revisión de flujo (2026-10-12)**: papelera inferior, etiqueta Caja junto al suelo, preparación en esquina superior derecha con recogida/empaquetado compartidos; entrega/cobro en tablón y bonus fijado al empaquetar; capacidad deshabilitada; saldo local por ?monedas.
- [x] **Revisión manual del flujo**: distribución y entrega funcionan; se solicitan correcciones de textos y ritmo.
- [x] **Progresión y producción (2026-10-12)**: encargos 4→6→9 y luego 6/9 alternos, capacidad oculta, tandas de cocineros y demanda ×2,4 desde gasto 1300; verificación de textos de entrega.
- [x] **Base de progresión y ritmo**: el usuario confirma que la base funciona.
- [x] **Economía física (2026-10-20)**: proveedor, ingredientes limitados, contado/fiado, amortización y bandeja de efectivo.
- [x] **Revisión manual de economía**: aprobada por el usuario.
- [x] **Ajuste de suministro/demanda (2026-10-21)**: paquete 50/150 y ×2 desde inversión 500; ×2,4 desde 1000.
- [x] **Ajuste de suministro/demanda**: incorporado como base del siguiente hito.
- [x] **Apertura guiada y guardado (2026-10-21)**: reforma, instalaciones, presupuesto 150, apertura explícita, primera venta para llevar, tutorial y guardado local; escenario avanzado separado.
- [x] **Revisión manual de apertura y guardado**: aprobada por el usuario.
- [x] **Progresión normal**: oficina física, comedor 0–6, papelera incluida, empleados, zona de encargos y migración v1→v2.
- [ ] **Revisión manual de progresión normal**. **Detener aquí**, sin jornadas, recetas, historia extensa ni renovación visual.

Ideas registradas, sin implementar ni autorizar un hito posterior:

- Nuevas recetas.
- Frigoríficos adicionales.
- Horas punta.
- Edición de distribución.
- Nuevos locales.

Conservar precios por ración y ratio de bonificación, cocción, rapidez de acciones, movimiento, consumo, controles y cámara. Demanda ajustada exclusivamente a los valores solicitados. Sin assets definitivos, audio, objetivos finales, más personal, publicación ni push. Idioma y guardados normal/DEV separados. El experimento no acredita retención ni comodidad en teléfono físico.

## Trabajo planificado (reanudación)

Detalle y estimaciones en inglés en [ROADMAP.md](../ROADMAP.md), coherente con esta lista:

1. **Tests e infraestructura (~10 h):** CI en GitHub Actions; prueba e2e reproducible a partir de los guiones de QA locales; más tests de guardado, migración, economía y progresión.
2. **Bugs, QA y balance (~16 h):** revisión manual de progresión normal; teléfonos físicos; Firefox/Safari; simulación por debajo de 10 FPS; tamaño del bundle; prueba de balance con jugadores externos.
3. **Nuevas mecánicas (~22 h):** segunda receta, horas punta, frigorífico adicional y edición básica de distribución.
4. **Dirección del juego (~19 h):** cómo escalar más allá del primer warung: segundo local, encargados/franquicia o jornadas con objetivos. Estudio de diseño y prototipos.

Total aproximado: **67 h**.
