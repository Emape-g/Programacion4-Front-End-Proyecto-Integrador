import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';

const styles = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
};
const icons = { success: CheckCircle2, error: AlertCircle, warning: TriangleAlert, info: Info };

export function Toast() {
  const toast = useUiStore((state) => state.toast);
  const clearToast = useUiStore((state) => state.clearToast);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(clearToast, 4500);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);
  if (!toast) return null;
  const Icon = icons[toast.kind];
  return <div role="status" className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${styles[toast.kind]}`}><Icon size={19} /><span className="flex-1">{toast.message}</span><button onClick={clearToast} title="Cerrar aviso"><X size={17} /></button></div>;
}
