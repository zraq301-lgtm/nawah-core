import { supabase } from './supabaseClient'; // استدعاء العميل الذي أنشأناه فوق

export const loginToSupabase = async (email, password) => {
  try {
    // سوبابيز توفر دالة مدمجة مخصصة لتسجيل الدخول بالإيميل والباسورد
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    // إذا أرجعت المنصة خطأ أثناء تسجيل الدخول
    if (error) {
      return { success: false, error: error.message };
    }

    // في حال النجاح، سوبابيز ترجع كائن يحتوي على بيانات المستخدم (User) والـ Session والـ Token تلقائياً
    return { 
      success: true, 
      user: data.user, 
      session: data.session 
    };

  } catch (err) {
    return { success: false, error: "حدث خطأ غير متوقع أثناء الاتصال" };
  }
};
