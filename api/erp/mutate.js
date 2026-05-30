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
  
  // 🔥 تحويل الاسم قسراً لحروف صغيرة لحل مشكلة السجلات تماماً
  const schemaName = String(schema).trim().toLowerCase(); 

  if (!schemaName || schemaName === 'undefined' || schemaName === 'null') {
    return res.status(400).json({ success: false, error: "اسم الـ Schema غير صالح أو مفقود" });
  }

  // 1️⃣ إنشاء اتصال أولي بـ Supabase
  let currentSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  try {
    // التحقق الفعلي من الـ Postgres مباشرة للتأكد من وجود السكيما بحروفها الصغيرة
    const { data: checkTables, error: checkError } = await currentSupabase
      .from('information_schema.schemata')
      .select('schema_name')
      .eq('schema_name', schemaName)
      .maybeSingle();

    const isExist = !!checkTables && !checkError;

    // 2️⃣ إذا كانت السكيما غير موجودة فعلياً بالحروف الصغيرة، يتم بناؤها فوراً
    if (!isExist) {
      console.log(`السكيما [${schemaName}] غير موجودة في النظام. يتم تهيئتها الآن...`);
      
      const { error: createSchemaError } = await currentSupabase
        .rpc('create_new_client_erp', { client_schema_name: schemaName });

      if (createSchemaError) {
        throw new Error(`فشل إنشاء السكيما تلقائياً: ${createSchemaError.message}`);
      }
      
      // انتظار ثابت ومريح لإنهاء الـ Postgres بناء الجداول والـ Triggers
      await delay(3000);

      // 🔥 تجديد العميل كلياً لضمان سحب الـ Schemas الجديدة من السيرفر بدون كاش قديم
      currentSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
      });
    }

    // تنظيف الحقول الرقمية لمنع أخطاء الـ Data Type (400)
    const targetContactId = data.contact_id ? Number(data.contact_id) : 1;
    const targetAccountId = data.account_id ? Number(data.account_id) : 1;
    const grossAmount = Number(data.gross_amount || 0);
    const discount = Number(data.discount || 0);
    const taxAmount = Number(data.tax_amount || 0);
    const netAmount = Number(data.net_amount || (grossAmount - discount + taxAmount));
    const paidAmount = Number(data.paid_amount || 0);
    const remainingAmount = netAmount - paidAmount;

    // 3️⃣ ترحيل رأس الفاتورة والبيانات الأساسية مع المحاولات الذكية
    let invoice = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;

        // أمن العميل والحساب أولاً داخل الـ Schema الموحد
        await currentSupabase.schema(schemaName).from('contacts').upsert(
          { id: targetContactId, name: data.contact_name || 'عميل افتراضي', type: 'customer' },
          { onConflict: 'id' }
        );

        await currentSupabase.schema(schemaName).from('accounts').upsert(
          { id: targetAccountId, account_name: 'الخزينة الرئيسية', account_type: 'cash' },
          { onConflict: 'id' }
        );

        // إدخال الفاتورة
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
        break; // نجحت العملية بنجاح! اخرج من الـ Retry Loop

      } catch (retryError) {
        console.warn(`فشلت محاولة الإدخال رقم ${attempts}، جاري الانتظار لإعادة المحاولة...`);
        if (attempts >= maxAttempts) {
          throw new Error(`خطأ استقرار الهيكل: السكيما [${schemaName}] لم تستجب للإدخال: ${retryError.message}`);
        }
        await delay(2000); // زيادة وقت الانتظار بين المحاولات لتحديث الكاش السحابي
      }
    }

    // 4️⃣ إدخال تفاصيل الأصناف (invoice_items)
    const itemsArray = data.items || data.invoice_items || [];
    if (itemsArray.length > 0) {
      const preparedItems = [];
      
      for (const item of itemsArray) {
        const currentItemId = item.item_id || item.id || 1;

        // مزامنة وجود الصنف لتجنب كسر الـ Foreign Key
        await currentSupabase.schema(schemaName).from('items').upsert(
          { 
            id: Number(currentItemId), 
            name: item.name || 'صنف افتراضي', 
            item_type: 'product',
            barcode: item.barcode || `BAR-${currentItemId}-${Date.now()}`
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

      const { error: itemsError } = await currentSupabase
        .schema(schemaName)
        .from('invoice_items')
        .insert(preparedItems);

      if (itemsError) throw new Error(`خطأ في تفاصيل الأصناف: ${itemsError.message}`);
    }

    // 5️⃣ ترحيل السند المالي للخزينة (cash_transactions)
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

      if (cashError) throw new Error(`خطأ في ترحيل النقدية للشركة: ${cashError.message}`);
    }

    return res.status(200).json({
      success: true,
      message: `تم ترحيل وحفظ الفاتورة بنجاح وثبات كامل داخل [${schemaName}]`,
      data: invoice
    });

  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
}
