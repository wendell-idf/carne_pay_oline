import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { InstallmentRow } from './InstallmentRow';
import { Installment } from '../types';

export function ClientCarnet({ token, ...props }: { token: string, [key: string]: any }) {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');

  useEffect(() => {
    Promise.all([
      fetch('/api/installments/my-installments', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()),
      fetch('/api/contracts/my-contracts', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json())
    ])
    .then(([installmentsData, contractsData]) => {
      setInstallments(installmentsData);
      if (contractsData && contractsData.length > 0) {
        setContract(contractsData[0]);
      }
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [token]);

  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando seu carnê...</div>;

  const totalValue = installments.reduce((acc, item) => acc + item.value, 0);
  const paidInstallments = installments.filter(i => i.status === 'paid');
  const paidValue = paidInstallments.reduce((acc, item) => acc + item.value, 0);
  const remainingValue = totalValue - paidValue;
  const progressPercentage = Math.round((paidValue / totalValue) * 100) || 0;

  const filteredInstallments = installments.filter(item => {
    if (filter === 'paid') return item.status === 'paid';
    if (filter === 'pending') return item.status !== 'paid';
    return true;
  });

  const nextInstallment = installments.find(i => i.status !== 'paid');
  const nextDueDate = nextInstallment ? new Date(nextInstallment.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Quitado';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="bg-emerald-600 rounded-3xl p-8 text-white shadow-xl shadow-emerald-100 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Valor do Acordo</p>
              <h2 className="text-2xl font-bold">R$ {totalValue.toFixed(2)}</h2>
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-sm font-medium mb-1">Saldo Devedor</p>
              <h2 className="text-4xl font-bold">R$ {remainingValue.toFixed(2)}</h2>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-emerald-100 font-medium">Progresso do Pagamento</span>
              <span className="font-bold">{progressPercentage}% Pago</span>
            </div>
            <div className="w-full bg-emerald-800/50 rounded-full h-3 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className="bg-white h-full rounded-full"
              />
            </div>
          </div>

          <div className="flex gap-8 border-t border-emerald-500/30 pt-6">
            <div>
              <p className="text-emerald-100 text-xs uppercase tracking-wider mb-1">Próximo Vencimento</p>
              <p className="font-semibold">{nextDueDate}</p>
            </div>
            <div>
              <p className="text-emerald-100 text-xs uppercase tracking-wider mb-1">Parcelas Pagas</p>
              <p className="font-semibold">{paidInstallments.length} de {contract?.installments_count || installments.length}</p>
            </div>
            <div>
              <p className="text-emerald-100 text-xs uppercase tracking-wider mb-1">Total Já Pago</p>
              <p className="font-semibold">R$ {paidValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
      </div>

      {contract && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Detalhes do Contrato</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-zinc-500 text-sm mb-1">Descrição</p>
              <p className="font-medium text-zinc-900">{contract.description}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-sm mb-1">Total de Parcelas</p>
              <p className="font-medium text-zinc-900">{contract.installments_count}x de R$ {contract.installment_value.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-sm mb-1">Entrada</p>
              <p className="font-medium text-zinc-900">R$ {contract.down_payment.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-sm mb-1">Data da 1ª Parcela</p>
              <p className="font-medium text-zinc-900">{new Date(contract.first_installment_date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-bold text-zinc-900">Minhas Parcelas</h3>
          <div className="flex bg-zinc-100 p-1 rounded-lg">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Todas
            </button>
            <button 
              onClick={() => setFilter('pending')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'pending' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Pendentes
            </button>
            <button 
              onClick={() => setFilter('paid')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'paid' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Pagas
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredInstallments.map((item) => (
            <InstallmentRow key={item.id} item={item} token={token} />
          ))}
          {filteredInstallments.length === 0 && (
            <div className="text-center py-8 text-zinc-500 bg-white rounded-2xl border border-zinc-200">
              Nenhuma parcela encontrada nesta categoria.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
