# Instrucciones del proyecto

- Mantener Phaser 4.2.1, TypeScript estricto y Vite, con npm y package-lock.json. No añadir Vue, React, backend o servicios externos.
- Leer docs/GAME_DESIGN.md y docs/ROADMAP.md antes de cambiar reglas. Trabajar solo en el hito autorizado. Los hitos 1 y 2 están aprobados manualmente; el hito 3 incluye clientes, ventas, servicio y limpieza. Detenerse antes de empleados, mejoras, recetas nuevas, tutoriales guiados y guardado.
- Respetar el trabajo existente y la distribución del local. Mantener una estructura pequeña; evitar ECS, buses globales, inyección de dependencias y sistemas genéricos de tareas.
- Centralizar equilibrio y controles en src/config.ts y distribución en src/world/layout.ts. Separar huella física de altura visual y usar los pies para la profundidad.
- Dibujar los gráficos provisionales con Phaser. No descargar assets ni usar imágenes externas.
- Preservar WASD/flechas y arrastre relativo, diagonales normalizadas, captura de un puntero, cancelación al perder foco/ocultar/redimensionar y zonas seguras.
- Todas las acciones usan el mismo sistema de permanencia: intención de movimiento cancela aunque no haya desplazamiento; una acción completada requiere salir antes de reactivar.
- Fijar cliente, mesa y pedido al iniciar la permanencia; revalidar el mismo comando al completar, sin sustituirlo silenciosamente.
- Mantener las reglas de producción/restaurante independientes de Phaser/DOM, transferencias atómicas y una unidad transportada. Restaurant coordina clientes, mesas, pedidos y dinero; Production posee carga, cocina y raciones disponibles/reservadas. Las vistas solo representan esos datos.
- Mantener limpieza y asignación de mesa independientes. Reservar prioriza limpias, permite sucias; limpiar conserva la reserva. Solo recoger/servir pedidos de clientes sentados. Los platos pagados no se descartan.
- No adelantar dentro de una fila. Elegir la cabeza elegible con mayor espera entre ambas filas; mesas asignadas no bloquean las ventas para llevar.
- Los clientes recorren rutas sobre las huellas existentes, con posiciones explícitas. Sin teletransporte ni colisiones rígidas entre personajes.
- Todos los relojes avanzan únicamente con tiempo activo: cocina, permanencia, llegadas, movimiento y consumo. Sin progreso offline ni deuda de llegadas.
- El reinicio DEV limpia clientes, filas, pedidos, reservas, suciedad, producción, carga, dinero, referencias de interacción y temporizadores.
- Ejecutar npm test, npm run typecheck y npm run build. Pruebas pequeñas y útiles de reglas, sin un framework adicional. Verificar navegador escritorio/móvil cuando esté disponible y distinguir emulación de dispositivo físico.
- No publicar, hacer push ni crear repositorios remotos sin una petición nueva.
