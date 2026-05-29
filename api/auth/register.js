import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // تفعيل الـ CORS للأندرويد
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'استخدم POST' });

  const { companyName, adminEmail, adminPassword } = req.body;

  if (!companyName || !adminEmail || !adminPassword) {
    return res.status(400).json({ success: false, error: 'البيانات المرسلة ناقصة' });
  }

  try {
    // 1️⃣ توليد اسم السكيما فوراً
    const schemaName = `tenant_${Date.now()}`;
    console.log(`🚀 بدء التأسيس السريع للمؤسسة: [${companyName}]`);

    // 2️⃣ إنشاء حساب الإدمن وحقن السكيما في الـ Metadata (يأخذ أجزاء من الثانية)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { 
        tenant_schema: schemaName,
        company_name: companyName,
        role: 'tenant_admin'
      }
    });

    if (authError && !authError.message.includes('already been registered')) {
      throw new Error(`فشل الـ Auth: ${authError.message}`);
    }

    // 3️⃣ 🔥 الخطوة السحرية: إطلاق دالة الحفر في الخلفية دُون انتظار (بـدون await!)
    // نترك سوبابيز يحفر الجداول براحته في السيرفر، ونحرر تطبيق الأندرويد فوراً
    console.log(`⏳ تم إطلاق محرك الحفر في الخلفية بنجاح.. لن ننتظر انتهاء الجداول لعدم تعليق الشاشة.`);
    
    supabase.rpc('create_new_client_erp', {
      client_schema_name: schemaName
    }).then(({ error }) => {
      if (error) {
        console.error(`❌ فشل حفر الجداول بالخلفية للسكيما [${schemaName}]:`, error.message);
      } else {
        console.log(`✅ اكتمل حفر جميع الجداول بنجاح في الخلفية للسكيما [${schemaName}]`);
      }
    });

    // 4️⃣ الرد الفوري للتطبيق (يحدث خلال 500 مللي ثانية فقط!)
    return res.status(201).json({
      success: true,
      message: "جاري تأسيس وحفر نظام الـ ERP الخاص بمؤسستك بنجاح! يمكنك الدخول الآن.",
      schema: schemaName,
      company: companyName
    });

  } catch (error) {
    console.error(`❌ خطأ حرج:`, error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
