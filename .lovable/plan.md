# Totalero — Plan por fases

## Fase 1 (esta entrega)
- **Landing**: logo Totalero, "Bienvenido a Totalero", 4 íconos (Gastos, Liquidez, Tarjetas, Préstamos), botones "Continuar con Google" y "Continuar como Invitado", aviso de privacidad, pie GPL. Íconos arriba: info, idioma, modo oscuro.
- **Dashboard** idéntico a la captura: selector de año (2024–2050), Flujo Mensual / Resumen Anual, barra de meses con indicador de meses con movimientos, "Horizonte" y "Nueva transacción".
- **5 indicadores**: Total actual, Fin de mes, Total + préstamos, Línea de préstamos, Deuda activa.
- **Quincenas** (1–15 y 16–fin): ingresos, gastos, margen de solvencia, saldo al cierre, estado Solvente / Déficit.
- **Tabla de flujo de caja**: saldo inicial protegido arrastrado del mes anterior, Hecho, Día, Etiqueta, Concepto, Proyectado, Real, Deuda, Restante, Acciones; filtros (Todos, Pendientes, Ingresos, Gastos, Recurrentes, Préstamos), búsqueda.
- **Movimientos**: crear, editar, duplicar, cambiar fecha, mover de quincena, pasar al mes siguiente, eliminar (simple y recurrente con 3 opciones), ojo habilitar/deshabilitar independiente de "Hecho".
- **Etiquetas** editables con colores.
- **Motor financiero central** con precisión decimal, cascada entre meses, bisiestos.
- Claro/oscuro, español/inglés, adaptable a móvil, guardado local persistente (modo invitado).

## Fase 2
Préstamos con tabla de amortización y simulador de pagos extraordinarios; líneas de crédito con saldo independiente por mes.

## Fase 3
Calendario de tarjetas de crédito, Resumen Anual con gráficas, respaldos JSON (exportar/importar/validar, borrar meses, reiniciar), historial de operaciones.

## Fase 4 — Firebase + Railway
- Código listo para Firebase (Google login + respaldo en la nube) leyendo claves de variables de entorno, sin secretos en el código.
- Guía paso a paso para crear tu proyecto Firebase y Railway y conectarlos tú mismo.
- Nota: la app sigue funcionando sin Firebase (modo invitado).

## Detalles técnicos
- Paleta: #3FD0D9, #05AD98, #878787, #699249, #BBBFBF, #BD0404 como tokens en styles.css; Inter para textos, Roboto Mono/Roboto para números.
- Estado en un store (Zustand) persistido en localStorage; motor puro `src/lib/engine.ts` con aritmética en centavos (enteros) y pruebas unitarias.
- Firebase SDK cliente con `VITE_FIREBASE_*`; Railway reservado para un servicio opcional de respaldo.
- GitHub Pages / AI Studio: se documentará la exportación estática; la vista previa y publicación de Lovable funcionan directamente.
