# FoodStore Frontend

Frontend del proyecto integrador de Programacion 4. Incluye catalogo publico, carrito persistente, perfil y direcciones, checkout, Mercado Pago, seguimiento de pedidos y panel administrativo.

## Requisitos

- Node.js 20 o superior
- Backend FoodStore disponible
- Backend configurado con credenciales sandbox de Mercado Pago

## Configuracion

1. Instalar dependencias:

```powershell
npm install
```

2. Crear `.env` tomando `.env.example` como referencia:

```env
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

3. Iniciar el frontend:

```powershell
npm run dev
```

La terminal muestra la URL local de Vite, normalmente `http://localhost:5173`.

## Funcionalidades

- Catalogo publico con busqueda, categorias, paginacion y detalle.
- Carrito Zustand persistente, cantidades unicas y remocion de ingredientes permitidos.
- Registro, login JWT, refresh automatico, perfil y multiples direcciones.
- Checkout con confirmacion, direccion principal y formas de pago habilitadas.
- Mercado Pago Checkout Pro mediante preferencia creada por el backend.
- Listado, detalle, historial y seguimiento automatico de pedidos.
- Administracion de pedidos, productos, stock, categorias, ingredientes, usuarios y roles.
- Carga de imagenes a Cloudinary a traves del backend.
- Dashboard con KPIs y cuatro graficos Recharts.
- Tema claro/oscuro y navegacion responsive.

## Validacion

```powershell
npm run lint
npm run build
```

## Roles

- `CLIENT`: compra, perfil y pedidos propios.
- `ADMIN`: acceso administrativo completo.
- `PEDIDOS`: gestion de pedidos.
- `STOCK`: gestion de catalogo y existencias.

El frontend no modifica el stock localmente: la creacion y cancelacion de pedidos delegan esa transaccion al backend.
