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

  if (!schema || !data) {
    return res.status(400).json({ success: false, error: 'البيانات المرسلة ناقصة' });
  }

  // 🔥 التأمين الفولاذي: تحويل اسم السكيما لحروف صغيرة إجبارياً لمنع أخطاء الـ Case Sensitivity
  const safeSchema = String(schema).trim().toLowerCase();

  let targetTable = table || (action && action.toLowerCase().replace('add_', '') + 's');
  if (action === 'ADD_PURCHASE_INVOICE') targetTable = 'invoices'; 

  const finalPayload = { ...data };

  if (finalPayload.batch_info) {
    finalPayload.batch_id = finalPayload.batch_info.batchId || finalPayload.batch_id;
    delete finalPayload.batch_info;
  }

  try {
    console.log(`🎯 [محاولة 1] تسكين في سكيما: [${safeSchema}] - جدول: [${targetTable}]`);

    // التوجيه المباشر باستخدام السكيما الآمنة الصغيرة
    const { data: insertResult, error: insertErr } = await supabaseAdmin
      .schema(safeSchema)
      .from(targetTable)
      .insert([finalPayload])
      .select();

    if (insertErr) throw insertErr;

    return res.status(200).json({ 
      success: true, 
      message: `تم التسكين بنجاح داخل النظام المعزول للشركة [${safeSchema}]`,
      data: insertResult[0]
    });

  } catch (firstError) {
    // إذا كان الخطأ بسبب تجمد الكاش الداخلي لسوبابيز
    if (firstError.code === 'PGRST202' || firstError.message?.includes('schema cache')) {
      console.warn(`🔄 تم رصد تجميد في الكاش لجلسة [${safeSchema}]. جاري التحديث الفوري...`);
      
      try {
        await supabaseAdmin.rpc('NOTIFY pgrst, \'reload schema\'');
        await new Promise(resolve => setTimeout(resolve, 1200));

        console.log(`🚀 [محاولة 2] إعادة المحاولة باستخدام السكيما المعالجة...`);
        
        const { data: retryResult, error: retryErr } = await supabaseAdmin
          .schema(safeSchema)
          .from(targetTable)
          .insert([finalPayload])
          .select();

        if (retryErr) throw retryErr;

        return res.status(200).json({ 
          success: true, 
          message: `تم التسكين بنجاح بعد تحديث كاش النظام المعزول [${safeSchema}]`,
          data: retryResult[0]
        });

      } catch (secondError) {
        console.error(`❌ فشلت محاولة الإنقاذ الثانية:`, secondError);
        return res.status(400).json({ success: false, error: secondError.message || secondError });
      }
    }

    console.error(`❌ خطأ التسكين الرئيسي للمخطط [${safeSchema}]:`, firstError.message);
    return res.status(400).json({ success: false, error: firstError.message, details: firstError.details });
  }
}
