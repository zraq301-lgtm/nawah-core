import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// دالة مساعدة لعمل تأخير زمني بالملي ثانية
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

  try {
    // ---------------------------------------------------------------
    // 1️⃣ التحقق من وجود السكيما في قاعدة البيانات
    // ---------------------------------------------------------------
    let isExist = false;
    try {
      const { data: checkTables } = await supabase
        .from('information_schema.schemata')
        .select('schema_name')
        .eq('schema_name', schemaName)
        .maybeSingle();
      
      isExist = !!checkTables;
    } catch (e) {
      isExist = false;
    }

    // ---------------------------------------------------------------
    // 2️⃣ إذا كانت السكيما جديدة، يتم إنشاؤها ومنحها وقتاً كافياً للبناء
    // ---------------------------------------------------------------
    if (!isExist) {
      console.log(`يتم إنشاء السكيما ${schemaName} الآن...`);
      
      const { error: createSchemaError } = await supabase
        .rpc('create_new_client_erp', { client_schema_name: schemaName });

      if (createSchemaError) {
        throw new Error(`فشل إنشاء السكيما تلقائياً: ${createSchemaError.message}`);
      }
      
      // ⏱️ زيادة وقت الانتظار إلى 2000 ملي ثانية (ثانيتين) لضمان اكتمال بناء كافة الجداول والـ Triggers في الـ Postgres
      await delay(2000);
    }

    // تجهيز البيانات وتحويل المعرفات لأرقام
    const targetContactId = data.contact_id ? Number(data.contact_id) : 1;
    const targetAccountId = data.account_id ? Number(data.account_id) : 1;
    const grossAmount = Number(data.gross_amount || 0);
    const discount = Number(data.discount || 0);
    const taxAmount = Number(data.tax_amount || 0);
    const netAmount = Number(data.net_amount || (grossAmount - discount + taxAmount));
    const paidAmount = Number(data.paid_amount || 0);
    const remainingAmount = netAmount - paidAmount;

    // ---------------------------------------------------------------
    // 3️⃣ تنفيذ عمليات الإدخال مع آلية إعادة المحاولة (Retry) لتفادي الكاش
    // ---------------------------------------------------------------
    let invoice = null;
    let attempts = 0;
    const maxAttempts = 3; // محاولة الإدخال حتى 3 مرات في حال وجود تأخر في استجابة الجداول الجديدة

    while (attempts < maxAttempts) {
      try {
        attempts++;

        // أ- تأمين العميل (Upsert)
        await supabase
          .schema(schemaName)
          .from('contacts')
          .upsert(
            { id: targetContactId, name: data.contact_name || 'عميل نقدي افتراضي', type: 'customer' },
            { onConflict: 'id' }
          );

        // ب- تأمين الخزينة (Upsert)
        await supabase
          .schema(schemaName)
          .from('accounts')
          .upsert(
            { id: targetAccountId, account_name: 'الخزينة الرئيسية', account_type: 'cash' },
            { onConflict: 'id' }
          );

        // جـ- إدخال الفاتورة الرئيسية
        const { data: invData, error: invError } = await supabase
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
        
        invoice = invData; // تم الإدخال بنجاح، نكسر الحلقة
        break;

      } catch (error) {
        console.warn(`المحاولة رقم ${attempts} فشلت بسبب عدم جاهزية الجداول. جاري إعادة المحاولة...`);
        if (attempts >= maxAttempts) {
          throw new Error(`تعذر الحفظ بعد إنشاء السكيما بسبب تأخر الـ Postgres Cache: ${error.message}`);
        }
        // الانتظار ثانية إضافية قبل إعادة المحاولة التالية
        await delay(1500);
      }
    }

    // ---------------------------------------------------------------
    // 4️⃣ إدخال تفاصيل الأصناف بعد نجاح الفاتورة
    // ---------------------------------------------------------------
    const itemsArray = data.items || data.invoice_items || [];
    if (itemsArray.length > 0) {
      const preparedItems = [];
      
      for (const item of itemsArray) {
        const currentItemId = item.item_id || item.id || 1;

        await supabase
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

      if (itemsError) throw new Error(`خطأ أثناء إدخال الأصناف: ${itemsError.message}`);
    }

    // ---------------------------------------------------------------
    // 5️⃣ ترحيل النقدية للـ الخزينة
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
          description: data.description || `دفعة نقدية للفاتورة رقم: ${data.invoice_number}`
        }]);

      if (cashError) throw new Error(`خطأ أثناء ترحيل النقدية: ${cashError.message}`);
    }

    return res.status(200).json({
      success: true,
      message: `تم إنشاء السكيما وحفظ الفاتورة بنجاح تام داخل [${schemaName}]`,
      data: invoice
    });

  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
}
