// pages/api/auth/register.js
import postgres from 'postgres';

export default async function handler(req, res) {
  // 🛡️ تفعيل الـ CORS الكامل والمستقر لهواتف الأندرويد
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

    // هنا نستقبل حقول الإنشاء (بما فيها اسم الشركة)
    const { companyName, adminEmail, adminPassword } = body;

    if (!companyName || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, error: 'جميع الحقول (اسم الشركة، البريد، كلمة المرور) مطلوبة لتأسيس المؤسسة' });
    }

    const cleanEmail = String(adminEmail).trim().toLowerCase();
    const cleanCompanyName = String(companyName).trim();

    // التحقق من عدم تكرار البريد الإلكتروني في الجدول المركزي
    const [existingUser] = await sql`
      SELECT id FROM public.users WHERE lower(email) = ${cleanEmail}
    `;

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'هذا البريد الإلكتروني مسجل لمؤسسة أخرى بالفعل' });
    }

    // توليد اسم سكيما فريد يعتمد على اسم الشركة لمنع التداخل
    const sanitizedTitle = cleanCompanyName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedSchemaName = `tenant_${sanitizedTitle || 'company'}_${randomSuffix}`;

    // بدء المعاملة الذرية السحابية (Transaction) لضمان حفظ الحساب وحفر السكيما معاً
    await sql.begin(async (tx) => {
      // أ: إدراج بيانات الشركة والحساب في الجدول المركزي لـ public
      await tx`
        INSERT INTO public.users (email, password, tenant_schema, company_name, role)
        VALUES (${cleanEmail}, ${adminPassword}, ${generatedSchemaName}, ${cleanCompanyName}, 'admin')
      `;

      // ب: استدعاء دالة البناء التلقائية لحفر الجداول وزرع العميل الافتراضي رقم 1
      await tx`
        SELECT public.create_new_client_erp(${generatedSchemaName}, FALSE)
      `;
    });

    // 🚀 نجاح التأسيس: نرسل الرد ومعه الثوابت الافتراضية صراحة ليمسكها الأندرويد فوراً
    return res.status(200).json({
      success: true,
      message: 'تم تأسيس حساب المؤسسة وتجهيز بيئة العمل بنجاح!',
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
