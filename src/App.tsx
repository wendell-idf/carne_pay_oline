import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CreditCard, 
  LogOut, 
  Menu, 
  X,
  Settings,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from './types';
import { SidebarItem } from './components/SidebarItem';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientCarnet } from './components/ClientCarnet';
import { ClientsList } from './components/ClientsList';
import { ContractsList } from './components/ContractsList';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [view, setView] = useState<'dashboard' | 'clients' | 'contracts' | 'my-carnet'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'client' | 'admin'>('client');

  // Auth check
  useEffect(() => {
    if (token) {
      // In a real app, verify token or fetch user profile
      const savedUser = localStorage.getItem('user');
      if (savedUser) setUser(JSON.parse(savedUser));
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setView(data.user.role === 'admin' ? 'dashboard' : 'my-carnet');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 relative">
        <button 
          onClick={() => setLoginMode(m => m === 'client' ? 'admin' : 'client')}
          className="absolute top-6 right-6 p-3 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-full transition-all"
          title="Acesso Administrativo"
        >
          <Settings size={24} />
        </button>

        <motion.div 
          key={loginMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 p-8"
        >
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
              loginMode === 'admin' ? 'bg-zinc-900 text-white' : 'bg-emerald-100 text-emerald-600'
            }`}>
              {loginMode === 'admin' ? <Settings size={32} /> : <GraduationCap size={32} />}
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">
              {loginMode === 'admin' ? 'Acesso Restrito' : 'Portal do Formando'}
            </h1>
            <p className="text-zinc-500 mt-2">
              {loginMode === 'admin' ? 'Painel de Gestão Administrativa' : 'Acesse seu carnê de formatura'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {loginMode === 'admin' ? 'E-mail do Administrador' : 'E-mail do Cliente'}
              </label>
              <input 
                name="email"
                type="email" 
                required
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="Seu e-mail"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
              <input 
                name="password"
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <button 
              disabled={loading}
              className={`w-full font-semibold py-3 rounded-xl transition-colors shadow-lg disabled:opacity-50 text-white ${
                loginMode === 'admin' 
                  ? 'bg-zinc-900 hover:bg-zinc-800 shadow-zinc-200' 
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className={`bg-white border-r border-zinc-200 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shrink-0">
            <GraduationCap size={18} />
          </div>
          {isSidebarOpen && <span className="font-bold text-zinc-900 truncate">IDF Formaturas</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {user?.role === 'admin' ? (
            <>
              <SidebarItem 
                icon={<LayoutDashboard size={20} />} 
                label="Dashboard" 
                active={view === 'dashboard'} 
                onClick={() => setView('dashboard')}
                collapsed={!isSidebarOpen}
              />
              <SidebarItem 
                icon={<Users size={20} />} 
                label="Clientes" 
                active={view === 'clients'} 
                onClick={() => setView('clients')}
                collapsed={!isSidebarOpen}
              />
              <SidebarItem 
                icon={<FileText size={20} />} 
                label="Contratos" 
                active={view === 'contracts'} 
                onClick={() => setView('contracts')}
                collapsed={!isSidebarOpen}
              />
            </>
          ) : (
            <SidebarItem 
              icon={<FileText size={20} />} 
              label="Meu Carnê" 
              active={view === 'my-carnet'} 
              onClick={() => setView('my-carnet')}
              collapsed={!isSidebarOpen}
            />
          )}
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-bottom border-zinc-200 flex items-center justify-between px-8 shrink-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-zinc-500 hover:text-zinc-900">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-zinc-900">{user?.name}</p>
              <p className="text-xs text-zinc-500 capitalize">{user?.role}</p>
            </div>
            <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600 font-bold">
              {user?.name.charAt(0)}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && <AdminDashboard key="dash" token={token!} />}
            {view === 'my-carnet' && <ClientCarnet key="carnet" token={token!} />}
            {view === 'clients' && <ClientsList key="clients" token={token!} />}
            {view === 'contracts' && <ContractsList key="contracts" token={token!} />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
