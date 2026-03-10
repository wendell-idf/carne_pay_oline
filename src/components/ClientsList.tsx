import React, { useState, useEffect } from 'react';
import { Plus, X, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function ClientsList({ token, ...props }: { token: string, [key: string]: any }) {
  const [clients, setClients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);

  // Contract fields state
  const [totalValue, setTotalValue] = useState<number>(0);
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const installmentValue = installmentsCount > 0 ? totalValue / installmentsCount : 0;

  const fetchClients = () => {
    fetch('/api/clients', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setClients(data));
  };

  useEffect(() => {
    fetchClients();
  }, [token]);

  const openModal = (client: any = null) => {
    setEditingClient(client);
    if (client) {
      setTotalValue(client.total_value || 0);
      setInstallmentsCount(client.installments_count || 1);
    } else {
      setTotalValue(0);
      setInstallmentsCount(1);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSaveClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const payload = {
      ...data,
      totalValue: Number(data.totalValue),
      installmentsCount: Number(data.installmentsCount),
      installmentValue: installmentValue
    };

    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';

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
        fetchClients();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert(`Erro ao ${editingClient ? 'editar' : 'criar'} cliente`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900">Clientes</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
        >
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Nome</th>
                <th className="px-6 py-4 font-semibold">CPF</th>
                <th className="px-6 py-4 font-semibold">E-mail</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900">{client.name}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{client.cpf}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{client.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full uppercase">{client.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => openModal(client)}
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
                    >
                      <Pencil size={14} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-8"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-zinc-900">
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveClient} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dados do Cliente */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-zinc-900 border-b border-zinc-100 pb-2">Dados Pessoais</h4>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Nome Completo</label>
                      <input name="name" type="text" defaultValue={editingClient?.name} required className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail</label>
                      <input name="email" type="email" defaultValue={editingClient?.email} required className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">CPF</label>
                      <input name="cpf" type="text" defaultValue={editingClient?.cpf} required className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone</label>
                      <input name="phone" type="text" defaultValue={editingClient?.phone} className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Endereço</label>
                      <input name="address" type="text" defaultValue={editingClient?.address} className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Senha de Acesso {editingClient && '(Deixe em branco para não alterar)'}</label>
                      <input name="password" type="password" placeholder={editingClient ? '••••••••' : 'Padrão: cliente123'} className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                  </div>

                  {/* Dados do Contrato */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-zinc-900 border-b border-zinc-100 pb-2">Dados do Contrato</h4>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Valor Total (R$)</label>
                      <input 
                        name="totalValue" 
                        type="number" 
                        step="0.01" 
                        min="0"
                        value={totalValue}
                        onChange={(e) => setTotalValue(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Número de Parcelas</label>
                      <input 
                        name="installmentsCount" 
                        type="number" 
                        min="1"
                        max="120"
                        value={installmentsCount}
                        onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Valor da Parcela (R$)</label>
                      <input 
                        type="text" 
                        disabled
                        value={installmentValue.toFixed(2)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Vencimento da 1ª Parcela</label>
                      <input 
                        name="firstInstallmentDate" 
                        type="date" 
                        defaultValue={editingClient?.first_installment_date || ''}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Chave Pix</label>
                      <input 
                        name="pixKey" 
                        type="text" 
                        defaultValue={editingClient?.pix_key || '62991374935'}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                      />
                    </div>
                    {editingClient && editingClient.total_value && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-4">
                        <p className="text-xs text-amber-800">
                          <strong>Atenção:</strong> Alterar o valor ou número de parcelas irá recalcular e recriar todas as parcelas <strong>pendentes</strong> deste cliente.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-zinc-100 flex gap-3">
                  <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg font-medium transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors disabled:opacity-50">
                    {loading ? 'Salvando...' : 'Salvar Cliente'}
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
