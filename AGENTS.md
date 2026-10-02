# Instrucciones del proyecto

- Mantener Phaser 4.2.1, TypeScript estricto y Vite, con npm y package-lock.json. No añadir Vue, React, backend o servicios externos.
- Leer docs/GAME_DESIGN.md y docs/ROADMAP.md antes de cambiar reglas. Trabajar solo en el hito autorizado. El hito 1 está aprobado; el hito 2 abarca controles, pantalla y producción manual. Detenerse antes de clientes, colas, cobro, servicio, empleados o economía.
- Respetar el trabajo existente y la distribución del local. Mantener una estructura pequeña; evitar ECS, buses globales, inyección de dependencias y sistemas genéricos de tareas.
- Centralizar equilibrio y controles en src/config.ts y distribución en src/world/layout.ts. Separar huella física de altura visual y usar los pies para la profundidad.
- Dibujar los gráficos provisionales con Phaser. No descargar assets ni usar imágenes externas.
- Preservar WASD/flechas y arrastre relativo, diagonales normalizadas, captura de un puntero, cancelación al perder foco/ocultar/redimensionar y zonas seguras.
- Todas las acciones usan el mismo sistema de permanencia: intención de movimiento cancela aunque no haya desplazamiento; una acción completada requiere salir antes de reactivar.
- Mantener reglas de producción independientes de Phaser/DOM, transferencias atómicas, una unidad transportada y ausencia de progreso offline.
- No ofrecer acciones en mesas hasta el hito correspondiente. El reinicio actual debe identificarse como herramienta provisional.
- Ejecutar npm test, npm run typecheck y npm run build. Pruebas pequeñas y útiles de reglas, sin un framework adicional. Verificar navegador escritorio/móvil cuando esté disponible y distinguir emulación de dispositivo físico.
- No publicar, hacer push ni crear repositorios remotos sin una petición nueva.
