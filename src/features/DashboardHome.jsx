import React from 'react';
import config from '../nawah.config.json'; // استيراد الإعدادات

const DashboardHome = () => {
  // تصفية الوحدات بناءً على إعدادات العميل
  const availableModules = [
    { id: 'inventory', title: "المخزون", icon: "📦", show: config.modules.inventory },
    { id: 'waste_analysis', title: "تحليل الهالك", icon: "♻️", show: config.modules.waste_analysis },
    { id: 'ai_mentor', title: "مركز التلمذة", icon: "🎓", show: config.modules.ai_mentor }
  ].filter(m => m.show);

  return (
    <div className="p-6 text-right" dir="rtl">
      <h1 className="text-xl font-bold mb-6 text-gray-800">أهلاً بك في {config.clientName}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableModules.map(m => (
          <div key={m.id} className="p-8 rounded-3xl bg-white/20 backdrop-blur-lg border border-white shadow-xl cursor-pointer hover:scale-105 transition-all">
            <span className="text-4xl">{m.icon}</span>
            <h3 className="mt-4 font-bold text-lg">{m.title}</h3>
            <p className="text-xs text-gray-500 mt-2">اضغط لإدارة موديول {m.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
