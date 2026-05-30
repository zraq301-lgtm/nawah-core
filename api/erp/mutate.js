import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  const { schema, data } = req.body; 
  const schemaName = String(schema).trim().toLowerCase(); 

  if (!schemaName) {
    return res.status(400).json({ success: false, error: "اسم الـ Schema مطلوب" });
  }

  try {
    const targetContactId = data.contact_id ? Number(data.contact_id) : 1;
    const targetAccountId = data.account_id ? Number(data.account_id) : 1;

    // ---------------------------------------------------------------
    // 1️⃣ التأكد من وجود العميل أو إنشائه/تحديثه باستخدام upsert
    // ---------------------------------------------------------------
    const { error: contactError } = await supabase
      .schema(schemaName)
      .from('contacts')
      .upsert(
        { id: targetContactId, name: data.contact_name || 'عميل نقدي', type: 'customer' },
        { onConflict: 'id' } // إذا وجد الـ id متطابق، سيتخطى الخطأ ويوثق الربط
      );

    if (contactError) throw new Error(`خطأ في التحقق من العميل: ${contactError.message}`);

    // ---------------------------------------------------------------
    // 2️⃣ التأكد من وجود الحساب/الخزينة أو إنشائه/تحديثه باستخدام upsert
    // ---------------------------------------------------------------
    const { error: accountError } = await supabase
      .schema(schemaName)
      .from('accounts')
      .upsert(
        { id: targetAccountId, account_name: 'الخزينة الرئيسية', account_type: 'cash' },
        { onConflict: 'id' }
      );

    if (accountError) throw new Error(`خطأ في التحقق من الحساب: ${accountError.message}`);

    // ---------------------------------------------------------------
    // 3️⃣ إدخال الفاتورة الرئيسية
    // ---------------------------------------------------------------
    const grossAmount = Number(data.gross_amount || 0);
    const discount = Number(data.discount || 0);
    const taxAmount = Number(data.tax_amount || 0);
    const netAmount = Number(data.net_amount || (grossAmount - discount + taxAmount));
    const paidAmount = Number(data.paid_amount || 0);
    const remainingAmount = netAmount - paidAmount;

    const { data: invoice, error: invError } = await supabase
      .schema(schemaName)
      .from('invoices')
      .insert([{
        invoice_number: String(data.invoice_number),
        invoice_type: data.invoice_type || 'sale',
        contact_id: targetContactId,
        gross_amount: grossAmount,
        discount: discount,
        tax_amount: taxAmount,
        net_amount: netAmount,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount
      }])
      .select()
      .single();

    if (invError) throw new Error(`خطأ أثناء حفظ الفاتورة: ${invError.message}`);

    // ---------------------------------------------------------------
    // 4️⃣ إدخال تفاصيل الأصناف مع معالجة الـ item_id عبر upsert
    // ---------------------------------------------------------------
    const itemsArray = data.items || data.invoice_items || [];
    if (itemsArray.length > 0) {
      const preparedItems = [];
      
      for (const item of itemsArray) {
        const currentItemId = item.item_id || item.id || 1;

        // عمل upsert للصنف للتأكد من وجود الـ ID في جدول items التابع للـ سكيما
        const { error: itemUpsertError } = await supabase
          .schema(schemaName)
          .from('items')
          .upsert(
            { 
              id: Number(currentItemId), 
              name: item.name || 'صنف غير معرف', 
              item_type: 'product',
              barcode: item.barcode || `BAR-${currentItemId}`
            },
            { onConflict: 'id' }
          );

        if (itemUpsertError) throw new Error(`خطأ في التحقق من الصنف ${currentItemId}: ${itemUpsertError.message}`);

        preparedItems.push({
          invoice_id: invoice.id,
          item_id: Number(currentItemId),
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || item.price || 0)
          // ملاحظة: حقل row_total تم إزالته تماماً لأنه يحسب تلقائياً بالقاعدة
        });
      }

      const { error: itemsError } = await supabase
        .schema(schemaName)
        .from('invoice_items')
        .insert(preparedItems);

      if (itemsError) throw new Error(`خطأ أثناء إدخال عناصر الفاتورة: ${itemsError.message}`);
    }

    // ---------------------------------------------------------------
    // 5️⃣ ترحيل حركة النقدية
    // ---------------------------------------------------------------
    if (paidAmount > 0) {
      const { error: cashError } = await supabase
        .schema(schemaName)
        .from('cash_transactions')
        .insert([{
          account_id: targetAccountId,
          flow_type: data.invoice_type === 'purchase' ? 'out' : 'in',
          amount: paidAmount,
          invoice_id: invoice.id,
          description: data.description || `دفعة للفاتورة رقم: ${data.invoice_number}`
        }]);

      if (cashError) throw new Error(`خطأ أثناء ترحيل النقدية: ${cashError.message}`);
    }

    return res.status(200).json({
      success: true,
      message: `تمت العملية بنجاح في السكيما [${schemaName}]`,
      data: invoice
    });

  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
}
