import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Copy, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { Installment } from '../types';
import { differenceInDays, parse, isValid } from 'date-fns';

export function InstallmentRow({ item, token, totalInstallments, ...props }: { item: Installment, token: string, totalInstallments?: number, [key: string]: any }) {
  const [expanded, setExpanded] = useState(false);

  const copyPix = () => {
    navigator.clipboard.writeText(item.pix_key || '62991374935');
    alert('Chave Pix copiada!');
  };

  // Format due date for display
  let displayDueDate = item.due_date;
  let dueDateObj = parse(item.due_date, 'dd/MM/yyyy', new Date());
  if (!isValid(dueDateObj)) {
    dueDateObj = parse(item.due_date, 'yyyy-MM-dd', new Date());
    if (isValid(dueDateObj)) {
      displayDueDate = dueDateObj.toLocaleDateString('pt-BR');
    }
  }

  // Calculate overdue days
  let overdueDays = 0;
  if (item.status !== 'paid') {
    if (isValid(dueDateObj)) {
      const today = new Date();
      // Reset times to compare just the dates
      today.setHours(0, 0, 0, 0);
      dueDateObj.setHours(0, 0, 0, 0);
      
      const diff = differenceInDays(today, dueDateObj);
      if (diff > 0) {
        overdueDays = diff;
      }
    }
  }

  // Determine effective status for styling
  const effectiveStatus = item.status === 'paid' ? 'paid' : (overdueDays > 0 ? 'overdue' : 'pending');

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-md ${overdueDays > 0 ? 'border-red-200' : 'border-zinc-200'}`}>
      <div 
        className="p-5 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
            effectiveStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 
            effectiveStatus === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-zinc-50 text-zinc-600'
          }`}>
            {item.number}
          </div>
          <div>
            <p className="font-bold text-zinc-900 flex items-center gap-2">
              Parcela {item.number}{totalInstallments ? ` de ${totalInstallments}` : ''}
              {overdueDays > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  <AlertCircle size={12} />
                  {overdueDays} {overdueDays === 1 ? 'dia' : 'dias'} de atraso
                </span>
              )}
            </p>
            <p className={`text-sm ${overdueDays > 0 ? 'text-red-500 font-medium' : 'text-zinc-500'}`}>
              Vence em {displayDueDate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="font-bold text-zinc-900">R$ {item.value.toFixed(2)}</p>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              effectiveStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
              effectiveStatus === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'
            }`}>
              {effectiveStatus === 'overdue' ? 'Atrasada' : effectiveStatus === 'paid' ? 'Paga' : 'Pendente'}
            </span>
          </div>
          <ChevronRight className={`text-zinc-400 transition-transform ${expanded ? 'rotate-90' : ''}`} size={20} />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-zinc-100 bg-zinc-50/50"
          >
            <div className="p-6 space-y-6">
              {overdueDays > 0 && (
                <div className="flex items-start gap-3 text-red-700 bg-red-50 p-4 rounded-xl border border-red-100">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-bold block mb-1">Atenção: Parcela em Atraso</span>
                    <span className="text-sm">Esta parcela está atrasada há {overdueDays} {overdueDays === 1 ? 'dia' : 'dias'}. Por favor, regularize o pagamento o mais breve possível para evitar juros e multas.</span>
                  </div>
                </div>
              )}

              {item.status !== 'paid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-xl border border-zinc-200">
                    <p className="text-xs font-bold text-zinc-400 uppercase mb-3">Pagamento via Pix</p>
                    <div className="flex items-center justify-between bg-zinc-50 p-3 rounded-lg border border-zinc-100 mb-4">
                      <span className="text-sm font-mono text-zinc-600 truncate mr-2">{item.pix_key || '62991374935'}</span>
                      <button onClick={copyPix} className="text-emerald-600 hover:text-emerald-700 shrink-0">
                        <Copy size={18} />
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Após o pagamento, anexe o comprovante ao lado para que possamos dar baixa na sua parcela.
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-col items-center justify-center text-center">
                    <Upload className="text-zinc-300 mb-2" size={32} />
                    <p className="text-sm font-bold text-zinc-900">Enviar Comprovante</p>
                    <p className="text-xs text-zinc-500 mb-4">Formatos aceitos: JPG, PNG, PDF</p>
                    <input type="file" className="hidden" id={`file-${item.id}`} />
                    <label 
                      htmlFor={`file-${item.id}`}
                      className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-zinc-800 transition-colors"
                    >
                      Selecionar Arquivo
                    </label>
                  </div>
                </div>
              )}
              
              {item.status === 'paid' && (
                <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <CheckCircle2 size={20} />
                  <span className="text-sm font-medium">Esta parcela foi paga e confirmada. Obrigado!</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
