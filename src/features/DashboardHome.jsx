import React from 'react';

// محاولة استيراد الملف، وفي حال فشله نستخدم إعدادات افتراضية لمنع الشاشة السوداء
let config;
try {
  // ملاحظة: تأكد من وجود الملف في src/nawah.config.json
  config = await import('../nawah.config.json');
} catch (e) {
  // إعدادات احتياطية (Fallback) لضمان فتح التطبيق حتى لو الملف مفقود
  config = {
    clientName: "Nawah User",
    modules: { inventory: true, waste_analysis: true, ai_mentor: true }
  };
}

const DashboardHome = () => {
  // التأكد من وجود البيانات قبل الرندر
  const modulesSettings = config.default?.modules || config.modules;
  const clientName = config.default?.clientName || config.clientName;

  const allModules = [
    { id: 'inventory', title: "المخزون", icon: "📦", show: modulesSettings?.inventory },
    { id: 'waste_analysis', title: "تحليل الهالك", icon: "♻️", show: modulesSettings?.waste_analysis },
    { id: 'ai_mentor', title: "مركز التلمذة", icon: "🎓", show: modulesSettings?.ai_mentor }
  ];

  const availableModules = allModules.filter(m => m.show);

  return (
    <div className="p-6 text-right" dir="rtl">
      <h1 className="text-xl font-bold mb-6 text-gray-800 tracking-tight">
        أهلاً بك في <span className="text-pink-500">{clientName}</span>
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableModules.map(m => (
          <div 
            key={m.id} 
            className="p-8 rounded-[2.5rem] bg-white/30 backdrop-blur-xl border border-white/50 shadow-2xl shadow-pink-100/20 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-300"
          >
            <div className="bg-white/50 w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-inner mb-4">
              {m.icon}
            </div>
            <h3 className="font-black text-gray-800 text-lg">{m.title}</h3>
            <p className="text-[10px] text-gray-400 mt-2 font-medium">نظام Nawah AI المتكامل</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardHome;
