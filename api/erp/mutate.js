import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("خطأ حرج: متغيرات بيئة العمل لـ Supabase غير معرفة!");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // تفعيل إعدادات الـ CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'استخدم POST' });

  const { schema, table, action, data } = req.body;

  let targetTable = table || (action && action.toLowerCase().replace('add_', '') + 's');
  if (action === 'ADD_PURCHASE_INVOICE') targetTable = 'invoices'; 

  if (!schema || !targetTable || !data) {
    return res.status(400).json({ success: false, error: 'البيانات المرسلة ناقصة' });
  }

  const finalPayload = { ...data };

  if (finalPayload.batch_info) {
    finalPayload.batch_id = finalPayload.batch_info.batchId || finalPayload.batch_id;
    delete finalPayload.batch_info;
  }

  try {
    console.log(`🎯 [محاولة 1] تسكين في سكيما: [${schema}] - جدول: [${targetTable}]`);

    // المحاولة القياسية المباشرة
    const { data: insertResult, error: insertErr } = await supabaseAdmin
      .schema(schema)
      .from(targetTable)
      .insert([finalPayload])
      .select();

    if (insertErr) throw insertErr;

    return res.status(200).json({ 
      success: true, 
      message: `تم التسكين بنجاح داخل النظام المعزول للشركة [${schema}]`,
      data: insertResult[0]
    });

  } catch (firstError) {
    // 🔄 إذا كان الخطأ بسبب الكاش PGRST202، نقوم بعمل Reload للكاش فوراً
    if (firstError.code === 'PGRST202' || firstError.message?.includes('schema cache')) {
      console.warn(`🔄 تم رصد تجميد في الكاش. جاري إجبار سوبابيز على تحديث الـ Schema Cache فوراً...`);
      
      try {
        // إطلاق أمر إعادة تحميل الكاش الداخلي لسوبابيز
        await supabaseAdmin.rpc('NOTIFY pgrst, \'reload schema\'');
        
        // انتظار لمدة ثانية واحدة ليتنفس السيرفر ويستوعب الجداول الجديدة
        await new Promise(resolve => setTimeout(resolve, 1200));

        console.log(`🚀 [محاولة 2] إعادة المحاولة بعد تحديث الكاش بنجاح...`);
        
        // إعادة المحاولة الفولاذية بعد تحديث الكاش
        const { data: retryResult, error: retryErr } = await supabaseAdmin
          .schema(schema)
          .from(targetTable)
          .insert([finalPayload])
          .select();

        if (retryErr) throw retryErr;

        return res.status(200).json({ 
          success: true, 
          message: `تم التسكين بنجاح بعد تحديث كاش النظام المعزول [${schema}]`,
          data: retryResult[0]
        });

      } catch (secondError) {
        console.error(`❌ فشلت محاولة الإنقاذ الثانية أيضاً:`, secondError);
        return res.status(400).json({ 
          success: false, 
          error: secondError.message || secondError,
          details: "تأكد من أن السكيما والجداول اكتمل حفرها بالخلفية تماماً وأن الأعمدة متطابقة."
        });
      }
    }

    // في حال وجود خطأ آخر غير الكاش (مثل خطأ في أسماء الأعمدة)
    return res.status(400).json({ success: false, error: firstError.message, details: firstError.details });
  }
}
