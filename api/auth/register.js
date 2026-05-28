import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  const { companyName, adminEmail, adminPassword } = req.body;

  try {
    const schemaName = `tenant_${Date.now()}`;
    let supabaseUid = null;

    // 1️⃣ محاولة إنشاء المستخدم في سوبابيز
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true
    });

    if (authError) {
      // 🔥 التعديل الذكي: لو الحساب موجود أصلاً، اسحب الـ ID بتاعه وكمل حفر عادي!
      if (authError.message.includes('already been registered')) {
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users?.find(u => u.email === adminEmail);
        if (existingUser) {
          supabaseUid = existingUser.id;
        } else {
          throw new Error("المستخدم مسجل مسبقاً ولم نتمكن من جلب بياناته");
        }
      } else {
        throw new Error(`فشل سوبابيز Auth: ${authError.message}`);
      }
    } else {
      supabaseUid = authUser.user.id;
    }

    // 2️⃣ إنشاء الشركة (إذا لم تكن موجودة)
    let company = await prisma.company.findFirst({ where: { name: companyName } });
    if (!company) {
      company = await prisma.company.create({ data: { name: companyName } });
    }

    // 3️⃣ ربط المستخدم بالشركة في الـ public schema
    const userExists = await prisma.user.findUnique({ where: { id: supabaseUid } });
    if (!userExists) {
      await prisma.user.create({
        data: {
          id: supabaseUid,
          email: adminEmail,
          password: adminPassword,
          companyId: company.id
        }
      });
    }

    // 4️⃣ تشغيل مكنة الحفر الفولاذية في سوبابيز 🚀
    const { error: rpcError } = await supabase.rpc('create_new_client_erp', {
      client_schema_name: schemaName
    });

    if (rpcError) throw new Error(`فشل حفر جداول الـ ERP: ${rpcError.message}`);

    return res.status(201).json({
      success: true,
      message: "تم التأسيس والحفر بنجاح!",
      schema: schemaName
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
