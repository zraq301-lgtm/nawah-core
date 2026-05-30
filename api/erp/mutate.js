import { createClient } from '@supabase/supabase-js';

// دالة مساعدة للانتظار الزمني المريح للـ Database
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

  // 1️⃣ إنشاء العميل المبدئي للتحقق والإنشاء
  let currentSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // التحقق المباشر من جدول السكيمات الافتراضي للـ Postgres
    const { data: checkTables, error: checkError } = await currentSupabase
      .from('information_schema.schemata')
      .select('schema_name')
      .eq('schema_name', schemaName)
      .maybeSingle();

    const isExist = !!checkTables && !checkError;

    // 2️⃣ إذا كانت السكيما غير موجودة، ننشئها ونكسر كاش الاتصال
    if (!isExist) {
      console.log(`السكيما ${schemaName} غير موجودة، يتم بناؤها الآن...`);
      
      const { error: createSchemaError } = await currentSupabase
        .rpc('create_new_client_erp', { client_schema_name: schemaName });

      if (createSchemaError) {
        throw new Error(`فشل إنشاء السكيما برمجياً: ${createSchemaError.message}`);
      }
      
      // وقت انتظار كافٍ لاستقرار السكيما والجداول والروابط والـ Triggers في الـ Postgres
      await delay(2500);

      // 🔥 الخطوة السحرية: إعادة تهيئة العميل لكسر كاش السكيمات في الاتصال الحالي تماماً
      currentSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
      });
    }

    // تجهيز وتنظيف البيانات الرقمية
    const targetContactId = data.contact_id ? Number(data.contact_id) : 1;
    const targetAccountId = data.account_id ? Number(data.account_id) : 1;
    const grossAmount = Number(data.gross_amount || 0);
    const discount = Number(data.discount || 0);
    const taxAmount = Number(data.tax_amount || 0);
    const netAmount = Number(data.net_amount || (grossAmount - discount + taxAmount));
    const paidAmount = Number(data.paid_amount || 0);
    const remainingAmount = netAmount - paidAmount;

    // 3️⃣ تنفيذ العمليات مع آلية المحاولات المتكررة المضادة لبطء استجابة السيرفرات السحابية
    let invoice = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;

        // أ- تأمين الحساب والعميل داخل السكيما الجديدة عبر الـ Upsert
        const { error: contactError } = await currentSupabase
          .schema(schemaName)
          .from('contacts')
          .upsert(
            { id: targetContactId, name: data.contact_name || 'عميل نقدي افتراضي', type: 'customer' },
            { onConflict: 'id' }
          );
        if (contactError) throw contactError;

        const { error: accountError } = await currentSupabase
          .schema(schemaName)
          .from('accounts')
          .upsert(
            { id: targetAccountId, account_name: 'الخزينة الرئيسية', account_type: 'cash' },
            { onConflict: 'id' }
          );
        if (accountError) throw accountError;

        // ب- إدخال رأس الفاتورة
        const { data: invData, error: invError } = await currentSupabase
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

        if (invError) throw invError;
        
        invoice = invData;
        break; // نجحت العملية، اخرج من حلقة المحاولات

      } catch (retryError) {
        console.warn(`المحاولة رقم ${attempts} تعثرت. جاري التكرار بعد قليل...`);
        if (attempts >= maxAttempts) {
          throw new Error(`خطأ استقرار الهيكل السحابي: ${retryError.message}`);
        }
        await delay(1500); // انتظار إضافي للسماح للـ Postgres Cache بالتحديث
      }
    }

    // 4️⃣ إدخال الأصناف التفصيلية للفاتورة
    const itemsArray = data.items || data.invoice_items || [];
    if (itemsArray.length > 0) {
      const preparedItems = [];
      
      for (const item of itemsArray) {
        const currentItemId = item.item_id || item.id || 1;

        // الحفاظ على وجود الصنف متزامناً
        const { error: itemUpsertError } = await currentSupabase
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

        if (itemUpsertError) throw new Error(`خطأ تهيئة الصنف: ${itemUpsertError.message}`);

        preparedItems.push({
          invoice_id: invoice.id,
          item_id: Number(currentItemId),
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || item.price || 0)
        });
      }

      const { error: itemsError } = await currentSupabase
        .schema(schemaName)
        .from('invoice_items')
        .insert(preparedItems);

      if (itemsError) throw new Error(`خطأ تفاصيل الأصناف: ${itemsError.message}`);
    }

    // 5️⃣ إدخال حركة ترحيل النقدية التلقائية
    if (paidAmount > 0) {
      const { error: cashError } = await currentSupabase
        .schema(schemaName)
        .from('cash_transactions')
        .insert([{
          account_id: targetAccountId,
          flow_type: data.invoice_type === 'purchase' ? 'out' : 'in',
          amount: paidAmount,
          invoice_id: invoice.id,
          description: data.description || `دفعة نقدية للفاتورة رقم: ${data.invoice_number}`
        }]);

      if (cashError) throw new Error(`خطأ ترحيل الخزينة المالي: ${cashError.message}`);
    }

    return res.status(200).json({
      success: true,
      message: `تم ترحيل وحفظ الفاتورة بالكامل داخل السكيما المستقرة [${schemaName}]`,
      data: invoice
    });

  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
}
