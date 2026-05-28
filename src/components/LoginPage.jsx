import React, { useState } from 'react';
import axios from 'axios';
// استدعاء دالة تسجيل الدخول المخصصة من الـ services
import { loginToSupabase } from '../services/supabaseClient';

const LoginPage = ({ onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false); // التبديل بين الدخول والتسجيل
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '',
    companyName: '' // مضاف لإنشاء شركة جديدة
  });
  const [status, setStatus] = useState({ loading: false, error: '', successMessage: '' });

  // 🔹 معالجة تسجيل الدخول أو إنشاء حساب جديد
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '', successMessage: '' });

    try {
      if (isRegisterMode) {
        // 🚀 أولاً: وضع التسجيل (إنشاء شركة وحفر الجداول تلقائياً في سوبابيز من الخارج)
        const response = await axios.post('/api/auth/register', {
          companyName: formData.companyName,
          adminEmail: formData.email,
          adminPassword: formData.password
        });

        if (response.data.success) {
          // حفظ اسم السكيما المستهدفة ديناميكياً لاستعمالها في الفواتير لاحقاً
          localStorage.setItem('tenant_schema', response.data.schema);
          
          setStatus({
            loading: false,
            error: '',
            successMessage: 'تم تأسيس الشركة وحفر الـ ERP بنجاح! جاري تسجيل دخولك...'
          });

          // تسجيل الدخول التلقائي بعد نجاح إنشاء الحفر الفولاذي
          const loginResult = await loginToSupabase(formData.email, formData.password);
          if (loginResult.success) {
            localStorage.setItem('supabase_uid', loginResult.user.id);
            localStorage.setItem('user_email', formData.email);
            if (onLoginSuccess) onLoginSuccess();
          }
        }
      } else {
        // 🔑 ثانياً: وضع تسجيل الدخول التقليدي المستقر
        const result = await loginToSupabase(formData.email, formData.password);

        if (!result.success) {
          setStatus({ 
            loading: false, 
            error: result.error || "خطأ في البريد الإلكتروني أو كلمة المرور",
            successMessage: ''
          });
          return;
        }

        // في حال النجاح، نقوم بحفظ البيانات الموحدة
        localStorage.setItem('supabase_uid', result.user.id);
        localStorage.setItem('user_email', formData.email);
        
        setStatus({ loading: false, error: '', successMessage: '' });

        // إخطار المكون الرئيسي بالنجاح لتبديل الواجهة فوراً
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (err) {
      setStatus({ 
        loading: false, 
        error: err.response?.data?.error || "تعذر الاتصال بالسيرفر، تأكد من إعدادات الشبكة",
        successMessage: ''
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] font-sans rtl" dir="rtl">
      {/* تأثيرات الخلفية */}
      <div className="absolute w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 top-10 left-10"></div>
      <div className="absolute w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 bottom-10 right-10"></div>

      {/* كارت تسجيل الدخول والتسجيل الفولاذي */}
      <div className="relative z-10 w-full max-w-md p-8 m-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl transition-all duration-300">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">معمول</h1>
          <p className="text-blue-200/70">
            {isRegisterMode ? "تأسيس شركة جديدة ونظام ERP معزول" : "نظام إدارة المخازن والموارد الذكي"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* حقل اسم الشركة يظهر فقط في وضع التسجيل لتأمين البيانات */}
          {isRegisterMode && (
            <div className="space-y-2">
              <label className="text-sm text-gray-300 mr-2 block text-right">اسم الشركة / المؤسسة</label>
              <input
                type="text"
                required
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-right"
                placeholder="شركة النور للتجارة"
                value={formData.companyName || ''}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm text-gray-300 mr-2 block text-right">البريد الإلكتروني للإدمن</label>
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

          {/* رسالة الخطأ */}
          {status.error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center animate-pulse">
              {status.error}
            </div>
          )}

          {/* رسالة النجاح والأتمتة */}
          {status.successMessage && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-200 text-sm text-center">
              {status.successMessage}
            </div>
          )}

          {/* زر الإرسال الديناميكي */}
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
                {isRegisterMode ? "جاري حفر نظام الـ ERP..." : "جاري التحقق..."}
              </span>
            ) : isRegisterMode ? "تأسيس النظام وحفر الجداول 🚀" : "دخول للمخزن"}
          </button>
        </form>

        {/* زر التبديل التكتيكي بين التسجيل والدخول */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setStatus({ loading: false, error: '', successMessage: '' });
            }}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors underline bg-transparent border-none cursor-pointer"
          >
            {isRegisterMode ? "لديك حساب شركة بالفعل؟ سجل دخولك" : "إنشاء حساب شركة ونظام ERP جديد"}
          </button>
        </div>

        <p className="mt-6 text-center text-gray-400 text-xs">
          مؤمن ومستضاف بواسطة سوبابيز وعزل فولاذي متعدد السكيمات
        </p>
      </div>
    </div>
  );
};

// التصدير الافتراضي لحل مشكلة الـ Build
export default LoginPage;
