// pages/api/erp/mutate.js
import postgres from 'postgres';

export default async function handler(req, res) {
  // 🛡️ تفعيل الـ CORS الكامل لهواتف الأندرويد (Capacitor)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  const { schema, data } = req.body; 
  
  if (!schema) return res.status(400).json({ success: false, error: "اسم الـ Schema مطلوب" });
  
  // تأمين معيار الحروف الصغيرة قسراً لاسم السكيما لضمان ثبات الهيكل في نيون
  const schemaName = String(schema).trim().toLowerCase(); 

  // 🔌 فتح اتصال فوري وسريع بمشروع نيون الأب عبر المتغير الموحد
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

  try {
    const targetContactId = data.contact_id ? Number(data.contact_id) : 1;
    const targetAccountId = data.account_id ? Number(data.account_id) : 1;
    const grossAmount = Number(data.gross_amount || 0);
    const discount = Number(data.discount || 0);
    const taxAmount = Number(data.tax_amount || 0);
    const netAmount = Number(data.net_amount || (grossAmount - discount + taxAmount));
    const paidAmount = Number(data.paid_amount || 0);
    const remainingAmount = netAmount - paidAmount;

    // 💡 تحديد تصنيف جهة التعامل بناءً على نوع الفاتورة القادمة من الواجهة
    const contactType = (data.invoice_type === 'purchase' || data.invoice_type === 'purchase_request') ? 'supplier' : 'customer';

    let savedInvoice = null;

    // 🚀 بدء عملية Transaction موحدة في نيون لحماية البيانات من التجزؤ
    await sql.begin(async (tx) => {

      // 1️⃣ تأمين الحسابات والموردين/العملاء (Upsert الصافي في الـ PostgreSQL)
      await tx`
        INSERT INTO ${tx(schemaName)}.contacts (id, name, type)
        VALUES (${targetContactId}, ${data.contact_name || 'جهة تعامل عامة'}, ${contactType})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type
      `;

      await tx`
        INSERT INTO ${tx(schemaName)}.accounts (id, account_name, account_type)
        VALUES (${targetAccountId}, 'الخزينة الرئيسية', 'cash')
        ON CONFLICT (id) DO NOTHING
      `;

      // 2️⃣ إدخال رأس الفاتورة أو طلب الاحتياج وجلب السطر المضاف فوراً
      const [invoice] = await tx`
        INSERT INTO ${tx(schemaName)}.invoices (
          invoice_number, invoice_type, contact_id, gross_amount, 
          discount, tax_amount, net_amount, paid_amount, remaining_amount, description
        ) VALUES (
          ${String(data.invoice_number)}, ${data.invoice_type || 'sale'}, ${targetContactId}, ${grossAmount}, 
          ${discount}, ${taxAmount}, ${netAmount}, ${paidAmount}, ${remainingAmount}, ${data.description || null}
        )
        RETURNING *
      `;

      if (!invoice) throw new Error("فشل إدخال رأس الفاتورة في نيون");
      savedInvoice = invoice;

      // 3️⃣ تفكيك وإدخال مصفوفة الأصناف (invoice_items)
      const itemsArray = data.items || data.invoice_items || [];
      if (itemsArray.length > 0) {
        
        for (const item of itemsArray) {
          const currentItemId = item.item_id || item.id || 1;

          // مزامنة وجود الصنف في المخزن (Upsert) لمنع كسر قيود العلاقات المتينة
          await tx`
            INSERT INTO ${tx(schemaName)}.items (id, name, item_type, barcode)
            VALUES (${Number(currentItemId)}, ${item.name || 'صنف افتراضي'}, 'product', ${item.barcode || `BAR-${currentItemId}`})
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, barcode = EXCLUDED.barcode
          `;

          // إدخال تفاصيل الصنف المربوط بالفاتورة
          await tx`
            INSERT INTO ${tx(schemaName)}.invoice_items (invoice_id, item_id, quantity, unit_price)
            VALUES (${invoice.id}, ${Number(currentItemId)}, ${Number(item.quantity || 1)}, ${Number(item.unit_price || item.price || 0)})
          `;
        }
      }

      // 4️⃣ ترحيل السند المالي وحركة النقدية تلقائياً بناءً على طبيعة العملية المالية
      if (paidAmount > 0) {
        const cashFlowType = data.invoice_type === 'purchase' ? 'out' : 'in';

        await tx`
          INSERT INTO ${tx(schemaName)}.cash_transactions (account_id, flow_type, amount, invoice_id, description)
          VALUES (
            ${targetAccountId}, ${cashFlowType}, ${paidAmount}, ${invoice.id}, 
            ${data.description || `دفعة نقدية للفاتورة رقم: ${data.invoice_number}`}
          )
        `;
      }
    });

    // إرجاع رد قياسي متوافق مع شاشات الـ React بالأندرويد
    return res.status(200).json({ success: true, data: savedInvoice });

  } catch (error) {
    console.error("❌ خطأ عملية التعديل في نيون:", error.message);
    return res.status(400).json({ success: false, error: error.message });
  }
}
