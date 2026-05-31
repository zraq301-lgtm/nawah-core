// pages/api/auth/login.js
import postgres from 'postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

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

    const { email, password } = body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبان لتأكيد الهوية الرقمية' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const [user] = await sql`
      SELECT id, email, password, tenant_schema, company_name, role 
      FROM public.users 
      WHERE lower(email) = ${cleanEmail}
    `;

    if (!user || String(user.password) !== String(password)) {
      return res.status(401).json({ success: false, error: 'خطأ في البريد الإلكتروني أو كلمة المرور، يرجى إعادة المحاولة' });
    }

    return res.status(200).json({
      success: true,
      message: "تم التحقق من الهوية بنجاح والدخول آمن لبيئة العمل",
      schema: user.tenant_schema,
      company: user.company_name,
      email: user.email,
      default_contact_id: 1, // تأمين إضافي أثناء تسجيل الدخول العادي
      default_account_id: 1
    });

  } catch (error) {
    console.error("❌ خطأ خادم تسجيل الدخول المركزي:", error.message);
    return res.status(500).json({ success: false, error: "فشل الاتصال بالنظام السحابي، يرجى التحقق من اتصال الشبكة" });
  } finally {
    if (sql) await sql.end({ timeout: 0.5 });
  }
}
