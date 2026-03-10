import React from 'react';

export function SidebarItem({ 
  icon, 
  label, 
  active, 
  onClick, 
  collapsed 
}: { 
  icon: React.ReactNode, 
  label: string, 
  active: boolean, 
  onClick: () => void, 
  collapsed: boolean 
}) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
          ? 'bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100' 
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
      }`}
    >
      <div className="shrink-0">{icon}</div>
      {!collapsed && <span className="font-medium">{label}</span>}
    </button>
  );
}
