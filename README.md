# nova-salud-erp

Panel interno del mini ERP de la botica **Nova Salud** para el personal: dashboard, punto de venta, pedidos web, inventario por lotes, alertas, compras y reportes.

| Repo | Qué es |
|---|---|
| [nova-salud-api](https://github.com/nova-salud-equipo/nova-salud-api) | Reglas de negocio y base de datos |
| **nova-salud-erp** (este) | Panel interno para el personal |
| [nova-salud-tienda](https://github.com/nova-salud-equipo/nova-salud-tienda) | Tienda web pública |

Este proyecto **no tiene lógica de negocio ni base de datos**: todo lo consulta y lo guarda a través de la API.

## Tecnologías
React 18 + Vite 5.

## Cómo ejecutarlo
1. Ten la API funcionando (ver su README).
2. `npm install`
3. Copia `.env.example` como `.env` y pon la URL de la API en `VITE_API_URL`.
4. `npm run dev` → http://localhost:5173

## Roles y módulos
| Módulo | Administrador | Cajero | Almacén |
|---|:-:|:-:|:-:|
| Dashboard | ✔ | ✔ | ✔ |
| Punto de venta | ✔ | ✔ | |
| Pedidos web | ✔ | ✔ | |
| Inventario (ver) | ✔ | ✔ | ✔ |
| Ajustes de stock y nuevos productos | ✔ | | ✔ |
| Alertas | ✔ | | ✔ |
| Compras | ✔ | | ✔ |
| Reportes y anulación de ventas | ✔ | | |

El menú se oculta según el rol, y además la API rechaza cualquier acción no permitida.

## Integración con la tienda
Los pedidos hechos en la tienda aparecen solos en **Pedidos web** (actualización cada 5 s) con su stock reservado. El flujo es **Pendiente → Preparado → Entregado**. Al entregar, la API descuenta el stock por lote y emite la boleta, que se ve en Reportes como canal *Web*.

## Variables de entorno
| Variable | Para qué sirve |
|---|---|
| `VITE_API_URL` | URL de la API, sin `/api` al final |

## Estructura
```
src/
  api.js       cliente HTTP (token JWT por sesión)
  auth.jsx     sesión y permisos de menú
  hooks.js     carga de datos con recarga automática
  ui.jsx       componentes reutilizables
  screens/     una pantalla por módulo
```

## Despliegue sugerido
Vercel o Netlify: build `npm run build`, carpeta `dist`, y la variable `VITE_API_URL` con la URL pública de la API. Agrega el dominio resultante a `CORS_ORIGINS` en la API.
