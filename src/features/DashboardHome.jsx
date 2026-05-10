import React from 'react';
import { motion } from 'framer-motion';

const DashboardHome = () => {
  const cards = [
    { 
      title: "المخزون التنبؤي", 
      desc: "تحليل الذكاء الاصطناعي للطلبات المستقبلية", 
      icon: "📦",
      color: "from-pink-100 to-white" 
    },
    { 
      title: "مركز التلمذة", 
      desc: "مراجعة الكود وتوجيهات معمارية للمتدربين", 
      icon: "🎓",
      color: "from-blue-100 to-white" 
    },
    { 
      title: "الأرباح (AdMob)", 
      desc: "متابعة أداء الإعلانات وCPM الحالي", 
      icon: "💰",
      color: "from-purple-100 to-white" 
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <div 
            key={index}
            className={`p-6 rounded-3xl bg-gradient-to-br ${card.color} border border-white shadow-sm hover:shadow-md transition-all cursor-pointer`}
          >
            <div className="text-3xl mb-4">{card.icon}</div>
            <h3 className="font-bold text-gray-800 mb-2">{card.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
            <div className="mt-4 flex justify-end">
              <span className="text-gray-400 text-lg">→</span>
            </div>
          </div>
        ))}
      </div>

      {/* قسم إحصائيات سريع بنمط Glassmorphism */}
      <div className="bg-white bg-opacity-30 backdrop-blur-md border border-white p-6 rounded-3xl">
        <h4 className="text-sm font-bold text-gray-700 mb-4">حالة النظام (Nawah AI-OS)</h4>
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>اتصال قاعدة البيانات: <span className="text-green-500">متصل</span></span>
          <span>محرك AI: <span className="text-blue-500">جاهز</span></span>
          <span>آخر تحديث: الآن</span>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardHome;
