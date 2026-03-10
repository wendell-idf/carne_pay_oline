export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
}

export interface Installment {
  id: string;
  number: number;
  value: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  contract_description: string;
  pix_key: string;
  proof_url?: string;
}

export interface Client {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone?: string;
  address?: string;
  status: 'active' | 'delinquent' | 'blocked';
}
