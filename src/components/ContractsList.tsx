import React, { useState, useEffect } from 'react';
import { Plus, X, Search, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function ContractsList({ token, ...props }: { token: string, [key: string]: any }) {
  const [contracts, setContracts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingContract, setEditingContract] = useState<any | null>(null);

  // Form state for preview
  const [totalValue, setTotalValue] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);

  const installmentValue = installmentsCount > 0 
    ? (totalValue - downPayment) / installmentsCount 
    : 0;

  const fetchContracts = () => {
    fetch('/api/contracts', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setContracts(data));
  };

  const fetchClients = () => {
    fetch('/api/clients', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setClients(data));
  };

  useEffect(() => {
    fetchContracts();
    fetchClients();
  }, [token]);

  const handleCreateContract = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Convert values to numbers and format keys for backend
    const payload = {
      clientId: data.client_id,
      description: data.description,
      totalValue: Number(data.total_value),
      downPayment: Number(data.down_payment),
      installmentsCount: Number(data.installments_count),
      installmentValue: installmentValue,
      dueDay: Number(data.due_day),
      firstInstallmentDate: data.first_installment_date,
      pixKey: data.pix_key
    };

    try {
      const url = editingContract ? `/api/contracts/${editingContract.id}` : '/api/contracts';
      const method = editingContract ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (res.ok) {
        closeModal();
        fetchContracts();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert(`Erro ao ${editingContract ? 'editar' : 'criar'} contrato`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita e excluirá todas as parcelas associadas.')) return;
    
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchContracts();
      } else {
        const result = await res.json();
        alert(result.error);
      }
    } catch (err) {
      alert('Erro ao excluir contrato');
    }
  };

  const openEditModal = (contract: any) => {
    setEditingContract(contract);
    setTotalValue(contract.total_value);
    setDownPayment(contract.down_payment);
    setInstallmentsCount(contract.installments_count);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContract(null);
    setTotalValue(0);
    setDownPayment(0);
    setInstallmentsCount(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900">Contratos</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
        >
          <Plus size={16} /> Novo Contrato
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Descrição</th>
                <th className="px-6 py-4 font-semibold">Valor Total</th>
                <th className="px-6 py-4 font-semibold">Parcelas</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900">{contract.client_name}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{contract.description}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-zinc-900">
                    R$ {contract.total_value.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">
                    {contract.installments_count}x de R$ {contract.installment_value.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${
                      contract.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                      contract.status === 'paid' ? 'bg-blue-50 text-blue-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {contract.status === 'active' ? 'Ativo' : contract.status === 'paid' ? 'Pago' : 'Cancelado'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => openEditModal(contract)}
                        className="text-zinc-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteContract(contract.id)}
                        className="text-zinc-400 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-8"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900">{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</h3>
                <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateContract} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Cliente</label>
                  <select name="client_id" required defaultValue={editingContract?.client_id || ''} className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.cpf})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Descrição do Serviço/Produto</label>
                  <input name="description" type="text" required defaultValue={editingContract?.description || ''} className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Valor do Acordo (R$)</label>
                    <input 
                      name="total_value" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      required 
                      value={totalValue}
                      onChange={(e) => setTotalValue(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Entrada (R$)</label>
                    <input 
                      name="down_payment" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      required 
                      value={downPayment}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Qtd. Parcelas</label>
                    <input 
                      name="installments_count" 
                      type="number" 
                      min="1" 
                      max="120" 
                      required 
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Dia do Vencimento</label>
                    <input name="due_day" type="number" min="1" max="31" required defaultValue={editingContract?.due_day || ''} className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>

                {totalValue > 0 && installmentsCount > 0 && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-emerald-600 font-medium">Resumo do Carnê</p>
                      <p className="text-xs text-emerald-500">Valor a ser financiado: R$ {(totalValue - downPayment).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-700">
                        {installmentsCount}x de R$ {installmentValue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Data 1ª Parcela</label>
                  <input name="first_installment_date" type="date" required defaultValue={editingContract?.first_installment_date || ''} className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Chave Pix para Recebimento</label>
                  <input name="pix_key" type="text" required defaultValue={editingContract?.pix_key || '62991374935'} placeholder="Sua chave Pix..." className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg font-medium transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors disabled:opacity-50">
                    {loading ? 'Salvando...' : (editingContract ? 'Salvar Alterações' : 'Gerar Carnê')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
