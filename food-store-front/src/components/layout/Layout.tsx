import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Toast } from '../ui/Toast';

export function Layout() {
  return (
    <div className="min-h-screen bg-[#f0f4f8] text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <Header />
      <main className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 lg:px-10">
        <Outlet />
      </main>
      <Toast />
    </div>
  );
}
