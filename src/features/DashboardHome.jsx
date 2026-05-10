import React from 'react';
import { useNavigate } from 'react-router-dom'; // 1. استيراد أداة التنقل
import configData from '../nawah.config.json';

const DashboardHome = () => {
  const navigate = useNavigate(); // 2. تفعيل أداة التنقل

  const modulesSettings = configData?.modules;
  const clientName = configData?.clientName || "Nawah User";

  const allModules = [
    { 
      id: 'inventory', 
      title: "المخزون", 
      icon: "📦", 
      path: "/inventory", // المسار المطلوب
      show: modulesSettings?.inventory 
    },
    { 
      id: 'waste_analysis', 
      title: "تحليل الهالك", 
      icon: "♻️", 
      path: "/waste", 
      show: modulesSettings?.waste_analysis 
    },
    { 
      id: 'ai_mentor', 
      title: "مركز التلمذة", 
      icon: "🎓", 
      path: "/ai-mentor", 
      show: modulesSettings?.ai_mentor 
    }
  ];

  const availableModules = allModules.filter(m => m.show);

  return (
    <div className="p-6 text-right animate-in fade-in slide-in-from-bottom-4 duration-700" dir="rtl">
      <h1 className="text-2xl font-black mb-8 text-gray-800">
        أهلاً بك في <span className="text-pink-500">{clientName}</span>
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableModules.map(m => (
          <div 
            key={m.id} 
            onClick={() => navigate(m.path)} // 3. الربط البرمجي عند الضغط
            className="p-8 rounded-[2.5rem] bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-pink-100/5 cursor-pointer hover:bg-white/60 hover:scale-[1.02] active:scale-95 transition-all duration-300 group"
          >
            <div className="bg-white/80 w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-sm mb-6 group-hover:bg-pink-500 group-hover:text-white transition-colors duration-300">
              {m.icon}
            </div>
            <h3 className="font-bold text-gray-800 text-lg">{m.title}</h3>
            <p className="text-[11px] text-gray-400 mt-2">اضغط لفتح الوحدة وإدارة البيانات</p>
            
            <div className="mt-6 flex justify-end">
               <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 transition-transform group-hover:translate-x-[-5px]">
                 ←
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardHome;
