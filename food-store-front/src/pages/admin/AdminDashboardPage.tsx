import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CircleDollarSign, ClipboardList, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getIngresos, getPedidosPorEstado, getProductosTop, getResumenEstadisticas, getVentas } from '../../api/cliente';

const COLORS = ['#2a7a8a', '#e9a23b', '#5f7d5a', '#d45c5c', '#6b7280'];

function money(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value));
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="min-h-[340px] rounded-lg border border-gray-200 bg-white p-5 text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"><h2 className="mb-5 text-base font-semibold">{title}</h2><div className="h-[270px] text-gray-500 dark:text-gray-400">{children}</div></section>;
}

const axisTick = { fontSize: 11, fill: 'var(--chart-text)' };
const tooltipStyle = { backgroundColor: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-border)', borderRadius: 8, color: 'var(--chart-tooltip-text)' };

export function AdminDashboardPage() {
  const range = useMemo(() => {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(hasta.getDate() - 29);
    return { desde: isoDate(desde), hasta: isoDate(hasta) };
  }, []);
  const resumen = useQuery({ queryKey: ['estadisticas', 'resumen'], queryFn: getResumenEstadisticas });
  const ventas = useQuery({ queryKey: ['estadisticas', 'ventas', range], queryFn: () => getVentas(range.desde, range.hasta) });
  const productos = useQuery({ queryKey: ['estadisticas', 'productos-top'], queryFn: () => getProductosTop(8) });
  const estados = useQuery({ queryKey: ['estadisticas', 'pedidos-estado'], queryFn: getPedidosPorEstado });
  const ingresos = useQuery({ queryKey: ['estadisticas', 'ingresos', range], queryFn: () => getIngresos(range.desde, range.hasta) });
  const loading = resumen.isLoading || ventas.isLoading || productos.isLoading || estados.isLoading || ingresos.isLoading;
  const hasError = resumen.isError || ventas.isError || productos.isError || estados.isError || ingresos.isError;
  const cards = [
    { label: 'Ventas de hoy', value: money(resumen.data?.ventas_hoy ?? 0), icon: CircleDollarSign, color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Ticket promedio', value: money(resumen.data?.ticket_promedio ?? 0), icon: Activity, color: 'bg-sky-100 text-sky-700' },
    { label: 'Pedidos activos', value: resumen.data?.pedidos_activos ?? 0, icon: ClipboardList, color: 'bg-amber-100 text-amber-700' },
    { label: 'Ventas del mes', value: money(resumen.data?.ventas_mes ?? 0), icon: TrendingUp, color: 'bg-gray-100 text-gray-700' },
  ];

  return <div className="space-y-6 text-gray-900 dark:text-white">
    <div><h1 className="text-3xl font-bold">Panel administrativo</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Indicadores operativos y comerciales de los ultimos 30 dias.</p></div>
    {hasError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">Algunas estadisticas no estan disponibles. Los paneles se actualizaran cuando el backend responda.</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, color }) => <article key={label} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${color}`}><Icon size={22} /></span><p className="text-sm text-gray-500 dark:text-gray-400">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : value}</p></article>)}</div>
    <div className="grid gap-5 xl:grid-cols-2">
      <ChartCard title="Ventas por dia"><ResponsiveContainer width="100%" height="100%"><LineChart data={ventas.data ?? []}><CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="periodo" tick={axisTick} /><YAxis tick={axisTick} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => money(Number(value))} /><Line type="monotone" dataKey="total_ventas" name="Ventas" stroke="#2a7a8a" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Productos mas vendidos"><ResponsiveContainer width="100%" height="100%"><BarChart data={productos.data ?? []} layout="vertical" margin={{ left: 20 }}><CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tick={axisTick} /><YAxis type="category" dataKey="nombre" width={105} tick={axisTick} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="cantidad_vendida" name="Unidades" fill="#5f7d5a" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Pedidos por estado"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={estados.data ?? []} dataKey="cantidad" nameKey="estado_codigo" innerRadius={55} outerRadius={90} paddingAngle={3}>{(estados.data ?? []).map((item, index) => <Cell key={item.estado_codigo} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ color: 'var(--chart-text)' }} /></PieChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Ingresos por forma de pago"><ResponsiveContainer width="100%" height="100%"><BarChart data={ingresos.data ?? []}><CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="forma_pago_codigo" tick={axisTick} /><YAxis tick={axisTick} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => money(Number(value))} /><Bar dataKey="total" name="Ingresos" fill="#e9a23b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
    </div>
  </div>;
}
