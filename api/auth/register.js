import { createClient } from '@supabase/supabase-js';

// تهيئة كليانت سوبابيز بصلاحيات السيرفر الكاملة
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("خطأ حرج: متغيرات بيئة العمل لـ Supabase غير معرفة في Vercel!");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // 1️⃣ تفعيل جدار الحماية والأمان وتخطي قيود CORS للأندرويد حتماً
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // التعامل مع طلبات التحقق المسبق من الشبكة
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // حارس استقبال طلبات POST فقط
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'طريقة الطلب غير مسموحة، استخدم POST فقط' });
  }

  const { companyName, adminEmail, adminPassword } = req.body;

  // التحقق من المدخلات الأساسية لمنع الأخطاء العشوائية
  if (!companyName || !adminEmail || !adminPassword) {
    return res.status(400).json({ success: false, error: 'يرجى تزويد النظام بجميع البيانات: اسم الشركة، الإيميل، الرقم السري' });
  }

  try {
    // 2️⃣ توليد اسم السكيما الفريدة للعميل بناءً على طابع زمني دقيق
    const schemaName = `tenant_${Date.now()}`;
    console.log(`🚀 جاري بدء تأسيس البنية التحتية للمؤسسة الجديدة: [${companyName}] بالسكيما: [${schemaName}]`);

    // 3️⃣ إنشاء حساب الإدمن في الـ Auth مع حقن اسم السكيما داخل الـ Metadata 
    // هذه الخطوة تضمن أنه بمجرد تسجيل الدخول العادي من الأندرويد، سيرجع اسم السكيما تلقائياً للهاتف!
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

    // معالجة حالة الحساب المسجل مسبقاً لمنع انهيار عملية بناء جداول الشركة
    let userId = authUser?.user?.id;
    
    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.warn(`⚠️ الحساب [${adminEmail}] مسجل مسبقاً، سيتم جلب المعرف ومتابعة حفر الجداول...`);
        // جلب معرف المستخدم الحالي إذا كان مسجلاً مسبقاً
        const { data: usersList } = await supabase.auth.admin.listUsers();
        const existingUser = usersList?.users?.find(u => u.email === adminEmail);
        userId = existingUser?.id;
      } else {
        throw new Error(`فشل إنشاء حساب الـ Auth أمنياً: ${authError.message}`);
      }
    }

    // 4️⃣ استدعاء دالة الـ RPC لحفر السكيما وتسكين بيانات المؤسسة المركزية
    // قمنا بتوسيع البارامترات لتأخذ المعطيات كاملة لربط الكيانات برمجياً
    const { error: rpcError } = await supabase.rpc('create_new_client_erp', {
      client_schema_name: schemaName,
      p_company_name: companyName,
      p_admin_email: adminEmail,
      p_user_id: userId || null
    });

    if (rpcError) {
      throw new Error(`فشل محرك SQL التابع لسوبابيز أثناء حفر الجداول: ${rpcError.message}`);
    }

    console.log(`✅ تم حفر وتأمين نظام الـ ERP بنجاح كامل للمؤسسة: [${schemaName}]`);

    // 5️⃣ الرد النهائي الاحترافي المتوافق مع الأندرويد لمنع تعليق الشاشة
    return res.status(201).json({
      success: true,
      message: "تم تأسيس مؤسستك وحفر جداول نظام الـ ERP بنجاح فولاذي!",
      schema: schemaName,
      company: companyName,
      admin_id: userId
    });

  } catch (error) {
    console.error(`❌ خطأ حرج أثناء التأسيس المعزول:`, error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'حدث خطأ غير متوقع بالسيرفر أثناء التأسيس' 
    });
  }
}
