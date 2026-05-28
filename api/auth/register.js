import { createClient } from '@supabase/supabase-js';

// تهيئة كليانت سوبابيز الفولاذي بمفتاح الـ Service Role لامتلاك الصلاحيات المطلقة
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // السماح بطلبات POST فقط
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { companyName, adminEmail, adminPassword } = req.body;

  try {
    // توليد اسم سكيما فريد يعتمد على الوقت الحالي
    const schemaName = `tenant_${Date.now()}`;
    let supabaseUid = null;

    // 1️⃣ إنشاء حساب المستخدم داخل سوبابيز وتفعيله تلقائياً
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true
    });

    if (authError) {
      // إذا كان الإيميل مسجلاً مسبقاً، نجلب الـ ID الخاص به ونكمل الدورة بدلاً من التوقف
      if (authError.message.includes('already been registered')) {
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users?.find(u => u.email === adminEmail);
        if (existingUser) {
          supabaseUid = existingUser.id;
        } else {
          throw new Error("المستخدم مسجل مسبقاً ولم نتمكن من العثور عليه");
        }
      } else {
        throw new Error(`فشل إنشاء الحساب في سوبابيز: ${authError.message}`);
      }
    } else {
      supabaseUid = authUser.user.id;
    }

    // 2️⃣ إدخال بيانات الشركة داخل جدول الـ company العام في الـ public schema عبر سوبابيز مباشرة (بدون بريزما)
    // أولاً نتحقق إن لم تكن الشركة مسجلة مسبقاً بنفس الاسم
    let { data: existingComp } = await supabase
      .from('company')
      .select('id')
      .eq('name', companyName)
      .single();

    let companyId = existingComp?.id;

    if (!companyId) {
      const { data: newComp, error: compError } = await supabase
        .from('company')
        .insert([{ name: companyName }])
        .select()
        .single();

      if (compError) throw new Error(`فشل تسجيل الشركة: ${compError.message}`);
      companyId = newComp.id;
    }

    // 3️⃣ ربط المستخدم بالشركة داخل جدول الـ user العام في الـ public schema (بدون بريزما)
    const { data: userExists } = await supabase
      .from('user')
      .select('id')
      .eq('id', supabaseUid)
      .single();

    if (!userExists) {
      const { error: userError } = await supabase
        .from('user')
        .insert([{
          id: supabaseUid,
          email: adminEmail,
          password: adminPassword, // كمرجع للبيانات الموحدة
          companyId: companyId
        }]);

      if (userError) throw new Error(`فشل ربط المستخدم بالشركة: ${userError.message}`);
    }

    // 4️⃣ تشغيل الفانكشن السحرية المحفورة داخل سوبابيز مباشرة لإنشاء جداول الـ ERP 🚀
    const { error: rpcError } = await supabase.rpc('create_new_client_erp', {
      client_schema_name: schemaName
    });

    if (rpcError) {
      throw new Error(`فشل حفر جداول السكيما عبر الـ Function: ${rpcError.message}`);
    }

    // 5️⃣ الرد النهائي بالنجاح التام وتمرير اسم السكيما المحفورة للفرونت إند
    return res.status(201).json({
      success: true,
      message: "تم تأسيس النظام، وتشغيل الـ Function، وحفر الجداول بنجاح معزول!",
      schema: schemaName
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
