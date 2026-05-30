import React, { useState } from 'react';
import { CapacitorHttp } from '@capacitor/core'; 
// 🔥 استيراد مكتبة Preferences لضمان تخزين معرف الشركة في الـ Native SharedPreferences للأندرويد
import { Preferences } from '@capacitor/preferences';

const LoginPage = ({ onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false); 
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '',
    companyName: '' 
  });
  const [status, setStatus] = useState({ loading: false, error: '', successMessage: '' });

  // 🔹 دالة مطورة وتأمين حديدي للبريد الإلكتروني لتنظيف ومنع تكرار الرموز الناتجة عن الكيبورد
  const formatAndValidateEmail = (inputEmail) => {
    // 1. إزالة الفراغات وتحويل الحروف لصغيرة
    let clean = inputEmail.trim().toLowerCase();
    
    if (!clean) return { valid: false, email: '' };

    // 2. استخراج الجزء الخاص باسم المستخدم فقط (قبل أول علامة @) لمنع التكرار
    let username = clean.split('@')[0];
    
    // إزالة أي نقاط أو رموز زائدة ملتصقة بالنهاية بالخطأ
    if (username.endsWith('.')) {
      username = username.slice(0, -1);
    }

    // 3. إعادة بناء البريد الإلكتروني الصافي والمعتمد تبعا لنواة AI
    const finalEmail = `${username}@nawh.ai`;

    // 4. اختبار أمان أخير للتأكد من هيكلة الإيميل الصحيحة
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(finalEmail)) {
      return { valid: false, email: finalEmail };
    }

    return { valid: true, email: finalEmail };
  };

  // 🔹 معالجة تسجيل الدخول أو إنشاء حساب جديد
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '', successMessage: '' });

    const emailCheck = formatAndValidateEmail(formData.email);
    if (!emailCheck.valid) {
      setStatus({
        loading: false,
        error: "صيغة اسم المستخدم غير مطابقة للنظام المعياري لـ @nawh.ai",
        successMessage: ''
      });
      return;
    }

    const targetEmail = emailCheck.email.trim();
    const targetPassword = formData.password;

    try {
      if (isRegisterMode) {
        // 🚀 أولاً: وضع التسجيل باستخدام CapacitorHttp وتوجيهه عبر الباك إند
        const options = {
          url: 'https://project-902ma.vercel.app/api/auth/register', 
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({
            companyName: formData.companyName.trim(),
            adminEmail: targetEmail,
            adminPassword: targetPassword
          })
        };

        const response = await CapacitorHttp.post(options);
        
        // معالجة البيانات المستلمة سواء كانت نصية أو كائن جاهز
        const resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

        if (resData && resData.success) {
          const schemaName = resData.schema;

          // 🔥 حفظ مزدوج ومستقر لاسم السكيما المستهدفة ديناميكياً
          await Preferences.set({ key: 'tenant_schema', value: JSON.stringify(schemaName) });
          localStorage.setItem('tenant_schema', schemaName);
          localStorage.setItem('user_email', targetEmail);
          
          setStatus({
            loading: false,
            error: '',
            successMessage: 'تم تأسيس حساب المؤسسة وتجهيز بيئة العمل بنجاح! جاري التوجيه...'
          });

          // تفعيل الدخول فوراً وبأعلى درجات الاستقرار
          if (onLoginSuccess) onLoginSuccess();
        } else {
          setStatus({
            loading: false,
            error: resData?.error || "تعذر إنشاء الحساب، يرجى التحقق من البيانات المدخلة وتكرار المحاولة",
            successMessage: ''
          });
        }
      } else {
        // 🔑 ثانياً: وضع تسجيل الدخول المطور والآمن لمنع مشاكل القراءة في الـ Payload
        const options = {
          url: 'https://project-902ma.vercel.app/api/auth/login', 
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({
            email: targetEmail,
            password: targetPassword
          })
        };

        const response = await CapacitorHttp.post(options);
        
        // تحصين فحص صياغة البيانات العائدة من السيرفر لمنع أي خلط للمتغيرات داخل الأندرويد
        const resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

        if (resData && resData.success) {
          const cloudSchema = resData.schema;

          if (!cloudSchema) {
            setStatus({
              loading: false,
              error: "الحساب لا يحتوي على صلاحيات الوصول لبيئة العمل الحالية",
              successMessage: ''
            });
            return;
          }

          // 🔥 حفظ المعرف محلياً داخل نظام الأندرويد لربطه بالـ mutate لاحقاً
          await Preferences.set({ key: 'tenant_schema', value: JSON.stringify(cloudSchema) });
          
          // حفظ بقية عناصر الجلسة العامة بالـ LocalStorage للأندرويد
          localStorage.setItem('user_email', targetEmail);
          localStorage.setItem('tenant_schema', cloudSchema); 
          
          setStatus({ loading: false, error: '', successMessage: '' });

          if (onLoginSuccess) {
            onLoginSuccess();
          }
        } else {
          setStatus({ 
            loading: false, 
            error: resData?.error || "خطأ في البريد الإلكتروني أو كلمة المرور، يرجى إعادة المحاولة",
            successMessage: ''
          });
        }
      }
    } catch (err) {
      setStatus({ 
        loading: false, 
        error: "فشل الاتصال بالنظام السحابي، يرجى التحقق من اتصال الشبكة",
        successMessage: ''
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090d16] font-sans rtl selection:bg-violet-500/30" dir="rtl">
      {/* تأثيرات غازية لأسلوب الواجهة المتطور */}
      <div className="absolute w-80 h-80 bg-violet-600 rounded-full blur-[140px] opacity-20 top-5 left-5 pointer-events-none"></div>
      <div className="absolute w-80 h-80 bg-fuchsia-600 rounded-full blur-[140px] opacity-20 bottom-5 right-5 pointer-events-none"></div>

      {/* كارت تسجيل الدخول والتسجيل الزجاجي الفخم لـ نواة AI */}
      <div className="relative z-10 w-full max-w-md p-8 m-4 bg-white/[0.03] backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-300">
        
        <div className="text-center mb-9">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-100 to-violet-300 mb-3 tracking-tight">
            نواة AI
          </h1>
          <p className="text-violet-200/60 text-sm font-medium leading-relaxed">
            {isRegisterMode ? "إنشاء حساب سحابي وتجهيز مساحة العمل الخاصة بك" : "نظام الإدارة وعزل الموارد الذكي المتكامل"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegisterMode && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-violet-200/70 mr-1 block text-right tracking-wide">اسم الشركة / المؤسسة</label>
              <input
                type="text"
                required
                className="w-full p-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition-all text-right font-medium text-sm placeholder:text-gray-600 shadow-inner"
                placeholder="شركة النور للتجارة"
                value={formData.companyName || ''}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-violet-200/70 mr-1 block text-right tracking-wide">البريد الإلكتروني المعتمد</label>
            <input
              type="text"
              required
              className="w-full p-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition-all text-left font-medium text-sm placeholder:text-gray-600 shadow-inner"
              placeholder="username@nawh.ai"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-violet-200/70 mr-1 block text-right tracking-wide">كلمة المرور</label>
            <input
              type="password"
              required
              className="w-full p-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition-all text-right font-medium text-sm placeholder:text-gray-600 shadow-inner"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {status.error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 text-xs font-medium text-center leading-relaxed">
              {status.error}
            </div>
          )}

          {status.successMessage && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 text-xs font-medium text-center leading-relaxed">
              {status.successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={status.loading}
            className="w-full p-4 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 bg-[length:200%_auto] hover:bg-right text-white font-bold rounded-2xl shadow-xl shadow-violet-950/20 transition-all duration-500 transform active:scale-[0.98] disabled:opacity-40 text-sm tracking-wide"
          >
            {status.loading ? (
              <span className="flex items-center justify-center gap-2.5">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isRegisterMode ? "جاري تهيئة مساحة العمل..." : "جاري التحقق من الهوية الرقمية..."}
              </span>
            ) : isRegisterMode ? "إنشاء وتفعيل حساب المؤسسة 🚀" : "دخول آمن للنظام المطور"}
          </button>
        </form>

        <div className="mt-7 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setStatus({ loading: false, error: '', successMessage: '' });
            }}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-4 bg-transparent border-none cursor-pointer font-semibold tracking-wide"
          >
            {isRegisterMode ? "لديك حساب مؤسسة بالفعل؟ سجل دخولك" : "إنشاء حساب شركة ومساحة عمل جديدة"}
          </button>
        </div>

        <p className="mt-8 text-center text-gray-600 text-[10px] tracking-widest font-medium uppercase">
          جميع الحقوق محفوظة © نواة AI
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
