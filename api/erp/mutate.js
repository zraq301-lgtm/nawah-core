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

  // 🔌 فتح اتصال فوري بمشروع نيون (Neon)
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', onnotice: () => {} });

  try {
    // ==========================================
    // 1️⃣ 👤 مسار حفظ جهات التعامل (Contacts)
    // ==========================================
    if (targetTable === 'contacts') {
      const rawContactId = data.contact_id || data.id || Date.now();
      const dbContactId = String(rawContactId);
      
      const safeName = data.name || 'جهة تعامل عامة';
      const safePhone = data.phone || '';
      const safeAddress = data.address || '';
      const safeType = data.type || 'supplier';
      const safeBalance = Number(data.current_balance || data.debt || 0);

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

    // ==========================================
    // 2️⃣ 📦 مسار حفظ أو تحديث المخزون (Items)
    // ==========================================
    if (targetTable === 'stock' || targetTable === 'items') {
      const rawItemId = data.id || data.item_id || Date.now();
      const itemIdStr = String(rawItemId);
      const itemBarcode = data.barcode || `BAR-${itemIdStr}`;
      
      const [savedItem] = await sql`
        INSERT INTO ${sql(schemaName)}.items (name, item_type, barcode, available_quantity, cost_price, sale_price)
        VALUES (
          ${data.name}, 
          ${data.item_type || 'product'}, 
          ${itemBarcode}, 
          ${Number(data.available_quantity || data.balance || 0)}, 
          ${Number(data.cost_price || 0)}, 
          ${Number(data.sale_price || data.price || 0)}
        )
        ON CONFLICT (barcode) 
        DO UPDATE SET 
          name = EXCLUDED.name, 
          available_quantity = EXCLUDED.available_quantity, 
          cost_price = EXCLUDED.cost_price,
          sale_price = EXCLUDED.sale_price
        RETURNING *
      `;
      return res.status(200).json({ success: true, data: savedItem });
    }

    // ==========================================
    // 3️⃣ 🍳 مسار تهيئة الطبخات والمعايير والمكونات (Product BOMs + Ingredients)
    // ==========================================
    if (targetTable === 'product_boms') {
      let savedBomHeader = null;

      // استخدام Transaction لضمان حفظ الرأس والمكونات معاً أو التراجع كلياً في حال وجود خطأ
      await sql.begin(async (tx) => {
        const pName = String(data.product_name || '').trim();
        const bName = String(data.bom_name || '').trim();
        const bQty = Number(data.base_quantity || 1.000);

        // أ) التحقق من أو إيجاد المعرف الرقمي للمنتج النهائي
        let itemInternalId = data.product_id ? Number(data.product_id) : null;

        if (!itemInternalId && pName) {
          const [existingItem] = await tx`
            SELECT id FROM ${tx(schemaName)}.items WHERE name = ${pName} LIMIT 1
          `;

          if (existingItem) {
            itemInternalId = existingItem.id;
          } else {
            // إن لم يكن مسجلاً، نقوم بإنشائه آلياً لتأمين الـ Foreign Key
            const randomBarcode = `BAR-PROD-${Date.now()}`;
            const [newItem] = await tx`
              INSERT INTO ${tx(schemaName)}.items (name, item_type, barcode, available_quantity)
              VALUES (${pName}, 'product', ${randomBarcode}, 0)
              RETURNING id
            `;
            itemInternalId = newItem.id;
          }
        }

        if (!itemInternalId) {
          throw new Error("لم يتم تحديد المعرف الخاص بالمنتج النهائي بالشكل الصحيح.");
        }

        // ب) إدراج سجل الطبخة الرئيسي (product_boms)
        const [bomHeader] = await tx`
          INSERT INTO ${tx(schemaName)}.product_boms (product_id, bom_name, base_quantity)
          VALUES (${itemInternalId}, ${bName}, ${bQty})
          RETURNING *
        `;

        if (!bomHeader) throw new Error("فشل تسجيل السجل الرئيسي للطبخة.");
        savedBomHeader = bomHeader;

        // 🌿 ج) قراءة مصفوفة المكونات المرفقة بالطلب وإدراجها فوراً
        const ingredientsArray = data.ingredients || [];
        if (ingredientsArray.length > 0) {
          for (const ing of ingredientsArray) {
            const rawMatId = Number(ing.raw_material_id);
            const reqQty = Number(ing.required_quantity);

            if (!rawMatId || !reqQty) {
              throw new Error("بيانات أحد المكونات/الخامات غير مكتملة.");
            }

            await tx`
              INSERT INTO ${tx(schemaName)}.bom_ingredients (bom_id, raw_material_id, required_quantity)
              VALUES (${bomHeader.id}, ${rawMatId}, ${reqQty})
            `;
          }
        }
      });

      return res.status(200).json({ success: true, data: savedBomHeader });
    }

    // ==========================================
    // 4️⃣ 🌿 مسار حفظ المكونات المنفردة (إحتياطي)
    // ==========================================
    if (targetTable === 'bom_ingredients') {
      const [savedIngredient] = await sql`
        INSERT INTO ${sql(schemaName)}.bom_ingredients (bom_id, raw_material_id, required_quantity)
        VALUES (
          ${制造_id => Number(data.bom_id)},
          ${Number(data.raw_material_id)},
          ${Number(data.required_quantity)}
        )
        RETURNING *
      `;
      return res.status(200).json({ success: true, data: savedIngredient });
    }

    // ==========================================
    // 5️⃣ 📜 مسار معالجة الفواتير وحركات النقدية (Invoices)
    // ==========================================
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
      let contactInternalId = 1;
      const [fetchedContact] = await tx`
        SELECT id FROM ${tx(schemaName)}.contacts WHERE contact_id = ${targetContactIdStr}
      `;

      if (fetchedContact) {
        contactInternalId = fetchedContact.id;
        await tx`
          UPDATE ${tx(schemaName)}.contacts 
          SET name = ${data.contact_name || 'جهة تعامل عامة'}, type = ${contactType}
          WHERE id = ${contactInternalId}
        `;
      } else {
        const [newC] = await tx`
          INSERT INTO ${tx(schemaName)}.contacts (contact_id, name, type)
          VALUES (${targetContactIdStr}, ${data.contact_name || 'جهة تعامل عامة'}, ${contactType})
          RETURNING id
        `;
        if (newC) contactInternalId = newC.id;
      }

      await tx`
        INSERT INTO ${tx(schemaName)}.accounts (id, account_name, account_type)
        VALUES (${targetAccountId}, 'الخزينة الرئيسية', 'cash')
        ON CONFLICT (id) DO NOTHING
      `;

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

      const itemsArray = data.items || data.invoice_items || [];
      if (itemsArray.length > 0) {
        for (const item of itemsArray) {
          const currentBarcode = item.barcode || `BAR-${item.item_id || item.id || Date.now()}`;

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
