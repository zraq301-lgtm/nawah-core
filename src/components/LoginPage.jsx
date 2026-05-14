import React, { useState } from 'react';
import { loginToOdoo } from '../services/odooApi';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [status, setStatus] = useState({ loading: false, error: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '' });

    try {
      const result = await loginToOdoo(formData.email, formData.password);

      if (result.success) {
        // 1. حفظ البيانات في localStorage
        // ملاحظة هامة: كود App.jsx يبحث عن 'odoo_uid' وليس 'uid'
        localStorage.setItem('odoo_uid', result.uid); 
        localStorage.setItem('user_email', formData.email);
        localStorage.setItem('user_pass', formData.password);
        
        // 2. تحديث الحالة لإيقاف مؤشر التحميل (حل مشكلة التعليق في الزر)
        setStatus({ loading: false, error: '' });

        // 3. التوجيه الفوري
        // بما أنك تستخدم نظام الشرط في App.jsx، عمل reload بسيط سيجعل التطبيق يقرأ الـ UID الجديد ويفتح فوراً
        window.location.reload(); 

      } else {
        setStatus({ loading: false, error: result.error || "فشل تسجيل الدخول، تأكد من البيانات" });
      }
    } catch (err) {
      setStatus({ loading: false, error: "حدث خطأ في الاتصال بالسيرفر" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] font-sans rtl" dir="rtl">
      {/* الخلفية الزخرفية */}
      <div className="absolute w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 top-10 left-10"></div>
      <div className="absolute w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 bottom-10 right-10"></div>

      {/* بطاقة الدخول */}
      <div className="relative z-10 w-full max-w-md p-8 m-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white mb-2">معمول</h1>
          <p className="text-blue-200/70">نظام إدارة المخازن الذكي</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-gray-300 mr-2 block text-right">بريد أودو الإلكتروني</label>
            <input
              type="email"
              required
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-right"
              placeholder="example@nawahio1.com"
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300 mr-2 block text-right">كلمة المرور</label>
            <input
              type="password"
              required
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-right"
              placeholder="••••••••"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {status.error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
              {status.error}
            </div>
          )}

          <button
            type="submit"
            disabled={status.loading}
            className="w-full p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 transition-all transform active:scale-95 disabled:opacity-50"
          >
            {status.loading ? "جاري التحقق..." : "دخول للمخزن"}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-400 text-xs">
          متصل بـ: nawahio1.odoo.com
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
