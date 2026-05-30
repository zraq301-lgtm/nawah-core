// pages/api/erp/register.js
import postgres from 'postgres';

export default async function handler(req, res) {
  // تفعيل الـ CORS للأندرويد (Capacitor)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'استخدم POST' });

  const { companyName, adminEmail, adminPassword } = req.body;

  if (!companyName || !adminEmail || !adminPassword) {
    return res.status(400).json({ success: false, error: 'البيانات المرسلة ناقصة' });
  }

  // 🔌 الاتصال المباشر بمشروع نيون الأب عبر المتغير الموحد الخاص بك
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

  try {
    // 1️⃣ توليد اسم السكيما فوراً (حروف صغيرة قسراً لبيئة الأندرويد المعزولة)
    const schemaName = `tenant_${Date.now()}`.trim().toLowerCase();
    console.log(`🚀 بدء التأسيس السريع للمؤسسة في نيون: [${companyName}]`);

    // 2️⃣ تأمين جدول المستخدمين المركزي (public.users) وإنشاء حساب الإدمن فوراً
    // هذا الجدول بمثابة نظام الـ Auth الخاص بك داخل نيون ليعرف كل إيميل أي سكيما يتبع
    await sql`
      CREATE TABLE IF NOT EXISTS public.users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        tenant_schema VARCHAR(100),
        role VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // تسجيل حساب الإدمن الجديد في الجدول المركزي (يأخذ أجزاء من الثانية)
    await sql`
      INSERT INTO public.users (email, password, company_name, tenant_schema, role)
      VALUES (${adminEmail.trim()}, ${adminPassword}, ${companyName.trim()}, ${schemaName}, 'tenant_admin')
      ON CONFLICT (email) DO NOTHING;
    `;

    // 3️⃣ 🔥 الخطوة السحرية (بدون await!): إطلاق دالة الحفر التلقائي في الخلفية لحساب نيون
    // نترك السيرفر يبني السكيما والـ 6 جداول والـ Seeds براحته، ونحرر هاتف الأندرويد في 500 مللي ثانية
    console.log(`⏳ تم إطلاق محرك الحفر في خلفية نيون.. لن ننتظر انتهاء الجداول لعدم تعليق الشاشة.`);

    // دالة الخلفية (Promise)
    buildTenantSchemaInBackground(sql, schemaName)
      .then(() => {
        console.log(`✅ نيون: اكتمل حفر جميع الجداول وزرع العلاقات بنجاح في الخلفية للسكيما [${schemaName}]`);
      })
      .catch((err) => {
        console.error(`❌ نيون: فشل حفر الجداول بالخلفية للسكيما [${schemaName}]:`, err.message);
      });

    // 4️⃣ الرد الفوري المباشر للتطبيق
    return res.status(201).json({
      success: true,
      message: "جاري تأسيس وحفر نظام الـ ERP الخاص بمؤسستك في نيون بنجاح! يمكنك الدخول الآن.",
      schema: schemaName,
      company: companyName
    });

  } catch (error) {
    console.error(`❌ خطأ حرج في السيرفر:`, error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// 🏗️ المحرك الخلفي المنفصل لبناء السكيما بالـ SQL الصافي والمباشر داخل نيون
async function buildTenantSchemaInBackground(sql, schemaName) {
  // استخدام الترانزأكشن لضمان سلامة البناء داخل المشروع
  await sql.begin(async (tx) => {
    // أ. إنشاء السكيما المعزولة
    await tx`CREATE SCHEMA IF NOT EXISTS ${tx(schemaName)}`;

    // ب. بناء الجداول الخمسة وعلاقات المشتريات والحسابات والمخزن والنقدية بالترتيب
    await tx`CREATE TABLE ${tx(schemaName)}.contacts (id SERIAL PRIMARY KEY, name VARCHAR(255), type VARCHAR(50))`;
    await tx`CREATE TABLE ${tx(schemaName)}.accounts (id SERIAL PRIMARY KEY, account_name VARCHAR(255), account_type VARCHAR(50))`;
    
    await tx`CREATE TABLE ${tx(schemaName)}.invoices (
      id SERIAL PRIMARY KEY, 
      invoice_number VARCHAR(100) UNIQUE, 
      invoice_type VARCHAR(50), 
      contact_id INT, 
      gross_amount NUMERIC, 
      net_amount NUMERIC, 
      paid_amount NUMERIC,
      description TEXT
    )`;

    await tx`CREATE TABLE ${tx(schemaName)}.items (id SERIAL PRIMARY KEY, name VARCHAR(255), item_type VARCHAR(50), barcode VARCHAR(100))`;
    await tx`CREATE TABLE ${tx(schemaName)}.invoice_items (id SERIAL PRIMARY KEY, invoice_id INT, item_id INT, quantity NUMERIC, unit_price NUMERIC)`;
    await tx`CREATE TABLE ${tx(schemaName)}.cash_transactions (id SERIAL PRIMARY KEY, account_id INT, flow_type VARCHAR(10), amount NUMERIC, invoice_id INT, description TEXT)`;

    // ج. زرع الثوابت (المورد العام 1، والخزينة 1) لتنشيط شاشات المشتريات والواجهة فوراً
    await tx`INSERT INTO ${tx(schemaName)}.contacts (id, name, type) VALUES (1, 'جهة تعامل عامة افتراضية', 'general') ON CONFLICT (id) DO NOTHING`;
    await tx`INSERT INTO ${tx(schemaName)}.accounts (id, account_name, account_type) VALUES (1, 'الخزينة الرئيسية', 'cash') ON CONFLICT (id) DO NOTHING`;
  });
}
