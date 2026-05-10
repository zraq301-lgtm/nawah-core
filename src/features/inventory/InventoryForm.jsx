import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../components/ui/GlassCard';

const InventoryForm = () => {
  // 1. البيانات الأساسية
  const [standardData, setStandardData] = useState({
    itemName: '',
    quantity: 0,
    unit: 'kg'
  });

  // 2. الحقول الديناميكية (إدارة المفاتيح والقيم)
  const [customFields, setCustomFields] = useState([]);
  const [customData, setCustomData] = useState({});

  // إضافة حقل جديد مع التحقق من عدم التكرار
  const addField = () => {
    const fieldName = prompt("أدخل اسم الحقل الجديد (مثلاً: المورد، رقم التشغيلة، تاريخ الصلاحية):");
    if (fieldName && !customFields.includes(fieldName)) {
      setCustomFields([...customFields, fieldName]);
    } else if (customFields.includes(fieldName)) {
      alert("هذا الحقل موجود بالفعل!");
    }
  };

  // حذف حقل مخصص
  const removeField = (fieldName) => {
    setCustomFields(customFields.filter(f => f !== fieldName));
    const newData = { ...customData };
    delete newData[fieldName];
    setCustomData(newData);
  };

  const handleSave = async () => {
    if (!standardData.itemName) return alert("يرجى إدخال اسم المادة الأساسية");

    const finalPayload = {
      ...standardData,
      metadata: { ...customData },
      updatedAt: new Date().toISOString(),
      // في نظام الـ Multi-tenant، نأخذ المعرف من الـ Auth لاحقاً
      tenantId: "NAWAH_PRO_USER_1" 
    };

    console.log("🚀 Payload ready for MongoDB:", finalPayload);
    alert("تم تجهيز البيانات! جاهزة للإرسال إلى السحابة.");
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="p-4 text-right" dir="rtl"
    >
      <GlassCard className="max-w-2xl mx-auto border-white/40 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-gray-800">إدارة مدخلات المخزون</h2>
          <span className="text-[10px] bg-pink-100 text-pink-600 px-3 py-1 rounded-full font-bold">نمط NoSQL مرن</span>
        </div>
        
        <div className="space-y-6">
          {/* الحقول الثابتة بتصميم أنيق */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-2 text-gray-400 mr-2">اسم المادة</label>
              <input 
                type="text"
                className="w-full p-4 rounded-2xl bg-white/40 border border-white/20 focus:border-pink-300 outline-none transition-all text-sm shadow-inner"
                onChange={(e) => setStandardData({...standardData, itemName: e.target.value})}
                placeholder="مثال: دقيق استخراج 72%"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-2 text-gray-400 mr-2">الكمية الحالية</label>
              <input 
                type="number"
                className="w-full p-4 rounded-2xl bg-white/40 border border-white/20 outline-none text-sm shadow-inner"
                onChange={(e) => setStandardData({...standardData, quantity: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-2 text-gray-400 mr-2">الوحدة</label>
              <select 
                className="w-full p-4 rounded-2xl bg-white/40 border border-white/20 outline-none text-sm"
                onChange={(e) => setStandardData({...standardData, unit: e.target.value})}
              >
                <option value="kg">كيلوجرام (KG)</option>
                <option value="ton">طن (Ton)</option>
                <option value="unit">وحدة (Unit)</option>
              </select>
            </div>
          </div>

          {/* الحقول الديناميكية مع أنيميشن عند الإضافة */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <AnimatePresence>
              {customFields.map((field) => (
                <motion.div 
                  initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
                  key={field} className="relative group"
                >
                  <label className="block text-xs font-bold mb-2 text-blue-500 mr-2 flex justify-between">
                    {field}
                    <button onClick={() => removeField(field)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">حذف الحقل ×</button>
                  </label>
                  <input 
                    className="w-full p-4 rounded-2xl bg-blue-50/20 border border-blue-100/30 focus:bg-white/50 outline-none text-sm transition-all shadow-sm"
                    onChange={(e) => setCustomData({...customData, [field]: e.target.value})}
                    placeholder={`أدخل قيمة لـ ${field}...`}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* أزرار العمليات */}
          <div className="flex flex-col md:flex-row gap-3 pt-6">
            <button 
              onClick={handleSave}
              className="flex-[2] py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl font-bold shadow-lg shadow-pink-200 hover:brightness-110 active:scale-95 transition-all"
            >
              🚀 حفظ وحفظ التغييرات للسحابة
            </button>
            
            <button 
              onClick={addField}
              className="flex-1 py-4 bg-white/60 text-gray-700 border border-white rounded-2xl font-bold hover:bg-white transition-all shadow-sm"
            >
              ➕ إضافة حقل ذكي
            </button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default InventoryForm;
