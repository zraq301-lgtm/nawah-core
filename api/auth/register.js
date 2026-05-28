import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // 🛡️ تأكد من إضافة هذا المفتاح في إعدادات فيرسيل
);

// الدالة الأساسية التي يستدعيها فيرسيل عند طلب الـ API
export default async function handler(req, res) {
  // تأكد من أن الطلب من نوع POST فقط لمنع التلاعب
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { companyName, adminEmail, adminPassword } = req.body;

  try {
    // 1. توليد اسم سكيما فريد وخاص بالشركة ونظيف
    const schemaName = `tenant_${Date.now()}`;

    // 2. إنشاء الشركة داخل الـ public schema
    const newCompany = await prisma.company.create({
      data: {
        name: companyName,
      },
    });

    // 3. إنشاء مستخدم الإدمن وربطه بالشركة
    const newUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: adminPassword, 
        companyId: newCompany.id,
      },
    });

    // 🚀 4. استدعاء المكنة التلقائية السحرية داخل سوبابيز لحفر الجداول للعميل
    const { error: rpcError } = await supabase.rpc('create_new_client_erp', {
      client_schema_name: schemaName
    });

    if (rpcError) {
      throw new Error(`فشل حفر جداول العميل تلقائياً: ${rpcError.message}`);
    }

    // 5. الرد بنجاح العملية وحفظ البيانات
    return res.status(201).json({
      success: true,
      message: "تم تأسيس الشركة وحفر نظام الـ ERP الخاص بها بنجاح وعزلها فولاذياً!",
      companyId: newCompany.id,
      schema: schemaName
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
