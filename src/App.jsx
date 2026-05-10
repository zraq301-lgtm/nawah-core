import React from 'react';
/** * الإصلاح الجذري: 
 * 1. استيراد المكونات بدون أقواس {} لأننا جعلنا التصدير Default.
 * 2. إضافة امتداد .jsx صراحةً لإجبار المحرك على مطابقة الملف المرفوع.
 */
import DashboardShell from './components/DashboardShell.jsx';
import DynamicTable from './components/DynamicTable.jsx';
import { useTenantStore } from './store/useTenantStore';
import { Cpu, TrendingUp, AlertCircle } from 'lucide-react';

// بيانات المحاكاة
const mockData = [
  { id: 101, metadata: { "المنتج": "معمول فستق", "المخزون": 1200, "الحالة": "جيد" } },
  { id: 102, metadata: { "المنتج": "بسكويت تمر", "المخزون": 450, "الحالة": "نقص" } },
];

function App() {
  // جلب البيانات من Store (Zustand)
  const { tenantName, aiStatus } = useTenantStore();

  return (
    <DashboardShell tenantName={tenantName}>
      {/* قسم العنوان */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">لوحة التحكم الذكية</h2>
          <p className="text-slate-400 flex items-center gap-2">
            نظام <span className="text-indigo-400 font-bold">Nawah AI</span> في حالة: 
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20">
              {aiStatus}
            </span>
          </p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-xl transition-all font-bold shadow-lg shadow-indigo-500/25 active:scale-95">
          تحديث النظام
        </button>
      </div>

      {/* بطاقات الإحصائيات الذكية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4">
            <Cpu className="text-indigo-500" size={20} />
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded font-black">AI PREDICTION</span>
          </div>
          <h4 className="text-slate-400 text-sm mb-1">نسبة الهدر المتوقعة</h4>
          <p className="text-2xl font-black text-white">12.5% <span className="text-xs text-emerald-400 font-medium ml-1">▼ 2%</span></p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
          <TrendingUp className="text-emerald-500 mb-4" size={20} />
          <h4 className="text-slate-400 text-sm mb-1">كفاءة تشغيل الخطوط</h4>
          <p className="text-2xl font-black text-white">94.8%</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl border-l-4 border-l-amber-500">
          <AlertCircle className="text-amber-500 mb-4" size={20} />
          <h4 className="text-slate-400 text-sm mb-1">تنبيهات المخزون الحالية</h4>
          <p className="text-2xl font-black text-white">3 أصناف</p>
        </div>
      </div>

      {/* جدول البيانات */}
      <div className="flex items-center gap-3 mb-6">
         <div className="w-1.5 h-6 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1]"></div>
         <h3 className="text-xl font-bold text-white tracking-tight">سجل البيانات النشطة</h3>
      </div>
      
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/20">
        <DynamicTable data={mockData} />
      </div>
    </DashboardShell>
  );
}

export default App;
