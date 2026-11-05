# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Personal interno de la botica Nova Salud: Administrador, Cajero y Almacén. Trabajan en la PC del mostrador o del almacén, varias veces al día, con clientes esperando en caja. Cada rol ve solo sus módulos.

## Product Purpose
Panel interno (mini ERP) para controlar inventario por lotes, ventas en punto de venta, pedidos de la tienda web, alertas de reposición y vencimiento, compras y reportes. Éxito: vender y reponer sin errores de stock y emitir boletas al instante.

## Positioning
Une el mostrador y la tienda en línea sobre el mismo stock: los pedidos web llegan solos al panel con stock reservado (Pendiente → Preparado → Entregado) y al entregar se descuenta por lote y se emite la boleta.

## Operating Context
- Front-end React 18 + Vite; sin lógica de negocio ni base de datos: todo pasa por la API `nova-salud-api` (JWT por sesión).
- Repos hermanos: `nova-salud-api` y `nova-salud-tienda` (tienda pública).
- Pedidos web se refrescan cada 5 s.

## Capabilities and Constraints
- Permisos por rol en el menú; la API vuelve a validar cada acción.
- El login no muestra cuentas de prueba; las credenciales de demostración se gestionan fuera de la interfaz.
- Idioma de la interfaz: español (Perú).

## Brand Commitments
Nombre "Nova Salud", marca con cruz "+", color principal verde azulado (teal) ya presente en la interfaz.

## Evidence on Hand
No hay logotipo en archivo, fotografías, testimonios ni métricas reales. No inventarlos.

## Product Principles
1. Rapidez en mostrador: menos clics y lectura inmediata del estado.
2. El stock es la verdad: cualquier vista refleja el inventario real por lote.
3. Cada rol ve solo lo que le toca.
4. Herramienta de trabajo, no folleto: claridad antes que decoración.
