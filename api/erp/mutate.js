// pages/api/erp/mutate.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  const { schema, data } = req.body; 
  const schemaName = String(schema).trim().toLowerCase(); 

  if (!schemaName) return res.status(400).json({ success: false, error: "اسم الـ Schema مطلوب" });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  try {
    const targetContactId = data.contact_id ? Number(data.contact_id) : 1;
    const targetAccountId = data.account_id ? Number(data.account_id) : 1;
    const grossAmount = Number(data.gross_amount || 0);
    const discount = Number(data.discount || 0);
    const taxAmount = Number(data.tax_amount || 0);
    const netAmount = Number(data.net_amount || (grossAmount - discount + taxAmount));
    const paidAmount = Number(data.paid_amount || 0);
    const remainingAmount = netAmount - paidAmount;

    // 1️⃣ تأمين الحسابات والعملاء (Upsert)
    await supabase.schema(schemaName).from('contacts').upsert(
      { id: targetContactId, name: data.contact_name || 'عميل افتراضي', type: 'customer' },
      { onConflict: 'id' }
    );

    await supabase.schema(schemaName).from('accounts').upsert(
      { id: targetAccountId, account_name: 'الخزينة الرئيسية', account_type: 'cash' },
      { onConflict: 'id' }
    );

    // 2️⃣ إدخال رأس الفاتورة
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

    if (invError) throw new Error(`خطأ الفاتورة: ${invError.message}`);

    // 3️⃣ إدخال الأصناف (invoice_items)
    const itemsArray = data.items || data.invoice_items || [];
    if (itemsArray.length > 0) {
      const preparedItems = [];
      
      for (const item of itemsArray) {
        const currentItemId = item.item_id || item.id || 1;

        await supabase.schema(schemaName).from('items').upsert(
          { 
            id: Number(currentItemId), 
            name: item.name || 'صنف افتراضي', 
            item_type: 'product',
            barcode: item.barcode || `BAR-${currentItemId}`
          },
          { onConflict: 'id' }
        );

        preparedItems.push({
          invoice_id: invoice.id,
          item_id: Number(currentItemId),
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || item.price || 0)
        });
      }

      const { error: itemsError } = await supabase
        .schema(schemaName)
        .from('invoice_items')
        .insert(preparedItems);

      if (itemsError) throw new Error(`خطأ الأصناف: ${itemsError.message}`);
    }

    // 4️⃣ ترحيل السند المالي للخزينة
    if (paidAmount > 0) {
      const { error: cashError } = await supabase
        .schema(schemaName)
        .from('cash_transactions')
        .insert([{
          account_id: targetAccountId,
          flow_type: data.invoice_type === 'purchase' ? 'out' : 'in',
          amount: paidAmount,
          invoice_id: invoice.id,
          description: data.description || `دفعة نقدية للفاتورة رقم: ${data.invoice_number}`
        }]);

      if (cashError) throw new Error(`خطأ حركة النقدية: ${cashError.message}`);
    }

    return res.status(200).json({ success: true, data: invoice });

  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
}
