import React, { useState } from 'react';
// تم إصلاح الخطأ هنا: إزالة الأقواس لأن التصدير غالباً default وتأكد من حالة الأحرف
import DashboardShell from './components/DashboardShell';
import DynamicTable from './components/DynamicTable'; 
import { useTenantStore } from './store/useTenantStore';
import { Cpu, TrendingUp, AlertCircle } from 'lucide-react';

// مثال لبيانات NoSQL ديناميكية (تخيل أنها قادمة من MongoDB)
const mockData = [
  { id: 101, metadata: { "المنتج": "معمول فستق", "المخزون": 1200, "الحالة": "جيد", "الوردية": "صباحية" } },
  { id: 102, metadata: { "المنتج": "بسكويت تمر", "المخزون": 450, "الحالة": "نقص مخزون", "تنبيه": "اطلب فوراً" } },
  { id: 103, metadata: { "المنتج": "غريبة سادة", "المخزون": 800, "الحالة": "جيد" } },
];

function App() {
  const { tenantName, aiStatus } = useTenantStore();

  return (
    <DashboardShell tenantName={tenantName}>
      {/* Header Section */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">لوحة التحكم الذكية</h2>
          <p className="text-slate-400">مرحباً بك في نظام Nawah، الذكاء الاصطناعي في حالة: <span className="text-emerald-400 font-mono">{aiStatus}</span></p>
        </div>
        <div className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl cursor-pointer transition-all font-bold shadow-lg shadow-indigo-500/20">
          تحديث البيانات
        </div>
      </div>

      {/* Quick Insights (AI Powered) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <Cpu className="text-indigo-500" />
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded">AI INSIGHT</span>
          </div>
          <h4 className="text-slate-400 text-sm mb-1">توقع الهدر القادم</h4>
          <p className="text-2xl font-bold text-white">12.5% <span className="text-xs text-emerald-400 font-normal">▼ 2% تحسن</span></p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <TrendingUp className="text-emerald-500 mb-4" />
          <h4 className="text-slate-400 text-sm mb-1">كفاءة الإنتاج</h4>
          <p className="text-2xl font-bold text-white">94%</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl border-l-4 border-l-amber-500">
          <AlertCircle className="text-amber-500 mb-4" />
          <h4 className="text-slate-400 text-sm mb-1">تنبيهات المخزون</h4>
          <p className="text-2xl font-bold text-white">3 أصناف</p>
        </div>
      </div>

      {/* Dynamic NoSQL Table */}
      <div className="mb-4 flex items-center gap-2">
         <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
         <h3 className="text-xl font-semibold text-white">سجل البيانات المفتوحة</h3>
      </div>
      <DynamicTable data={mockData} />
    </DashboardShell>
  );
}

export default App;
