import React, { useState } from 'react';
import { useTenantStore } from './store/useTenantStore';
import { 
  Cpu, TrendingUp, AlertCircle, RefreshCw, 
  LayoutDashboard, Package, Activity, Settings, ChevronRight 
} from 'lucide-react';

// --- مكون الـ Shell (تم دمجه هنا لحل مشكلة المسارات) ---
const DashboardShell = ({ children, tenantName }) => (
  <div className="flex h-screen bg-[#020617] text-slate-200 font-sans antialiased overflow-hidden">
    <aside className="w-72 border-r border-slate-800/50 flex flex-col bg-[#020617]/80 backdrop-blur-xl">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <Cpu className="text-indigo-400" size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-white">NAWAH <span className="text-indigo-500">AI-OS</span></h1>
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">NODE: {tenantName}</p>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg">
          <LayoutDashboard size={20} />
          <span className="text-sm font-bold">Overview</span>
        </div>
        <div className="flex items-center gap-3 p-3.5 rounded-xl text-slate-500 hover:bg-slate-800/40 transition-all cursor-pointer">
          <Package size={20} />
          <span className="text-sm font-bold">Inventory</span>
        </div>
      </nav>
    </aside>
    <main className="flex-1 relative overflow-auto bg-[#020617] p-8">
      <div className="max-w-7xl mx-auto">{children}</div>
    </main>
  </div>
);

// --- مكون الـ Table (تم دمجه هنا لحل مشكلة المسارات) ---
const DynamicTable = ({ data }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/20">
    <table className="w-full text-right">
      <thead>
        <tr className="bg-slate-900/50 border-b border-slate-800 text-slate-400 text-sm">
          <th className="p-4">ID</th>
          <th className="p-4">المنتج</th>
          <th className="p-4">المخزون</th>
          <th className="p-4">الحالة</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
            <td className="p-4 text-indigo-400 font-mono text-sm">{row.id}</td>
            <td className="p-4 text-slate-300 text-sm">{row.metadata["المنتج"]}</td>
            <td className="p-4 text-slate-300 text-sm">{row.metadata["المخزون"]}</td>
            <td className="p-4 text-slate-300 text-sm">{row.metadata["الحالة"]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// --- التطبيق الرئيسي ---
const mockData = [
  { id: "NW-101", metadata: { "المنتج": "معمول فستق", "المخزون": 1200, "الحالة": "جيد" } },
  { id: "NW-102", metadata: { "المنتج": "بسكويت تمر", "المخزون": 450, "الحالة": "نقص" } },
];

function App() {
  const { tenantName, aiStatus } = useTenantStore();

  return (
    <DashboardShell tenantName={tenantName}>
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">لوحة التحكم الذكية</h2>
          <p className="text-slate-400">حالة الذكاء الاصطناعي: <span className="text-emerald-400 font-mono">{aiStatus}</span></p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-indigo-500/20 transition-all">
          تحديث النظام
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
          <Cpu className="text-indigo-400 mb-4" size={24} />
          <h4 className="text-slate-400 text-sm mb-1">كفاءة المعالجة</h4>
          <p className="text-3xl font-black text-white">94.8%</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
          <TrendingUp className="text-emerald-400 mb-4" size={24} />
          <h4 className="text-slate-400 text-sm mb-1">معدل الإنتاج</h4>
          <p className="text-3xl font-black text-white">2.4k</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl border-l-4 border-l-amber-500">
          <AlertCircle className="text-amber-400 mb-4" size={24} />
          <h4 className="text-slate-400 text-sm mb-1">التنبيهات</h4>
          <p className="text-3xl font-black text-white">3 أصناف</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
        <h3 className="text-2xl font-bold text-white tracking-tight">سجل العمليات</h3>
      </div>
      <DynamicTable data={mockData} />
    </DashboardShell>
  );
}

export default App;
