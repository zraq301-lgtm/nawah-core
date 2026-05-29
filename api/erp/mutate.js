import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("خطأ حرج: متغيرات بيئة العمل لـ Supabase غير معرفة في إعدادات Vercel!");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // تفعيل إعدادات الـ CORS الكاملة لتأمين استقرار حركة المرور مع الأندرويد
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'استخدم POST' });

  // استقبال المعطيات الديناميكية القادمة من الأندرويد
  const { schema, table, action, data } = req.body;

  // تحديد اسم الجدول ديناميكياً بناءً على طلب الواجهة
  let targetTable = table || (action && action.toLowerCase().replace('add_', '') + 's');
  if (action === 'ADD_PURCHASE_INVOICE') targetTable = 'invoices'; 

  if (!schema || !targetTable || !data) {
    return res.status(400).json({ 
      success: false, 
      error: 'البيانات المرسلة ناقصة. يتطلب النظام: (schema, table, data)' 
    });
  }

  // 📥 تنظيف البيانات وحزمها للتسكين
  const finalPayload = { ...data };

  if (finalPayload.batch_info) {
    finalPayload.batch_id = finalPayload.batch_info.batchId || finalPayload.batch_id;
    delete finalPayload.batch_info;
  }

  try {
    console.log(`🎯 جاري تسكين البيانات مباشرة داخل سكيما الشركة [${schema}] - جدول [${targetTable}]:`, finalPayload);

    // 🚀 المحاولة الأساسية: التوجيه الصريح والمباشر للسكيما المستهدفة لتخطي الكاش تماماً
    const { data: insertResult, error: insertErr } = await supabaseAdmin
      .schema(schema) // التوجيه الإجباري للسكيما المعزولة للشركة
      .from(targetTable) // الجدول المستهدف (مثل invoices)
      .insert([finalPayload]) // حقن المصفوفة
      .select();

    if (insertErr) throw insertErr;

    // الرد بالنجاح وإرجاع السطر الذي تم تسكينه وحفظه
    return res.status(200).json({ 
      success: true, 
      message: `تم تسكين البيانات بنجاح داخل النظام المعزول للشركة [${schema}]`,
      table: targetTable,
      data: Array.isArray(insertResult) ? insertResult[0] : insertResult
    });

  } catch (error) {
    console.warn(`⚠️ فشلت المحاولة المباشرة، جاري تشغيل خطة الإنقاذ عبر محرك الـ SQL البديل...`);
    
    try {
      // 🛡️ خطة الإنقاذ: بناء استعلام نقي وديناميكي للتنفيذ داخل نظام الشركة المعزول في حال تعنت الكاش
      const columns = Object.keys(finalPayload).map(key => `"${key}"`).join(', ');
      const values = Object.values(finalPayload).map(val => {
        if (typeof val === 'number' || typeof val === 'boolean') return val;
        return `'${String(val).replace(/'/g, "''")}'`; // تأمين النص ضد الـ SQL Injection
      }).join(', ');

      const rawSql = `INSERT INTO "${schema}"."${targetTable}" (${columns}) VALUES (${values}) RETURNING *;`;

      // تشغيل الاستعلام المباشر عبر دالة الاستعلامات المدمجة بالسيرفر الأساسي
      const { data: fallbackResult, error: fallbackErr } = await supabaseAdmin
        .rpc('query', { query_string: rawSql });

      if (fallbackErr) throw fallbackErr;

      return res.status(200).json({ 
        success: true, 
        message: `تم التسكين بنجاح عبر محرك الطوارئ في سكيما الشركة [${schema}]`,
        table: targetTable,
        data: fallbackResult
      });

    } catch (finalError) {
      console.error(`❌ فشل التسكين بجميع الطرق في سكيما الشركة [${schema}]:`, finalError);
      return res.status(400).json({ 
        success: false, 
        error: finalError.message || finalError,
        details: "تأكد من اكتمال حفر الجداول في الخلفية وتطابق أسماء الأعمدة تماماً"
      });
    }
  }
}
