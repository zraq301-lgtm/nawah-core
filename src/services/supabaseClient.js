// استدعاء العميل من المسار الجديد والصحيح الذي اقترحته
import { supabase } from '../config/supabase'; 

export const loginToSupabase = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      user: data.user, 
      session: data.session 
    };

  } catch (err) {
    return { success: false, error: "حدث خطأ غير متوقع أثناء الاتصال" };
  }
};
