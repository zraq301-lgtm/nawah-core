import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  const { schema, data } = req.body; 
  // تنظيف اسم السكيما تماماً وتحويله لحروف صغيرة ليتوافق مع Postgres
  const schemaName = String(schema).trim().toLowerCase(); 

  if (!schemaName) {
    return res.status(400).json({ success: false, error: "اسم الـ Schema مطلوب" });
  }

  try {
    // ---------------------------------------------------------------
    // 🛡️ خطوة الحماية الذهبية: التحقق من وجود السكيما في قاعدة البيانات
    // ---------------------------------------------------------------
    const { data: schemaExists, error: schemaCheckError } = await supabase
      .rpc('check_if_schema_exists', { schema_to_check: schemaName });

    // ملاحظة: إذا لم تكن دالة check_if_schema_exists منشأة في قاعدة بياناتك (في الـ public)
    // يمكنك تنفيذ هذا الاستعلام البديل عبر الاستعلام عن الجداول الافتراضية للـ Postgres:
    let isExist = schemaExists;
    
    if (schemaCheckError || schemaExists === null) {
      // استعلام بديل مباشر في حال عدم وجود الـ rpc المخصص
      const { data: checkTables } = await supabase
        .from('information_schema.schemata')
        .select('schema_name')
        .eq('schema_name', schemaName)
        .maybeSingle();
      
      isExist = !!checkTables;
    }

    // ---------------------------------------------------------------
    // 🚀 إذا كانت السكيما غير موجودة (Invalid schema)، قم بإنشائها فوراً!
    // ---------------------------------------------------------------
    if (!isExist) {
      console.log(`السكيما ${schemaName} غير موجودة. يتم إنشاؤها الآن تلقائياً...`);
      
      // استدعاء دالة الـ SQL التي أرسلتها لي بالكامل لتبني الجداول والـ Triggers للعميل
      const { error: createSchemaError } = await supabase
        .rpc('create_new_client_erp', { client_schema_name: schemaName });

      if (createSchemaError) {
        throw new Error(`فشل إنشاء السكيما تلقائياً: ${createSchemaError.message}`);
      }
      
      // تأخير بسيط بالملي ثانية للتأكد من إنهاء الـ Postgres لبناء الجداول والروابط
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // ---------------------------------------------------------------
    // تجميع البيانات والتأكد من تحويل المعرفات لأرقام
    // ---------------------------------------------------------------
    const targetContactId = data.contact_id ? Number(data.contact_id) : 1;
    const targetAccountId = data.account_id ? Number(data.account_id) : 1;

    // 1️⃣ تأمين وجود العميل داخل السكيما (Upsert)
    const { error: contactError } = await supabase
      .schema(schemaName)
      .from('contacts')
      .upsert(
        { id: targetContactId, name: data.contact_name || 'عميل نقدي افتراضي', type: 'customer' },
        { onConflict: 'id' }
      );

    if (contactError) throw new Error(`خطأ في التحقق من وجود العميل: ${contactError.message}`);

    // 2️⃣ تأمين وجود الحساب/الخزينة داخل السكيما (Upsert)
    const { error: accountError } = await supabase
      .schema(schemaName)
      .from('accounts')
      .upsert(
        { id: targetAccountId, account_name: 'الخزينة الرئيسية', account_type: 'cash' },
        { onConflict: 'id' }
      );

    if (accountError) throw new Error(`خطأ في التحقق من وجود الخزينة: ${accountError.message}`);

    // 3️⃣ حساب قيم الفاتورة بدقة
    const grossAmount = Number(data.gross_amount || 0);
    const discount = Number(data.discount || 0);
    const taxAmount = Number(data.tax_amount || 0);
    const netAmount = Number(data.net_amount || (grossAmount - discount + taxAmount));
    const paidAmount = Number(data.paid_amount || 0);
    const remainingAmount = netAmount - paidAmount;

    // 4️⃣ إدخال الفاتورة الرئيسية
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

    // 5️⃣ تفنيد وإدخال عناصر الفاتورة
    const itemsArray = data.items || data.invoice_items || [];
    if (itemsArray.length > 0) {
      const preparedItems = [];
      
      for (const item of itemsArray) {
        const currentItemId = item.item_id || item.id || 1;

        // عمل Upsert للصنف في جدول items التابع للسكيما لمنع تعارض الـ Foreign Key
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

        if (itemUpsertError) throw new Error(`خطأ في تهيئة الصنف رقم ${currentItemId}: ${itemUpsertError.message}`);

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

      if (itemsError) throw new Error(`خطأ أثناء إدخال تفاصيل الأصناف: ${itemsError.message}`);
    }

    // 6️⃣ ترحيل النقدية التلقائي للـ الخزينة
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

      if (cashError) throw new Error(`خطأ أثناء ترحيل النقدية: ${cashError.message}`);
    }

    // استجابة نهائية ناجحة
    return res.status(200).json({
      success: true,
      message: `تم الحفظ والترحيل بنجاح تام داخل السكيما [${schemaName}]`,
      data: invoice
    });

  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
}
