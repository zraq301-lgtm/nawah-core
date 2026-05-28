import React, { useState } from 'react';
import { CapacitorHttp } from '@capacitor/core'; 
// 🔥 استيراد مكتبة Preferences لضمان تخزين رقم الشركة في الـ Native SharedPreferences للأندرويد
import { Preferences } from '@capacitor/preferences';
import { loginToSupabase } from '../services/supabaseClient';

const LoginPage = ({ onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false); 
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '',
    companyName: '' 
  });
  const [status, setStatus] = useState({ loading: false, error: '', successMessage: '' });

  // 🔹 دالة معالجة وتأمين البريد الإلكتروني لإلزام الامتداد الرسمي @nawh.ai
  const formatAndValidateEmail = (inputEmail) => {
    let cleanEmail = inputEmail.trim().toLowerCase();
    if (!cleanEmail.endsWith('@nawh.ai')) {
      if (!cleanEmail.includes('@')) {
        cleanEmail = `${cleanEmail}@nawh.ai`;
      } else {
        return { valid: false, email: cleanEmail };
      }
    }
    return { valid: true, email: cleanEmail };
  };

  // 🔹 معالجة تسجيل الدخول أو إنشاء حساب جديد
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '', successMessage: '' });

    const emailCheck = formatAndValidateEmail(formData.email);
    if (!emailCheck.valid) {
      setStatus({
        loading: false,
        error: "يجب استخدام البريد الإلكتروني الرسمي المنتهي بـ @nawh.ai فقط",
        successMessage: ''
      });
      return;
    }

    const targetEmail = emailCheck.email;

    try {
      if (isRegisterMode) {
        // 🚀 أولاً: وضع التسجيل باستخدام CapacitorHttp لتخطي الـ CORS على الأندرويد
        const options = {
          url: 'https://project-902ma.vercel.app/api/auth/register', 
          headers: { 'Content-Type': 'application/json' },
          data: {
            companyName: formData.companyName.trim(),
            adminEmail: targetEmail,
            adminPassword: formData.password
          }
        };

        const response = await CapacitorHttp.post(options);

        if (response.data && response.data.success) {
          // 🔥 حفظ مزدوج (مستقر وأصلي) لاسم السكيما المستهدفة ديناميكياً
          await Preferences.set({ key: 'tenant_schema', value: JSON.stringify(response.data.schema) });
          localStorage.setItem('tenant_schema', response.data.schema);
          
          setStatus({
            loading: false,
            error: '',
            successMessage: 'تم تأسيس الشركة وحفر الـ ERP بنجاح! جاري تسجيل دخولك الآمن...'
          });

          // تسجيل الدخول التلقائي بعد نجاح إنشاء الحفر الفولاذي
          const loginResult = await loginToSupabase(targetEmail, formData.password);
          if (loginResult.success) {
            const userMetadata = loginResult.user?.user_metadata || {};
            const schemaName = userMetadata.tenant_schema || response.data.schema;

            // 🔥 حفظ حديدي متوافق بنسبة 100% مع محرك App.jsx
            await Preferences.set({ key: 'tenant_schema', value: JSON.stringify(schemaName) });
            localStorage.setItem('supabase_uid', loginResult.user.id);
            localStorage.setItem('user_email', targetEmail);
            localStorage.setItem('tenant_schema', schemaName); 

            if (onLoginSuccess) onLoginSuccess();
          }
        } else {
          setStatus({
            loading: false,
            error: response.data?.error || "فشل تأسيس النظام، يرجى مراجعة البيانات",
            successMessage: ''
          });
        }
      } else {
        // 🔑 ثانياً: وضع تسجيل الدخول التقليدي (مستقر وعابر للأجهزة والمنصات)
        const result = await loginToSupabase(targetEmail, formData.password);

        if (!result.success) {
          setStatus({ 
            loading: false, 
            error: result.error || "خطأ في البريد الإلكتروني أو كلمة المرور",
            successMessage: ''
          });
          return;
        }

        // 🔥 الاسترجاع الديناميكي للسكيما لحل مشكلة تعدد الأجهزة
        const cloudSchema = result.user?.user_metadata?.tenant_schema;

        if (!cloudSchema) {
          setStatus({
            loading: false,
            error: "لم يتم العثور على قاعدة بيانات معزولة مرتبطة بهذا الحساب المعتمد",
            successMessage: ''
          });
          return;
        }

        // 🔥 حفظ السكيما محلياً داخل نظام الأندرويد بأعلى درجات الاستقرار
        await Preferences.set({ key: 'tenant_schema', value: JSON.stringify(cloudSchema) });
        
        // حفظ بقية عناصر الجلسة العامة بالـ LocalStorage للأندرويد
        localStorage.setItem('supabase_uid', result.user.id);
        localStorage.setItem('user_email', targetEmail);
        localStorage.setItem('tenant_schema', cloudSchema); 
        
        setStatus({ loading: false, error: '', successMessage: '' });

        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (err) {
      setStatus({ 
        loading: false, 
        error: "تعذر الاتصال بالسيرفر، تأكد من إعدادات الشبكة ومفتاح الأمان لنواة AI",
        successMessage: ''
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] font-sans rtl" dir="rtl">
      {/* تأثيرات غازية لأسلوب الواجهة المتطور */}
      <div className="absolute w-72 h-72 bg-violet-600 rounded-full blur-[120px] opacity-25 top-10 left-10"></div>
      <div className="absolute w-72 h-72 bg-fuchsia-600 rounded-full blur-[120px] opacity-25 bottom-10 right-10"></div>

      {/* كارت تسجيل الدخول والتسجيل الزجاجي الفخم لـ نواة AI */}
      <div className="relative z-10 w-full max-w-md p-8 m-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl transition-all duration-300">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">نواة AI</h1>
          <p className="text-violet-200/70 text-sm font-medium">
            {isRegisterMode ? "تأسيس مؤسسة جديدة ونظام ERP معزول" : "نظام إدارة وعزل الموارد الذكي"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegisterMode && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 mr-1 block text-right">اسم الشركة / المؤسسة</label>
              <input
                type="text"
                required
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-right"
                placeholder="شركة النور للتجارة"
                value={formData.companyName || ''}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 mr-1 block text-right">البريد الإلكتروني المعتمد</label>
            <input
              type="text"
              required
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-left"
              placeholder="username@nawh.ai"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 mr-1 block text-right">كلمة المرور المشفرة</label>
            <input
              type="password"
              required
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-right"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {status.error && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-sm text-center">
              {status.error}
            </div>
          )}

          {status.successMessage && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-200 text-sm text-center">
              {status.successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={status.loading}
            className="w-full p-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl shadow-xl shadow-violet-900/30 transition-all transform active:scale-95 disabled:opacity-50"
          >
            {status.loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isRegisterMode ? "جاري حفر السكيما وعزل البنية..." : "جاري فك التشفير والتحقق..."}
              </span>
            ) : isRegisterMode ? "تأسيس النظام وحفر الجداول الفولاذية 🚀" : "دخول آمن للنظام"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setStatus({ loading: false, error: '', successMessage: '' });
            }}
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors underline bg-transparent border-none cursor-pointer font-medium"
          >
            {isRegisterMode ? "لديك حساب مؤسسة بالفعل؟ سجل دخولك" : "إنشاء حساب شركة ونظام ERP جديد"}
          </button>
        </div>

        <p className="mt-6 text-center text-gray-500 text-xs tracking-wide">
          بنية تابعة لـ نواة AI ومستضافة عبر عزل سكيمات سوبابيز الفولاذي
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
