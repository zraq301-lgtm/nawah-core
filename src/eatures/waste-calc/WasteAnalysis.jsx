import React from 'react';
import GlassCard from '../../components/ui/GlassCard';

const WasteAnalysis = () => {
  return (
    <div className="space-y-6 text-right" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-800">تحليل الهالك والفاقد</h2>
      <GlassCard className="bg-gradient-to-r from-purple-50 to-white">
        <p className="text-sm text-gray-600 mb-4">أدخل بيانات الإنتاج لتحليل نقاط التسريب:</p>
        <div className="space-y-4">
          <input type="number" placeholder="كمية المادة الخام" className="w-full p-3 rounded-xl bg-white/50 border-none outline-none text-sm" />
          <input type="number" placeholder="كمية المنتج النهائي" className="w-full p-3 rounded-xl bg-white/50 border-none outline-none text-sm" />
          <button className="w-full py-3 bg-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-200">
            بدء التحليل الذكي
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default WasteAnalysis;
