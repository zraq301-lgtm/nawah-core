// pages/api/erp/mutate.js
import postgres from 'postgres';

export default async function handler(req, res) {
  // 🛡️ تفعيل الـ CORS الكامل لهواتف الأندرويد (Capacitor)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  // 🧠 دمج فك الحزم بذكاء: قراءة المتغيرات سواء أرسلت مباشرة أو داخل كائن data
  const { schema, table, ...directData } = req.body;
  const data = req.body.data || directData; 
  
  const targetTable = table || req.body.table;

  if (!schema) return res.status(400).json({ success: false, error: "اسم الـ Schema مطلوب" });
  
  // تأمين معيار الحروف الصغيرة قسراً لاسم السكيما لضمان ثبات الهيكل في نيون
  const schemaName = String(schema).trim().toLowerCase(); 

  // 🔌 فتح اتصال فوري بمشروع نيون
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', onnotice: () => {} });

  try {
    // 💡 ميكانيكية التحويل الذكي: إذا كان الهدف هو حفظ/تحديث الموردين أو المخزن مباشرة
    if (targetTable === 'contacts') {
      const contactId = data.id || data.contact_id || Date.now();
      const safeName = data.name || 'مورد عام';
      const safePhone = data.phone || '';
      const safeAddress = data.address || '';
      const safeType = data.type || 'supplier';
      const safeDebt = Number(data.debt || 0);

      const [savedContact] = await sql`
        INSERT INTO ${sql(schemaName)}.contacts (id, name, phone, address, type, created_at)
        VALUES (${contactId}, ${safeName}, ${safePhone}, ${safeAddress}, ${safeType}, CURRENT_TIMESTAMP)
        ON CONFLICT (id) 
        DO UPDATE SET 
          name = EXCLUDED.name, 
          phone = EXCLUDED.phone, 
          address = EXCLUDED.address, 
          type = EXCLUDED.type
        RETURNING *
      `;

      return res.status(200).json({ success: true, data: savedContact });
    }

    // 📦 إذا كان الهدف هو تحديث مباشر لجدول المخزن
    if (targetTable === 'stock') {
      const stockId = data.id || Date.now();
      const [savedItem] = await sql`
        INSERT INTO ${sql(schemaName)}.stock (id, name, unit, balance, price, created_at)
        VALUES (${stockId}, ${data.name}, ${data.unit || 'قطعة'}, ${Number(data.balance || 0)}, ${Number(data.price || 0)}, CURRENT_TIMESTAMP)
        ON CONFLICT (id) 
        DO UPDATE SET 
          name = EXCLUDED.name, 
          unit = EXCLUDED.unit, 
          balance = EXCLUDED.balance, 
          price = EXCLUDED.price
        RETURNING *
      `;
      return res.status(200).json({ success: true, data: savedItem });
    }

    // 📜 المسار القديم: معالجة الفواتير وحركات النقدية المعقدة (Invoice Transaction)
    const targetContactId = data.contact_id ? Number(data.contact_id) : 1;
    const targetAccountId = data.account_id ? Number(data.account_id) : 1;
    const grossAmount = Number(data.gross_amount || 0);
    const discount = Number(data.discount || 0);
    const taxAmount = Number(data.tax_amount || 0);
    const netAmount = Number(data.net_amount || (grossAmount - discount + taxAmount));
    const paidAmount = Number(data.paid_amount || 0);
    const remainingAmount = netAmount - paidAmount;

    const contactType = (data.invoice_type === 'purchase' || data.invoice_type === 'purchase_request') ? 'supplier' : 'customer';

    let savedInvoice = null;

    await sql.begin(async (tx) => {
      // 1️⃣ تأمين الموردين والعملاء
      await tx`
        INSERT INTO ${tx(schemaName)}.contacts (id, name, type)
        VALUES (${targetContactId}, ${data.contact_name || 'جهة تعامل عامة'}, ${contactType})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type
      `;

      // 2️⃣ تأمين الخزينة
      await tx`
        INSERT INTO ${tx(schemaName)}.accounts (id, account_name, account_type)
        VALUES (${targetAccountId}, 'الخزينة الرئيسية', 'cash')
        ON CONFLICT (id) DO NOTHING
      `;

      // 3️⃣ إدخال رأس الفاتورة
      const [invoice] = await tx`
        INSERT INTO ${tx(schemaName)}.invoices (
          invoice_number, invoice_type, contact_id, gross_amount, 
          discount, tax_amount, net_amount, paid_amount, remaining_amount, description
        ) VALUES (
          ${String(data.invoice_number || Date.now())}, ${data.invoice_type || 'sale'}, ${targetContactId}, ${grossAmount}, 
          ${discount}, ${taxAmount}, ${netAmount}, ${paidAmount}, ${remainingAmount}, ${data.description || null}
        )
        RETURNING *
      `;

      if (!invoice) throw new Error("فشل إدخال رأس الفاتورة في نيون");
      savedInvoice = invoice;

      // 4️⃣ تفكيك الأصناف
      const itemsArray = data.items || data.invoice_items || [];
      if (itemsArray.length > 0) {
        for (const item of itemsArray) {
          const currentItemId = item.item_id || item.id || 1;

          await tx`
            INSERT INTO ${tx(schemaName)}.items (id, name, item_type, barcode)
            VALUES (${Number(currentItemId)}, ${item.name || 'صنف افتراضي'}, 'product', ${item.barcode || `BAR-${currentItemId}`})
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, barcode = EXCLUDED.barcode
          `;

          await tx`
            INSERT INTO ${tx(schemaName)}.invoice_items (invoice_id, item_id, quantity, unit_price)
            VALUES (${invoice.id}, ${Number(currentItemId)}, ${Number(item.quantity || 1)}, ${Number(item.unit_price || item.price || 0)})
          `;
        }
      }

      // 5️⃣ حركة النقدية والسندات المالية
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

    return res.status(200).json({ success: true, data: savedInvoice });

  } catch (error) {
    console.error("❌ خطأ عملية التعديل في نيون:", error.message);
    return res.status(400).json({ success: false, error: error.message });
  } finally {
    if (sql) await sql.end({ timeout: 0.5 });
  }
}
