import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Leaf,
  Tags,
  ShoppingCart,
  BarChart2,
  Wrench,
  Settings,
  Power,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', enabled: false },
  { to: '/productos', icon: Package, label: 'Productos', enabled: true },
  { to: '/ingredientes', icon: Leaf, label: 'Ingredientes', enabled: true },
  { to: '/categorias', icon: Tags, label: 'Categorías', enabled: true },
  { to: '/compras', icon: ShoppingCart, label: 'Compras', enabled: false },
  { to: '/reportes', icon: BarChart2, label: 'Reportes', enabled: false },
  { to: '/soporte', icon: Wrench, label: 'Soporte', enabled: false },
  { to: '/configuracion', icon: Settings, label: 'Configuración', enabled: false },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const initial = (user?.name ?? user?.email ?? 'U')[0].toUpperCase();

  return (
    <aside className="w-64 min-h-screen bg-[#1a3a4a] flex flex-col text-white flex-shrink-0">
      <div className="px-6 py-5 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-tight">FoodStore</h1>
        <p className="text-xs text-white/50 mt-0.5">Sistema de gestión</p>
      </div>

      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#2a7a8a] flex items-center justify-center text-sm font-semibold flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{user?.name ?? 'Usuario'}</p>
          <p className="text-xs text-white/50 truncate">{user?.email ?? ''}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, enabled }) =>
          enabled ? (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2a7a8a] text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ) : (
            <span
              key={to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/30 cursor-not-allowed select-none"
            >
              <Icon size={18} />
              {label}
            </span>
          )
        )}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Power size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
