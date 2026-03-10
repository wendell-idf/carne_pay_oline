import React from 'react';

export function StatCard({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string, 
  value: string, 
  icon: React.ReactNode, 
  color: string 
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-zinc-500">{title}</span>
        <div className={`p-2 bg-${color}-50 rounded-lg`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-zinc-900">{value}</div>
    </div>
  );
}
