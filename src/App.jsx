import React from 'react';
// استيراد المكونات (تأكد أن أسماء الملفات مطابقة تماماً في GitHub)
import DashboardShell from './components/DashboardShell';
import DynamicTable from './components/DynamicTable';
import { useTenantStore } from './store/useTenantStore';
import { Cpu, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * بيانات تجريبية لمحاكاة استجابة قاعدة البيانات (NoSQL Style)
 */
const mockData = [
  { 
    id: "NW-101", 
    metadata: { "المنتج": "معمول فستق", "المخزون": 1200, "الحالة": "مستقر", "الجودة": "98%" } 
  },
  { 
    id: "NW-102", 
    metadata: { "المنتج": "بسكويت تمر", "المخزون": 450, "الحالة": "نقص مخزون", "تنبيه": "إعادة طلب" } 
  },
  { 
    id: "NW-103", 
    metadata: { "المنتج": "غريبة سادة", "المخزون": 800, "الحالة": "مستقر", "الوردية": "مسائية" } 
  },
];

function App() {
  // جلب بيانات حالة النظام واسم العميل من Store
  const { tenantName, aiStatus } = useTenantStore();

  return (
    <DashboardShell tenantName={tenantName}>
      {/* Header: ترحيب وحالة النظام */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter mb-2">
            لوحة التحكم <span className="text-indigo-500">الذكية</span>
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs text-slate-300 font-medium">AI Engine: {aiStatus}</span>
            </div>
            <span className="text-slate-500 text-xs">تحديث تلقائي كل 5 دقائق</span>
          </div>
        </div>
        
        <button className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl transition-all font-bold shadow-xl shadow-indigo-500/20 active:scale-95">
          <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
          تحديث البيانات
        </button>
      </header>

      {/* Quick Insights Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* بطاقة الذكاء الاصطناعي */}
        <div className="relative overflow-hidden bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-md hover:border-indigo-500/50 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-indigo-500/10 rounded-2xl">
              <Cpu className="text-indigo-400" size={24} />
            </div>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg font-black tracking-widest">AI PREDICT</span>
          </div>
          <h4 className="text-slate-400 text-sm font-medium mb-1">نسبة الهدر المتوقعة</h4>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-white">12.5%</p>
            <p className="text-xs text-emerald-400">▼ 2.1% تحسن</p>
          </div>
        </div>

        {/* بطاقة الكفاءة */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-md">
          <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit mb-6">
            <TrendingUp className="text-emerald-400" size={24} />
          </div>
          <h4 className="text-slate-400 text-sm font-medium mb-1">كفاءة الإنتاج الكلية</h4>
          <p className="text-3xl font-black text-white">94.8%</p>
        </div>

        {/* بطاقة التنبيهات */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-md border-l-4 border-l-amber-500">
          <div className="p-3 bg-amber-500/10 rounded-2xl w-fit mb-6">
            <AlertCircle className="text-amber-400" size={24} />
          </div>
          <h4 className="text-slate-400 text-sm font-medium mb-1">تنبيهات المخزون الحرجة</h4>
          <p className="text-3xl font-black text-white">3 أصناف</p>
        </div>
      </section>

      {/* Data Table Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>
            <h3 className="text-2xl font-bold text-white tracking-tight">سجل العمليات</h3>
          </div>
          <div className="text-slate-500 text-sm font-medium">إجمالي السجلات: {mockData.length}</div>
        </div>
        
        <div className="rounded-3xl border border-slate-800/50 bg-slate-900/20 shadow-2xl backdrop-blur-sm overflow-hidden">
          <DynamicTable data={mockData} />
        </div>
      </section>
    </DashboardShell>
  );
}

export default App;
