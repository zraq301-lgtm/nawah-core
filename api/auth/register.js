// pages/api/auth/register.js
import postgres from 'postgres';

export default async function handler(req, res) {
  // 🛡️ تفعيل الـ CORS الكامل والمستقر لهواتف الأندرويد والمحاكيات
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  // 🔌 الاتصال المباشر بنظام نيون السحابي
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (pErr) {
        return res.status(400).json({ success: false, error: 'صيغة البيانات المرسلة غير سليمة' });
      }
    }

    // استقبال حقول الإنشاء من الفرونت إند
    const { companyName, adminEmail, adminPassword } = body;

    if (!companyName || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, error: 'جميع الحقول (اسم الشركة، البريد، كلمة المرور) مطلوبة لتأسيس المؤسسة' });
    }

    const cleanEmail = String(adminEmail).trim().toLowerCase();
    const cleanCompanyName = String(companyName).trim();

    // 🔍 التحقق من عدم تكرار البريد الإلكتروني في الجدول المركزي قبل عمل أي شيء
    const [existingUser] = await sql`
      SELECT id FROM public.users WHERE lower(email) = ${cleanEmail}
    `;

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'هذا البريد الإلكتروني مسجل لمؤسسة أخرى بالفعل' });
    }

    // 🧠 [النظام الجديد]: توليد اسم السكيما الثابت بالاعتماد على الجزء الأول من الإيميل (قبل الـ @)
    // مثال: ahmad.erp@gmail.com يتحول إلى tenant_ahmad_erp
    const emailPrefix = cleanEmail.split('@')[0];
    const sanitizedSchemaName = emailPrefix.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const generatedSchemaName = `tenant_${sanitizedSchemaName}`;

    // 🏗️ بدء المعاملة الذرية السحابية (Transaction) لضمان التدمير والبناء النظيف الخالي من المخلفات
    await sql.begin(async (tx) => {
      
      // 💥 [تطهير نيون الحاسم]: حذف أي سكيما قديمة للمستأجر بنفس الاسم تماماً إن وجدت من تجارب سابقة
      await tx.unsafe(`DROP SCHEMA IF EXISTS ${generatedSchemaName} CASCADE`);

      // أ: إدراج بيانات الشركة والمستخدم في الجدول المركزي لـ public
      await tx`
        INSERT INTO public.users (email, password, tenant_schema, company_name, role)
        VALUES (${cleanEmail}, ${adminPassword}, ${generatedSchemaName}, ${cleanCompanyName}, 'admin')
      `;

      // ب: استدعاء دالة البناء التلقائية مع تمرير TRUE لتفعيل الفلترة والهيكلة المحدثة الكاملة (Odoo Style)
      await tx`
        SELECT public.create_new_client_erp(${generatedSchemaName}, TRUE)
      `;
    });

    // 🚀 نجاح التأسيس الكامل: نرسل الرد وبنيته الصافية فوراً ليمسكها الأندرويد والمحاكي
    return res.status(200).json({
      success: true,
      message: 'تم تصفية المخلفات وتأسيس مساحة عمل المستأجر الحديثة بنجاح فائق!',
      schema: generatedSchemaName,
      company: cleanCompanyName,
      email: cleanEmail,
      default_contact_id: 1,
      default_account_id: 1
    });

  } catch (error) {
    console.error("❌ خطأ خادم إنشاء المؤسسات المركزي:", error.message);
    return res.status(500).json({ success: false, error: `فشل بناء مساحة العمل السحابية: ${error.message}` });
  } finally {
    if (sql) await sql.end({ timeout: 0.5 });
  }
}
