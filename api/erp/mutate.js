import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { schema, data } = req.body; 
  const prefix = String(schema).trim().toLowerCase(); // اسم الشركة المعزولة (مثل: comp1)

  try {
    // 1. إدخال الفاتورة في جدول الفواتير المخصص للشركة
    const { data: invoice, error: invError } = await supabase
      .from(`${prefix}_invoices`)
      .insert([{
        invoice_number: data.invoice_number,
        invoice_type: data.invoice_type || 'sale',
        contact_id: data.contact_id || 1,
        gross_amount: Number(data.gross_amount || 0),
        discount: Number(data.discount || 0),
        tax_amount: Number(data.tax_amount || 0),
        net_amount: Number(data.net_amount || 0),
        paid_amount: Number(data.paid_amount || 0),
        remaining_amount: Number(data.net_amount || 0) - Number(data.paid_amount || 0)
      }])
      .select()
      .single();

    if (invError) throw invError;

    // 2. إدخال الأصناف (سينطلق الـ Trigger تلقائياً لتحديث المخازن الفرعية للشركة!)
    const itemsArray = data.items || data.invoice_items || [];
    if (itemsArray.length > 0) {
      const preparedItems = itemsArray.map(item => ({
        invoice_id: invoice.id,
        item_id: item.item_id || item.id,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || item.price || 0)
      }));

      const { error: itemsError } = await supabase
        .from(`${prefix}_invoice_items`)
        .insert(preparedItems);

      if (itemsError) throw itemsError;
    }

    // 3. ترحيل النقدية إلى خزينة الشركة المعزولة
    if (Number(data.paid_amount) > 0) {
      const { error: cashError } = await supabase
        .from(`${prefix}_cash_transactions`)
        .insert([{
          account_id: data.account_id || 1,
          flow_type: data.invoice_type === 'sale' ? 'in' : 'out',
          amount: Number(data.paid_amount),
          invoice_id: invoice.id,
          description: `دفعة نقدية للفاتورة رقم: ${data.invoice_number}`
        }]);

      if (cashError) throw cashError;
    }

    return res.status(200).json({
      success: true,
      message: `تم الحفظ بنجاح وتحديث حركة مخازن الشركة [${prefix}] بنجاح تام!`,
      data: invoice
    });

  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
}
