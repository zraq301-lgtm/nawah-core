// pages/api/auth/register.js
import postgres from 'postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { companyName, adminEmail, adminPassword } = req.body;
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

  try {
    const schemaName = `tenant_${Date.now()}`.trim().toLowerCase();

    // 1. إنشاء جدول الحسابات المركزي وتسجيل المستخدم (يأخذ أجزاء من الثانية)
    await sql`
      CREATE TABLE IF NOT EXISTS public.users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        tenant_schema VARCHAR(100),
        role VARCHAR(50)
      );
    `;

    await sql`
      INSERT INTO public.users (email, password, company_name, tenant_schema, role)
      VALUES (${adminEmail.trim()}, ${adminPassword}, ${companyName.trim()}, ${schemaName}, 'tenant_admin');
    `;

    // 2. 🔥 استدعاء الدالة السحرية داخل نيون لتقوم بالحفر بالكامل في الخلفية!
    console.log(`⏳ تم إطلاق دالة الحفر المخزنة داخل نيون للـ Schema: ${schemaName}`);
    
    sql`SELECT public.create_new_client_erp(${schemaName})`
      .then(() => console.log(`✅ نيون: اكتمل حفر السكيما والجداول والـ Triggers بنجاح.`))
      .catch((err) => console.error(`❌ خطأ حفر نيون:`, err.message));

    // 3. الرد الفوري المباشر لتطبيق الأندرويد لفتح الشاشة
    return res.status(201).json({
      success: true,
      message: "جاري تأسيس نظام الـ ERP الخاص بمؤسستك بنجاح!",
      schema: schemaName,
      company: companyName
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
