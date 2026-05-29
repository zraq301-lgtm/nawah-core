import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("خطأ حرج: متغيرات بيئة العمل لـ Supabase غير معرفة!");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'استخدم POST' });

  const { schema, table, action, data } = req.body;

  let targetTable = table || (action && action.toLowerCase().replace('add_', '') + 's');
  if (action === 'ADD_PURCHASE_INVOICE') targetTable = 'invoices'; // توجيه دقيق لجدول الفواتير المستهدف

  if (!targetTable || !data) {
    return res.status(400).json({ success: false, error: 'البيانات المرسلة ناقصة' });
  }

  // 🛡️ التعامل الذكي مع خطأ السكيما غير المعرفة (Exposed Schema)
  // إذا كانت السكيما تبدأ بـ tenant_، سنقوم بالحفظ في السكيما الافتراضية المتاحة public
  // وحقن اسم السكيما كمعرف للمؤسسة (tenant_id) لضمان عدم اختلاط البيانات وسهولة الفلترة
  let activeSchema = 'public'; 
  const cleanedData = {};

  // تنظيف الحقول وتحويلها إلى snake_case
  Object.keys(data).forEach(key => {
    const databaseKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    cleanedData[databaseKey] = data[key];
  });

  if (cleanedData.batch_info) {
    cleanedData.batch_id = cleanedData.batch_info.batchId || cleanedData.batch_id;
    delete cleanedData.batch_info;
  }

  // 🔥 ميكانيزم الإنقاذ: إذا كانت المؤسسة ممررة كسكيما معزولة والسيرفر لا يراها،
  // نضعها داخل حقل tenant_id في جدول public.invoices (تأكد من وجود هذا الحقل بالجدول إن أمكن)
  if (schema && schema !== 'public') {
    cleanedData.tenant_id = schema; 
    
    // 💡 ملحوظة: إذا كنت قد قمت بتهيئة Exposed Schemas في سوبابيز بالفعل وتريد الحفظ في السكيما المعزولة حتماً،
    // فقم بإلغاء تعليق السطر التالي:
    // activeSchema = schema; 
  }

  try {
    console.log(`🚀 محاولة حفر آمنة في [${activeSchema}].[${targetTable}]:`, cleanedData);

    const { data: dbResult, error: dbErr } = await supabaseAdmin
      .schema(activeSchema)
      .from(targetTable)
      .insert([cleanedData])
      .select();

    if (dbErr) throw dbErr;

    return res.status(200).json({ 
      success: true, 
      message: `تم حفر البيانات بنجاح في جدول ${targetTable}`,
      data: dbResult && dbResult.length > 0 ? dbResult[0] : null 
    });

  } catch (error) {
    console.error(`❌ خطأ أثناء الحفظ:`, error);
    
    // إذا رمى السيرفر خطأ السكيما مرة أخرى، نقوم بمحاولة أخيرة إجبارية في سكيما public الصريحة
    if (error.message && error.message.includes('Invalid schema')) {
      try {
        console.log(`🔄 محاولة إنقاذ اضطرارية في السكيما العامة public...`);
        const { data: retryResult, error: retryErr } = await supabaseAdmin
          .schema('public')
          .from(targetTable)
          .insert([cleanedData])
          .select();

        if (retryErr) throw retryErr;

        return res.status(200).json({ 
          success: true, 
          message: `تم الحفظ عبر محرك الإنقاذ في السكيما العامة`,
          data: retryResult && retryResult.length > 0 ? retryResult[0] : null 
        });
      } catch (retryFetchError) {
        return res.status(400).json({ success: false, error: retryFetchError.message });
      }
    }

    return res.status(400).json({ 
      success: false, 
      error: error.message || error,
      code: error.code
    });
  }
}
