import { useState, useEffect } from 'react';
import { Search, Bell, Sun, Moon } from 'lucide-react';

export function Header() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

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

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-6 gap-4 flex-shrink-0">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#2a7a8a]/40"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => setDark((d) => !d)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          title={dark ? 'Modo claro' : 'Modo oscuro'}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
