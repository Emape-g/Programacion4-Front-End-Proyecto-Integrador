import { Package, Leaf, ShieldAlert, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const metrics = [
  { label: 'Total Ingredientes', value: '—', icon: Package, colorClass: 'bg-blue-100 text-blue-600' },
  { label: 'Alérgenos', value: '—', icon: ShieldAlert, colorClass: 'bg-red-100 text-red-600' },
  { label: 'Sin alérgeno', value: '—', icon: Leaf, colorClass: 'bg-green-100 text-green-600' },
  { label: 'Última actualización', value: '—', icon: Clock, colorClass: 'bg-amber-100 text-amber-600' },
];

export function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.name ?? user?.email ?? 'Usuario';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Bienvenido,{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">{displayName}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon, colorClass }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center mb-4`}>
              <Icon size={20} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
