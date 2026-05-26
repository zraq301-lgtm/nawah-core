import { PrismaClient } from '@prisma/client';

// تعريف العميل داخل الملف نفسه لضمان استقرار الكود على Vercel
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { tenantId, orderData, idempotencyKey } = req.body;

    if (!tenantId || !orderData || !idempotencyKey) {
      return res.status(400).json({ message: "Missing required data" });
    }

    // التنفيذ باستخدام Transaction
    const result = await prisma.$transaction(async (tx) => {
      
      // البحث عن الطلب الحالي
      const existing = await tx.purchase.findFirst({
        where: { 
          tenant_id: String(tenantId),
          idempotency_key: String(idempotencyKey) 
        }
      });

      if (existing) throw new Error("DUPLICATE_ORDER");

      // إنشاء الطلب
      return await tx.purchase.create({
        data: {
          tenant_id: String(tenantId),
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
    console.error("API Error Details:", error);
    
    if (error.message === "DUPLICATE_ORDER") {
      return res.status(409).json({ status: "error", message: "Order already exists" });
    }
    
    return res.status(500).json({ 
      status: "error", 
      message: error.message 
    });
  }
}
