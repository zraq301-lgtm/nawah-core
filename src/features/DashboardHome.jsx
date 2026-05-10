import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const DashboardHome = () => {
  const navigate = useNavigate();

  const cards = [
    { 
      title: "المخزون التنبؤي", 
      desc: "تحليل الذكاء الاصطناعي للطلبات المستقبلية", 
      icon: "📦",
      color: "from-pink-100 to-white",
      path: "/inventory" // المسار الذي سيفتح عند الضغط
    },
    { 
      title: "تحليل النفايات (الهالك)", 
      desc: "أدوات حساب الفاقد وتحسين كفاءة الإنتاج", 
      icon: "♻️",
      color: "from-green-100 to-white",
      path: "/waste"
    },
    { 
      title: "مركز التلمذة الرقمي", 
      desc: "مراجعة الكود وتوجيهات معمارية للمتدربين", 
      icon: "🎓",
      color: "from-blue-100 to-white",
      path: "/ai-mentor"
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-right"
      dir="rtl"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <div 
            key={index}
            onClick={() => navigate(card.path)} // تفعيل الضغط لفتح الصفحة
            className={`p-6 rounded-3xl bg-gradient-to-br ${card.color} border border-white shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer`}
          >
            <div className="text-3xl mb-4">{card.icon}</div>
            <h3 className="font-bold text-gray-800 mb-1 text-sm">{card.title}</h3>
            <p className="text-[10px] text-gray-500 leading-relaxed h-8">{card.desc}</p>
            <div className="mt-4 flex justify-end">
              <span className="bg-white/50 p-2 rounded-full text-gray-400 text-xs">عرض الوحدة ←</span>
            </div>
          </div>
        ))}
      </div>

      {/* قسم الإحصائيات الذكي */}
      <div className="bg-white/30 backdrop-blur-md border border-white p-6 rounded-3xl shadow-sm">
        <h4 className="text-xs font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          حالة نظام Nawah AI-OS
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] text-gray-500">
          <div className="flex flex-col gap-1">
            <span>قاعدة البيانات</span>
            <span className="text-gray-800 font-bold">PostgreSQL (متصل)</span>
          </div>
          <div className="flex flex-col gap-1">
            <span>محرك الذكاء الاصطناعي</span>
            <span className="text-blue-600 font-bold">Groq Llama 3 (نشط)</span>
          </div>
          <div className="flex flex-col gap-1">
            <span>إصدار النظام</span>
            <span className="text-gray-800 font-bold">1.0.0 Stable</span>
          </div>
          <div className="flex flex-col gap-1">
            <span>توقيت القاهرة</span>
            <span className="text-gray-800 font-bold">{new Date().toLocaleTimeString('ar-EG')}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardHome;
