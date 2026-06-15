import { Link } from 'react-router-dom';
import { ClipboardList, Leaf, Package, ShoppingCart, Tags, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isAdminUser, isClientUser } from '../utils/roles';

const clientActions = [
  {
    label: 'Hacer pedido',
    description: 'Ver productos disponibles y agregarlos al carrito.',
    to: '/hacer-pedido',
    icon: ShoppingCart,
    colorClass: 'bg-teal-100 text-teal-700',
  },
  {
    label: 'Mis pedidos',
    description: 'Consultar estado actual e historial de pedidos.',
    to: '/mis-pedidos',
    icon: ClipboardList,
    colorClass: 'bg-blue-100 text-blue-700',
  },
  {
    label: 'Mi perfil',
    description: 'Editar datos personales y direcciones de entrega.',
    to: '/perfil',
    icon: User,
    colorClass: 'bg-amber-100 text-amber-700',
  },
];

const adminActions = [
  {
    label: 'Pedidos',
    description: 'Ver todos los pedidos y cambiar sus estados.',
    to: '/admin/pedidos',
    icon: ClipboardList,
    colorClass: 'bg-blue-100 text-blue-700',
  },
  {
    label: 'Productos',
    description: 'Administrar catalogo, imagenes, categorias e ingredientes.',
    to: '/productos',
    icon: Package,
    colorClass: 'bg-gray-100 text-gray-700',
  },
  {
    label: 'Ingredientes',
    description: 'Agregar stock y mantener ingredientes.',
    to: '/ingredientes',
    icon: Leaf,
    colorClass: 'bg-green-100 text-green-700',
  },
  {
    label: 'Categorias',
    description: 'Organizar el catalogo de productos.',
    to: '/categorias',
    icon: Tags,
    colorClass: 'bg-amber-100 text-amber-700',
  },
];

export function DashboardPage() {
  const { user } = useAuth();
  const displayName = [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.email || 'Usuario';
  const actions = isAdminUser(user) ? adminActions : isClientUser(user) ? clientActions : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Bienvenido, <span className="font-medium text-gray-700 dark:text-gray-300">{displayName}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map(({ label, description, to, icon: Icon, colorClass }) => (
          <Link
            key={to}
            to={to}
            className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm transition-colors hover:border-[#2a7a8a]/40 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/60"
          >
            <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center mb-4`}>
              <Icon size={20} />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
            <p className="mt-2 text-sm leading-5 text-gray-500 dark:text-gray-400">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
