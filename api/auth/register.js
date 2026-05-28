import { createClient } from '@supabase/supabase-js';

// تهيئة كليانت سوبابيز بمفتاح الـ Service Role لامتلاك صلاحيات تشغيل الـ RPC
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // حارس استقبال طلبات POST فقط
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { companyName, adminEmail, adminPassword } = req.body;

  try {
    // 1️⃣ توليد اسم السكيما الفريدة للعميل بناءً على الوقت الحالي
    const schemaName = `tenant_${Date.now()}`;

    // 2️⃣ إنشاء حساب الإدمن في الـ Auth الخاص بسوبابيز وتفعيله أوتوماتيكياً
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true
    });

    // لو الحساب موجود مسبقاً، بنتخطى الخطوة دي عشان السستم ميعلقش ويكمل حفر
    if (authError && !authError.message.includes('already been registered')) {
      throw new Error(`فشل إنشاء حساب الـ Auth: ${authError.message}`);
    }

    // 3️⃣ استدعاء وتشغيل الـ Function بتاعتك مباشرة داخل سوبابيز 🚀
    // بنمرر لها اسم السكيما الجديد، ويمكنك تمرير بارامترات أخرى لو دالتك تحتاجها (مثل اسم الشركة أو إيميل الإدمن)
    const { error: rpcError } = await supabase.rpc('create_new_client_erp', {
      client_schema_name: schemaName
      // لو الفانكشن بتاعتك بتاخد بارامترات تانية لاسم الشركة أو الإيميل، ضيفهم هنا كالتالي:
      // company_name: companyName,
      // admin_email: adminEmail
    });

    if (rpcError) {
      throw new Error(`فشل تشغيل الـ Function داخل سوبابيز: ${rpcError.message}`);
    }

    // 4️⃣ الرد بالنجاح وتمرير اسم السكيما المحفورة بنجاح لتطبيق الموبايل
    return res.status(201).json({
      success: true,
      message: "تم تشغيل أداة سوبابيز وحفر جداول نظام الـ ERP بنجاح كامل!",
      schema: schemaName
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
