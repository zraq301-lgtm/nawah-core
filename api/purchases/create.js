import { PrismaClient } from '@prisma/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { tenantId, orderData, idempotencyKey } = req.body;

  if (!tenantId || !orderData || !idempotencyKey) {
    return res.status(400).json({ message: "Missing required data" });
  }

  // 1. السحر الهندي: تجهيز رابط اتصال مخصص للـ Schema بتاعة العميل ده بالظبط 🧙‍♂️
  const schemaName = `tenant_${tenantId}`;
  
  // نقوم بحقن اسم السكيما في رابط الـ Pooler المستقر (منفذ 6543 المخصص للـ API في فيرسيل)
  const tenantDatabaseUrl = `postgresql://postgres:${process.env.DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?schema=${schemaName}&sslmode=require`;

  // 2. إنشاء نسخة مخصصة من PrismaClient لهذا الطلب فقط لتوجيهه للغرفة الصحيحة
  const prisma = new PrismaClient({
    datasources: {
      db: { url: tenantDatabaseUrl }
    }
  });

  try {
    // 3. التنفيذ باستخدام Transaction جوة سكيما العميل
    const result = await prisma.$transaction(async (tx) => {
      
      // البحث عن الطلب الحالي داخل جداول العميل نفسه (بدون الحاجة لحقل tenant_id لأن الجدول معزول بالكامل!)
      const existing = await tx.purchase.findFirst({
        where: { 
          idempotency_key: String(idempotencyKey) 
        }
      });

      if (existing) throw new Error("DUPLICATE_ORDER");

      // إنشاء الطلب في جدول الـ purchase الخاص بالعميل
      return await tx.purchase.create({
        data: {
          idempotency_key: String(idempotencyKey),
          total_amount: orderData.total || 0,
          status: "pending",
          items: {
            create: (orderData.items || []).map(item => ({
              product_id: String(item.product_id),
              quantity: parseInt(item.quantity),
              unit_price: parseFloat(item.unit_price)
            }))
          }
        }
      });
    });

    return res.status(200).json({ status: "success", data: result });

  } catch (error) {
    console.error(`❌ خطأ في الـ API للعميل (${schemaName}):`, error);
    
    if (error.message === "DUPLICATE_ORDER") {
      return res.status(409).json({ status: "error", message: "Order already exists" });
    }
    
    return res.status(500).json({ 
      status: "error", 
      message: error.message 
    });
  } finally {
    // 4. خطوة مهمة جداً لفيرسيل: قفل الاتصال بعد انتهاء الطلب لعدم استهلاك ممرات الـ Pooler
    await prisma.$disconnect();
  }
}
