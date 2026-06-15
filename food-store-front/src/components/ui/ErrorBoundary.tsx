import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de interfaz:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6 dark:bg-gray-900">
        <section className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-7 text-center shadow-sm dark:border-red-900/60 dark:bg-gray-800">
          <AlertTriangle className="mx-auto text-red-500" size={38} />
          <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">No se pudo mostrar esta pantalla</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Ocurrio un error inesperado. Puedes volver al inicio o recargar la aplicacion.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => window.location.assign('/hacer-pedido')} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200"><Home size={16} />Inicio</button>
            <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-lg bg-[#2a7a8a] px-4 py-2 text-sm font-medium text-white"><RefreshCw size={16} />Recargar</button>
          </div>
        </section>
      </main>
    );
  }
}
