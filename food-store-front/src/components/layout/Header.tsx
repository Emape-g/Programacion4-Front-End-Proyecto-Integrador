import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Leaf, LogIn, Menu, Moon, ShoppingCart, Sun, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { canManageCatalog, canManagePedidos, isAdminUser, isClientUser } from '../../utils/roles';
import { useUiStore } from '../../store/uiStore';

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-[#2a7a8a] text-white'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
  }`;
}

export function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileMenuOpen = useUiStore((state) => state.mobileMenuOpen);
  const setMobileMenuOpen = useUiStore((state) => state.setMobileMenuOpen);

  const displayName = [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.email || 'Usuario';
  const initial = displayName[0]?.toUpperCase() ?? 'U';
  const client = isClientUser(user);
  const pedidosRole = canManagePedidos(user);
  const catalogRole = canManageCatalog(user);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
      <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center gap-5 px-5 sm:px-8 lg:px-10">
        <Link to={pedidosRole ? '/admin/pedidos' : catalogRole ? '/productos' : '/hacer-pedido'} className="flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#2a7a8a] text-white">
            <Leaf size={23} />
          </span>
          <span className="text-xl font-bold">FoodStore</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {pedidosRole || catalogRole ? (
            <>
              {pedidosRole && (
                <>
                  {isAdminUser(user) && (
                    <NavLink to="/admin" end className={navClass}>
                      Panel
                    </NavLink>
                  )}
                  <NavLink to="/admin/pedidos" className={navClass}>
                    Pedidos
                  </NavLink>
                  {isAdminUser(user) && (
                    <NavLink to="/admin/usuarios" className={navClass}>
                      Usuarios
                    </NavLink>
                  )}
                </>
              )}
              {catalogRole && (
                <>
                  <NavLink to="/productos" className={navClass}>
                    Productos
                  </NavLink>
                  <NavLink to="/ingredientes" className={navClass}>
                    Ingredientes
                  </NavLink>
                  <NavLink to="/categorias" className={navClass}>
                    Categorias
                  </NavLink>
                </>
              )}
            </>
          ) : (
            <NavLink to="/hacer-pedido" className={navClass}>
              Productos
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-lg p-2.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 md:hidden" title="Abrir navegacion">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          {!pedidosRole && !catalogRole && (
            <button
              onClick={() => navigate('/carrito')}
              className="relative rounded-lg p-2.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
              title="Mi carrito"
            >
              <ShoppingCart size={23} />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-[#2a7a8a] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setDark((d) => !d)}
            className="rounded-lg p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
            title={dark ? 'Modo claro' : 'Modo oscuro'}
          >
            {dark ? <Sun size={21} /> : <Moon size={21} />}
          </button>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2a7a8a] text-sm font-bold text-white">
                  {initial}
                </span>
                <span className="hidden max-w-44 truncate sm:inline">{displayName}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {client && (
                    <>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate('/perfil');
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        Mi perfil
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate('/mis-pedidos');
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        Mis pedidos
                      </button>
                    </>
                  )}
                  {(pedidosRole || catalogRole) && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate(isAdminUser(user) ? '/admin' : pedidosRole ? '/admin/pedidos' : '/productos');
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Panel admin
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="block w-full border-t border-gray-100 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-900/20"
                  >
                    Cerrar sesion
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2a7a8a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#236b7a]"
            >
              <LogIn size={17} />
              Iniciar sesion
            </button>
          )}
        </div>
      </div>
      {mobileMenuOpen && <nav className="border-t border-gray-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-800 md:hidden">
        <div className="grid gap-1">
          {pedidosRole || catalogRole ? <>
            {isAdminUser(user) && <NavLink onClick={() => setMobileMenuOpen(false)} to="/admin" end className={navClass}>Panel</NavLink>}
            {pedidosRole && <NavLink onClick={() => setMobileMenuOpen(false)} to="/admin/pedidos" className={navClass}>Pedidos</NavLink>}
            {isAdminUser(user) && <NavLink onClick={() => setMobileMenuOpen(false)} to="/admin/usuarios" className={navClass}>Usuarios</NavLink>}
            {catalogRole && <><NavLink onClick={() => setMobileMenuOpen(false)} to="/productos" className={navClass}>Productos</NavLink><NavLink onClick={() => setMobileMenuOpen(false)} to="/ingredientes" className={navClass}>Ingredientes</NavLink><NavLink onClick={() => setMobileMenuOpen(false)} to="/categorias" className={navClass}>Categorias</NavLink></>}
          </> : <><NavLink onClick={() => setMobileMenuOpen(false)} to="/hacer-pedido" className={navClass}>Productos</NavLink>{client && <><NavLink onClick={() => setMobileMenuOpen(false)} to="/mis-pedidos" className={navClass}>Mis pedidos</NavLink><NavLink onClick={() => setMobileMenuOpen(false)} to="/perfil" className={navClass}>Mi perfil</NavLink></>}</>}
        </div>
      </nav>}
    </header>
  );
}
