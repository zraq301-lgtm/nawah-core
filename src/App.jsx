import React, { useState, useEffect } from 'react';
// استيراد المكونات بحروف صغيرة لتجنب أخطاء نظام Linux في GitHub Actions
import DashboardShell from './components/dashboardshell';
import DynamicTable from './components/dynamictable';
import { useTenantStore } from './store/useTenantStore';
import { 
  Cpu, 
  TrendingUp, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Zap 
} from 'lucide-react';

/**
 * بيانات تجريبية تحاكي استجابة النظام (NoSQL Metadata)
 */
const INITIAL_DATA = [
  { id: "NW-991", metadata: { "المنتج": "معمول فستق", "الكمية": 1200, "الحالة": "مستقر", "الجودة": "98%" } },
  { id: "NW-992", metadata: { "المنتج": "بسكويت تمر", "الكمية": 450, "الحالة": "نقص مخزون", "الأولوية": "عالية" } },
  { id: "NW-993", metadata: { "المنتج": "غريبة سادة", "الكمية": 800, "الحالة": "مستقر", "الوردية": "صباحية" } },
];

function App() {
  // جلب الحالة من Store (Zustand)
  const { tenantName, aiStatus } = useTenantStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(INITIAL_DATA);

  // وظيفة تحديث البيانات لمحاكاة الاتصال بـ API
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <DashboardShell tenantName={tenantName}>
      {/* Header Section */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter mb-2">
            لوحة التحكم <span className="text-indigo-500 italic">الذكية</span>
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">AI: {aiStatus}</span>
            </div>
            <span className="text-slate-500 font-medium">نظام التشغيل v2.0.0</span>
          </div>
        </div>

        <button 
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-3.5 rounded-2xl transition-all font-black shadow-2xl shadow-indigo-500/20 active:scale-95"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          {loading ? "جاري المزامنة..." : "تحديث البيانات"}
        </button>
      </header>

      {/* Quick Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Card 1: AI Insight */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-500">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
          <div className="p-3 bg-indigo-500/10 rounded-2xl w-fit mb-6 border border-indigo-500/20">
            <Cpu className="text-indigo-400" size={24} />
          </div>
          <h4 className="text-slate-400 text-sm font-bold mb-1">كفاءة معالجة البيانات</h4>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-white tracking-tight">94.2%</p>
            <span className="text-emerald-400 text-xs font-bold">+1.4%</span>
          </div>
        </div>

        {/* Card 2: Production */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] backdrop-blur-xl">
          <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit mb-6 border border-emerald-500/20">
            <TrendingUp className="text-emerald-400" size={24} />
          </div>
          <h4 className="text-slate-400 text-sm font-bold mb-1">معدل الإنتاج اليومي</h4>
          <p className="text-4xl font-black text-white tracking-tight">2.4k</p>
        </div>

        {/* Card 3: System Health */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] backdrop-blur-xl border-l-4 border-l-amber-500">
          <div className="p-3 bg-amber-500/10 rounded-2xl w-fit mb-6 border border-amber-500/20">
            <Zap className="text-amber-400" size={24} />
          </div>
          <h4 className="text-slate-400 text-sm font-bold mb-1">زمن استجابة النظام</h4>
          <p className="text-4xl font-black text-white tracking-tight">12ms</p>
        </div>
      </section>

      {/* Data Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_15px_#6366f1]"></div>
          <h3 className="text-2xl font-bold text-white tracking-tight">سجل العمليات المباشر</h3>
        </div>
        
        <div className="rounded-3xl border border-slate-800/50 bg-slate-900/10 backdrop-blur-sm overflow-hidden shadow-2xl">
          <DynamicTable data={data} />
        </div>
      </section>
    </DashboardShell>
  );
}

export default App;
