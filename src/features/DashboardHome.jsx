import React, { useState, useEffect } from 'react';
// الاستيراد المباشر يحل مشكلة الـ Top-level await ويضمن وجود الملف أثناء الـ Build
import configData from '../nawah.config.json';

const DashboardHome = () => {
  // استخدام الحالة (State) لضمان استقرار البيانات
  const [config, setConfig] = useState(configData);

  const modulesSettings = config?.modules;
  const clientName = config?.clientName || "Nawah User";

  const allModules = [
    { id: 'inventory', title: "المخزون", icon: "📦", show: modulesSettings?.inventory },
    { id: 'waste_analysis', title: "تحليل الهالك", icon: "♻️", show: modulesSettings?.waste_analysis },
    { id: 'ai_mentor', title: "مركز التلمذة", icon: "🎓", show: modulesSettings?.ai_mentor }
  ];

  const availableModules = allModules.filter(m => m.show);

  return (
    <div className="p-6 text-right animate-in fade-in duration-500" dir="rtl">
      <h1 className="text-2xl font-black mb-8 text-gray-800">
        أهلاً بك في <span className="text-pink-500">{clientName}</span>
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableModules.map(m => (
          <div 
            key={m.id} 
            className="p-8 rounded-[2.5rem] bg-white/30 backdrop-blur-xl border border-white/50 shadow-xl shadow-pink-100/10 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-300"
          >
            <div className="bg-white/60 w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-sm mb-6">
              {m.icon}
            </div>
            <h3 className="font-bold text-gray-800 text-lg">{m.title}</h3>
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">اضغط لإدارة موديول {m.title} عبر نظام Nawah</p>
            
            <div className="mt-6 flex justify-end">
               <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 text-xs">←</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardHome;
