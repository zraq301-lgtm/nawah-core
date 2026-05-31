// pages/api/erp/mutate.js
import postgres from 'postgres';

export default async function handler(req, res) {
  // 🛡️ تفعيل الـ CORS الكامل والمستقر لهواتف الأندرويد (Capacitor / المحاكيات)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  // 🧠 دمج قراءة المتغيرات سواء أرسلت مباشرة أو داخل كائن data
  const { schema, table, ...directData } = req.body;
  const data = req.body.data || directData; 
  const targetTable = table || req.body.table;

  if (!schema) return res.status(400).json({ success: false, error: "اسم الـ Schema مطلوب" });
  
  const schemaName = String(schema).trim().toLowerCase().replace(/[^a-z0-9_]/g, ''); 

  // 🔌 فتح اتصال فوري وسريع بمشروع نيون
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', onnotice: () => {} });

  try {
    // 1️⃣ 👤 مسار حفظ جهات التعامل (الموردين / العملاء)
    if (targetTable === 'contacts') {
      // 🧠 [الإصلاح الحاسم]: عدم إجبار الـ id التلقائي على أخذ قيمة الـ Timestamp الفلكية، بل دع الـ SERIAL يولد id طبيعي، واحفظ المعرف في contact_id
      const rawContactId = data.contact_id || data.id || Date.now();
      const dbContactId = String(rawContactId); // تمرير كـ String لتفادي كسر الـ Integer في السيرفر
      
      const safeName = data.name || 'جهة تعامل عامة';
      const safePhone = data.phone || '';
      const safeAddress = data.address || '';
      const safeType = data.type || 'supplier';
      const safeBalance = Number(data.current_balance || data.debt || 0);

      // نستخدم استعلام مرن: إذا كان الـ contact_id موجوداً مسبقاً نقوم بالتحديث، وإلا نقوم بالإدخال
      const [existingContact] = await sql`
        SELECT id FROM ${sql(schemaName)}.contacts WHERE contact_id = ${dbContactId}
      `;

      let savedContact;
      if (existingContact) {
        [savedContact] = await sql`
          UPDATE ${sql(schemaName)}.contacts SET
            name = ${safeName},
            phone = ${safePhone},
            address = ${safeAddress},
            type = ${safeType},
            current_balance = ${safeBalance}
          WHERE id = ${existingContact.id}
          RETURNING *
        `;
      } else {
        [savedContact] = await sql`
          INSERT INTO ${sql(schemaName)}.contacts (contact_id, name, type, phone, address, current_balance)
          VALUES (${dbContactId}, ${safeName}, ${safeType}, ${safePhone}, ${safeAddress}, ${safeBalance})
          RETURNING *
        `;
      }

      return res.status(200).json({ success: true, data: savedContact });
    }

    // 2️⃣ 📦 مسار حفظ أو تحديث المخزون (جدول items الأصيل بالسكيما)
    if (targetTable === 'stock' || targetTable === 'items') {
      const rawItemId = data.id || data.item_id || Date.now();
      const itemIdStr = String(rawItemId);
      
      const [savedItem] = await sql`
        INSERT INTO ${sql(schemaName)}.items (name, item_type, barcode, available_quantity, sale_price)
        VALUES (
          ${data.name}, 
          ${data.item_type || 'product'}, 
          ${data.barcode || `BAR-${itemIdStr}`}, 
          ${Number(data.available_quantity || data.balance || 0)}, 
          ${Number(data.sale_price || data.price || 0)}
        )
        ON CONFLICT (barcode) 
        DO UPDATE SET 
          name = EXCLUDED.name, 
          available_quantity = EXCLUDED.available_quantity, 
          sale_price = EXCLUDED.sale_price
        RETURNING *
      `;
      return res.status(200).json({ success: true, data: savedItem });
    }

    // 3️⃣ 📜 مسار معالجة الفواتير وحركات النقدية الكبيرة (Invoice Transaction)
    // نضمن عدم استخدام تحويل عددي للأرقام الكبيرة لكي لا تفقد دقتها أو تسبب خطأ Range
    const targetContactIdStr = data.contact_id ? String(data.contact_id) : '1';
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
      // البحث عن الـ id الداخلي للـ contact باستخدام الـ contact_id النصي الضخم
      let contactInternalId = 1;
      const [fetchedContact] = await tx`
        SELECT id FROM ${tx(schemaName)}.contacts WHERE contact_id = ${targetContactIdStr}
      `;

      if (fetchedContact) {
        contactInternalId = fetchedContact.id;
        // تحديث البيانات الأساسية احتياطياً
        await tx`
          UPDATE ${tx(schemaName)}.contacts 
          SET name = ${data.contact_name || 'جهة تعامل عامة'}, type = ${contactType}
          WHERE id = ${contactInternalId}
        `;
      } else {
        // إذا كان المورد غير موجود ننشئه فوراً بالـ contact_id الضخم ليعطيه السيرفر id تلقائي صحيح
        const [newC] = await tx`
          INSERT INTO ${tx(schemaName)}.contacts (contact_id, name, type)
          VALUES (${targetContactIdStr}, ${data.contact_name || 'جهة تعامل عامة'}, ${contactType})
          RETURNING id
        `;
        if (newC) contactInternalId = newC.id;
      }

      // تأمين وجود الحساب المالي
      await tx`
        INSERT INTO ${tx(schemaName)}.accounts (id, account_name, account_type)
        VALUES (${targetAccountId}, 'الخزينة الرئيسية', 'cash')
        ON CONFLICT (id) DO NOTHING
      `;

      // إدخال رأس الفاتورة بالربط مع الـ id الداخلي الصحيح لجدول الـ contacts
      const [invoice] = await tx`
        INSERT INTO ${tx(schemaName)}.invoices (
          invoice_number, invoice_type, contact_id, gross_amount, 
          discount, tax_amount, net_amount, paid_amount, remaining_amount, description
        ) VALUES (
          ${String(data.invoice_number || Date.now())}, ${data.invoice_type || 'sale'}, ${contactInternalId}, ${grossAmount}, 
          ${discount}, ${taxAmount}, ${netAmount}, ${paidAmount}, ${remainingAmount}, ${data.description || null}
        )
        RETURNING *
      `;

      if (!invoice) throw new Error("فشل إدخال رأس الفاتورة في نيون");
      savedInvoice = invoice;

      // ترحيل مصفوفة الأصناف وتأمين وجودها في جدول items
      const itemsArray = data.items || data.invoice_items || [];
      if (itemsArray.length > 0) {
        for (const item of itemsArray) {
          const currentBarcode = item.barcode || `BAR-${item.item_id || item.id || Date.now()}`;

          // البحث أو الإنشاء الفوري بناء على الباركود الفريد للأصناف
          let itemInternalId;
          const [fetchedItem] = await tx`
            SELECT id FROM ${tx(schemaName)}.items WHERE barcode = ${currentBarcode}
          `;

          if (fetchedItem) {
            itemInternalId = fetchedItem.id;
          } else {
            const [newItem] = await tx`
              INSERT INTO ${tx(schemaName)}.items (name, item_type, barcode, available_quantity, sale_price)
              VALUES (${item.name || 'صنف افتراضي'}, 'product', ${currentBarcode}, 0, ${Number(item.unit_price || item.price || 0)})
              RETURNING id
            `;
            itemInternalId = newItem.id;
          }

          await tx`
            INSERT INTO ${tx(schemaName)}.invoice_items (invoice_id, item_id, quantity, unit_price)
            VALUES (${invoice.id}, ${itemInternalId}, ${Number(item.quantity || 1)}, ${Number(item.unit_price || item.price || 0)})
          `;
        }
      }

      // ترحيل السند المالي للحركة النقدية
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
