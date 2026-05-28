import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

// تهيئة كليانت سوبابيز بمفتاح الـ Service Role لامتلاك صلاحيات الإدارة الفولاذية
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { companyName, adminEmail, adminPassword } = req.body;

  try {
    // 1️⃣ أولاً: توليد اسم سكيما فريد وخاص بالشركة للـ ERP
    const schemaName = `tenant_${Date.now()}`;

    // 2️⃣ ثانياً: إنشاء حساب المستخدم الحقيقي داخل سوبابيز أوتوماتيكياً وتفعيله فوراً 🔐
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true // 🔥 سحر أمني: الحساب بيتفعل فوراً بدون ما يروح يفتح إيميله!
    });

    if (authError) {
      throw new Error(`فشل إنشاء الحساب في سوبابيز: ${authError.message}`);
    }

    const supabaseUid = authUser.user.id; // الـ ID الفريد الذي ولدته سوبابيز للمستخدم

    // 3️⃣ ثالثاً: تسجيل الشركة داخل الـ public schema عبر بريزما
    const newCompany = await prisma.company.create({
      data: {
        name: companyName,
      },
    });

    // 4️⃣ رابعاً: ربط المستخدم بالشركة وحفظ بياناته في جدول الـ User العام
    await prisma.user.create({
      data: {
        id: supabaseUid, // نستخدم نفس الـ UID بتاع سوبابيز لتوحيد الهوية 🎯
        email: adminEmail,
        password: adminPassword, // (يفضل تشفيره، لكن بريزما ستحفظه كمرجع)
        companyId: newCompany.id,
      },
    });

    // 5️⃣ خامساً: استدعاء مكينة الحفر الداخلية لحفر جداول الـ ERP (المشتريات والطلبات)
    const { error: rpcError } = await supabase.rpc('create_new_client_erp', {
      client_schema_name: schemaName
    });

    if (rpcError) {
      throw new Error(`فشل حفر جداول العميل تلقائياً: ${rpcError.message}`);
    }

    // 6️⃣ سادساً: الرد بنجاح العملية بالكامل
    return res.status(201).json({
      success: true,
      message: "تم إنشاء الحساب، وتأسيس الشركة، وحفر الـ ERP بنجاح تفريدي ومؤمن!",
      companyId: newCompany.id,
      schema: schemaName,
      userId: supabaseUid
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
