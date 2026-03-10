import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Plus, CheckCircle2, Clock, AlertCircle, Users, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { StatCard } from './StatCard';

export function AdminDashboard({ token, ...props }: { token: string, [key: string]: any }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setStats(data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [token]);

  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando dashboard...</div>;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900">Dashboard</h2>
        <div className="flex gap-3">
          <button className="bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 flex items-center gap-2">
            <Search size={16} /> Buscar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Recebido (Geral)" value={formatCurrency(stats?.financial?.total_received)} icon={<CheckCircle2 className="text-emerald-500" />} color="emerald" />
        <StatCard title="Pendente (Geral)" value={formatCurrency(stats?.financial?.total_pending)} icon={<Clock className="text-amber-500" />} color="amber" />
        <StatCard title="Vencido (Geral)" value={formatCurrency(stats?.financial?.total_overdue)} icon={<AlertCircle className="text-red-500" />} color="red" />
        <StatCard title="Clientes Ativos" value={stats?.clients || 0} icon={<Users className="text-blue-500" />} color="blue" />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="text-indigo-500" size={24} />
          <h3 className="text-lg font-bold text-zinc-900">Resumo do Mês Atual</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="text-indigo-600 text-sm font-medium mb-1">Recebido neste mês</p>
              <h4 className="text-2xl font-bold text-indigo-900">{formatCurrency(stats?.currentMonth?.month_received)}</h4>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="bg-orange-50 rounded-xl p-6 border border-orange-100 flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium mb-1">A receber neste mês</p>
              <h4 className="text-2xl font-bold text-orange-900">{formatCurrency(stats?.currentMonth?.month_pending)}</h4>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
              <TrendingDown size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">Vencimentos Próximos (7 dias)</h3>
          <button className="text-emerald-600 text-sm font-medium hover:underline">Ver todos</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Vencimento</th>
                <th className="px-6 py-4 font-semibold">Valor</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {stats?.upcoming?.length > 0 ? (
                stats.upcoming.map((item: any) => (
                  <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-bold">
                          {item.client_name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-zinc-900">{item.client_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{item.due_date}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-zinc-900">{formatCurrency(item.value)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full uppercase">Pendente</span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Baixa Manual</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    Nenhum vencimento para os próximos 7 dias.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
