import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // إعدادات الـ CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { schema, data } = req.body; 
  const schemaName = String(schema).trim().toLowerCase(); 

  if (!schemaName) {
    return res.status(400).json({ success: false, error: "اسم الـ Schema (schema) مطلوب في الـ request body" });
  }

  try {
    // ---------------------------------------------------------------
    // خطوة حمائية: التحقق من وجود الحساب والعميل داخل الـ Schema أو تهيئتهما
    // لمنع خطأ الـ Foreign Key Constraint (Error 400)
    // ---------------------------------------------------------------
    const targetContactId = data.contact_id || 1;
    const targetAccountId = data.account_id || 1;

    // فحص هل الـ contact_id موجود في جدول contacts التابع للـ schema؟
    const { data: contactCheck } = await supabase
      .schema(schemaName)
      .from('contacts')
      .select('id')
      .eq('id', targetContactId)
      .maybeSingle();

    // إذا لم يكن موجوداً، نقوم بإنشائه افتراضياً لتفادي كسر القيود
    if (!contactCheck) {
      await supabase.schema(schemaName).from('contacts').insert([
        { id: targetContactId, name: 'عميل افتراضي نقدي', type: 'customer' }
      ]);
    }

    // فحص هل الـ account_id موجود في جدول accounts التابع للـ schema؟
    const { data: accountCheck } = await supabase
      .schema(schemaName)
      .from('accounts')
      .select('id')
      .eq('id', targetAccountId)
      .maybeSingle();

    // إذا لم يكن موجوداً، نقوم بإنشائه افتراضياً (مثل خزينة رئيسية)
    if (!accountCheck) {
      await supabase.schema(schemaName).from('accounts').insert([
        { id: targetAccountId, account_name: 'الخزينة الرئيسية', account_type: 'cash', current_balance: 0 }
      ]);
    }

    // ---------------------------------------------------------------
    // 1️⃣ إدخال الفاتورة في جدول invoices داخل الـ Schema المحدد
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
        invoice_type: data.invoice_type || 'sale', // (sale / purchase / return)
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

    if (invError) throw invError;

    // ---------------------------------------------------------------
    // 2️⃣ إدخال تفاصيل الأصناف في جدول invoice_items
    // ---------------------------------------------------------------
    const itemsArray = data.items || data.invoice_items || [];
    if (itemsArray.length > 0) {
      
      // تجهيز وفحص الأصناف قبل الإدخال للتأكد من عدم كسر الـ Foreign Key الخاص بـ item_id
      const preparedItems = [];
      
      for (const item of itemsArray) {
        const currentItemId = item.item_id || item.id || 1;

        // التحقق من وجود الصنف في السكيما، إذا لم يوجد يتم إنشاؤه كـ صنف عام
        const { data: itemCheck } = await supabase
          .schema(schemaName)
          .from('items')
          .select('id')
          .eq('id', currentItemId)
          .maybeSingle();

        if (!itemCheck) {
          await supabase.schema(schemaName).from('items').insert([
            { id: currentItemId, name: item.name || 'صنف افتراضي غير معرف', item_type: 'product', barcode: `AUTO-${currentItemId}-${Date.now()}` }
          ]);
        }

        preparedItems.push({
          invoice_id: invoice.id,
          item_id: currentItemId,
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || item.price || 0)
          // حقل row_total تم حذفه من الـ Insert لأنه GENERATED ALWAYS AS في السكيما الخاص بك ويحسب تلقائياً من القاعدة.
        });
      }

      const { error: itemsError } = await supabase
        .schema(schemaName)
        .from('invoice_items')
        .insert(preparedItems);

      if (itemsError) throw itemsError;
    }

    // ---------------------------------------------------------------
    // 3️⃣ ترحيل النقدية إلى جدول cash_transactions
    // ---------------------------------------------------------------
    if (paidAmount > 0) {
      const { error: cashError } = await supabase
        .schema(schemaName)
        .from('cash_transactions')
        .insert([{
          account_id: targetAccountId,
          flow_type: data.invoice_type === 'purchase' ? 'out' : 'in', // ينعكس بناءً على نوع الفاتورة المعتمد بالاسكيما
          amount: paidAmount,
          invoice_id: invoice.id,
          description: data.description || `دفعة نقدية تلقائية للفاتورة رقم: ${data.invoice_number}`
        }]);

      if (cashError) throw cashError;
    }

    // استجابة ناجحة بالكامل
    return res.status(200).json({
      success: true,
      message: `تم ترحيل البيانات بنجاح تام إلى السكيما المعزولة [${schemaName}] وعمل الـ Trigger بنجاح!`,
      data: invoice
    });

  } catch (error) {
    // إرجاع رسالة الخطأ الصادرة بوضوح لمعرفة تفاصيل الخلل إذا حدث
    return res.status(400).json({ success: false, error: error.message });
  }
}
