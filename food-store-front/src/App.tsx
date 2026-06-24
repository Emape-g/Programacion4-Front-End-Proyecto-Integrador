import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute } from './router/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { IngredientesPage } from './pages/ingredientes/IngredientesPage';
import { CategoriasPage } from './pages/categorias/CategoriasPage';
import Productos from './pages/Productos';
import ProductNuevo from './pages/ProductNuevo';
import { CatalogoClientePage } from './pages/cliente/CatalogoClientePage';
import { CarritoPage } from './pages/cliente/CarritoPage';
import { CheckoutReturnPage } from './pages/cliente/CheckoutReturnPage';
import { PerfilPage } from './pages/cliente/PerfilPage';
import { PedidoDetallePage, PedidosPage } from './pages/cliente/PedidosPage';
import { AdminPedidosPage } from './pages/admin/AdminPedidosPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsuariosPage } from './pages/admin/AdminUsuariosPage';
import { AdminPedidoDetallePage } from './pages/admin/AdminPedidoDetallePage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Navigate to="/hacer-pedido" replace />} />

            <Route element={<Layout />}>
              <Route path="/hacer-pedido" element={<CatalogoClientePage />} />
              <Route path="/carrito" element={<CarritoPage />} />
              <Route path="/checkout/:estado" element={<CheckoutReturnPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['CLIENT']} />}>
              <Route element={<Layout />}>
                <Route path="/perfil" element={<PerfilPage />} />
                <Route path="/mis-pedidos" element={<PedidosPage />} />
                <Route path="/pedidos/:id" element={<PedidoDetallePage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute roles={['ADMIN', 'PEDIDOS']} />}>
              <Route element={<Layout />}>
                <Route path="/admin/pedidos" element={<AdminPedidosPage />} />
                <Route path="/admin/pedidos/:id" element={<AdminPedidoDetallePage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route element={<Layout />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
                <Route path="/productos/nuevo" element={<ProductNuevo />} />
                <Route path="/productos/:id/editar" element={<ProductNuevo />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute roles={['ADMIN', 'STOCK']} />}>
              <Route element={<Layout />}>
                <Route path="/ingredientes" element={<IngredientesPage />} />
                <Route path="/categorias" element={<CategoriasPage />} />
                <Route path="/productos" element={<Productos />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/hacer-pedido" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
