# Instrucciones del proyecto

- Mantener Phaser 4.2.1, TypeScript estricto y Vite, con npm y package-lock.json. No añadir Vue, React, backend o servicios externos.
- Leer docs/GAME_DESIGN.md y docs/ROADMAP.md antes de cambiar reglas. Trabajar solo en el hito autorizado. El hito 1 termina antes de clientes, cocina, empleados, economía e inventario.
- Respetar el trabajo existente. Mantener una estructura pequeña; evitar ECS, buses globales, inyección de dependencias y abstracciones futuras.
- Centralizar parámetros en src/config.ts y distribución en src/world/layout.ts. Separar huella física de altura visual y usar los pies para la profundidad.
- Dibujar los gráficos provisionales con Phaser. No descargar assets ni usar imágenes externas.
- Preservar controles de teclado/táctiles, diagonales normalizadas, limpieza al perder foco/cancelar, coordenadas de mundo estables y selección de una única estación accesible.
- Ejecutar npm run typecheck y npm run build tras cambios. Verificar en navegador escritorio/móvil cuando esté disponible y explicar qué no se pudo probar.
- No añadir una suite extensa para este hito. No publicar, hacer push ni crear repositorios remotos sin una petición nueva.
