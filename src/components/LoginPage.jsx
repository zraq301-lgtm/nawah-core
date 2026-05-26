import React, { useState } from 'react';
// التعديل الصحيح: استدعاء دالة تسجيل الدخول المخصصة من الـ services
import { loginToSupabase } from '../services/supabaseClient';

const LoginPage = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [status, setStatus] = useState({ loading: false, error: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '' });

    try {
      // استخدام الدالة المخصصة التي تتعامل مع الـ SDK المستورد من الـ config
      const result = await loginToSupabase(formData.email, formData.password);

      if (!result.success) {
        setStatus({ 
          loading: false, 
          error: result.error || "خطأ في البريد الإلكتروني أو كلمة المرور" 
        });
        return;
      }

      // في حال النجاح، نقوم بحفظ البيانات الموحدة
      localStorage.setItem('supabase_uid', result.user.id);
      localStorage.setItem('user_email', formData.email);
      
      // إيقاف حالة التحميل
      setStatus({ loading: false, error: '' });

      // إخطار المكون الرئيسي بالنجاح لتبديل الواجهة فوراً
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setStatus({ 
        loading: false, 
        error: "تعذر الاتصال بسيرفر سوبابيز، تأكد من الإنترنت" 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] font-sans rtl" dir="rtl">
      {/* تأثيرات الخلفية */}
      <div className="absolute w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 top-10 left-10"></div>
      <div className="absolute w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 bottom-10 right-10"></div>

      {/* كارت تسجيل الدخول */}
      <div className="relative z-10 w-full max-w-md p-8 m-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white mb-2">معمول</h1>
          <p className="text-blue-200/70">نظام إدارة المخازن الذكي</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-gray-300 mr-2 block text-right">البريد الإلكتروني</label>
            <input
              type="email"
              required
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-right"
              placeholder="example@domain.com"
              value={formData.email}
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
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {status.error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center animate-pulse">
              {status.error}
            </div>
          )}

          <button
            type="submit"
            disabled={status.loading}
            className="w-full p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 transition-all transform active:scale-95 disabled:opacity-50"
          >
            {status.loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري التحقق...
              </span>
            ) : "دخول للمخزن"}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-400 text-xs">
          مؤمن ومستضاف بواسطة سوبابيز
        </p>
      </div>
    </div>
  );
};

// التصدير الافتراضي لحل مشكلة الـ Build
export default LoginPage;
