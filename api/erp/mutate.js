import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'استخدم POST' });

  const { schema, table, action, data } = req.body;

  if (!schema || !data) {
    return res.status(400).json({ success: false, error: 'البيانات المرسلة ناقصة' });
  }

  const safeSchema = String(schema).trim().toLowerCase();
  let targetTable = table || (action && action.toLowerCase().replace('add_', '') + 's');
  if (action === 'ADD_PURCHASE_INVOICE') targetTable = 'invoices'; 

  const finalPayload = { ...data };

  if (finalPayload.batch_info) {
    finalPayload.batch_id = finalPayload.batch_info.batchId || finalPayload.batch_id;
    delete finalPayload.batch_info;
  }

  try {
    console.log(`🚀 [تشغيل العلاقات الفولاذية] جاري التسكين الديناميكي في: ${safeSchema}.${targetTable}`);

    // 1️⃣ بناء أسماء الأعمدة بشكل آمن
    const columns = Object.keys(finalPayload).map(key => `"${key}"`).join(', ');

    // 2️⃣ بناء وتحضير القيم مع الحفاظ على الـ contact_id القادم من الأندرويد كما هو
    const values = Object.values(finalPayload).map(val => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number' || typeof val === 'boolean') return val;
      return `'${String(val).replace(/'/g, "''")}'`;
    }).join(', ');

    // 3️⃣ 🔥 السر الهندي السحري: 
    // تحويل مسار البحث الافتراضي إلى السكيما الحالية إجبارياً قبل الإدخال لكي ترى الجداول بعضها وتعمل العلاقات والـ Triggers بنجاح!
    const rawSql = `
      SET LOCAL search_path TO "${safeSchema}", public;
      WITH rows AS (
        INSERT INTO "${safeSchema}"."${targetTable}" (${columns}) 
        VALUES (${values}) 
        RETURNING *
      ) 
      SELECT * FROM rows;
    `;
    
    console.log(`📝 الاستعلام الخارق الموجه بموجات العلاقات:`, rawSql);

    // 4️⃣ تمرير الاستعلام الفولاذي للبوابة
    const { data: sqlResult, error: sqlErr } = await supabaseAdmin
      .rpc('exec_sql', { sql_query: rawSql });

    if (sqlErr) throw sqlErr;

    const insertedRow = (Array.isArray(sqlResult) && sqlResult.length > 0) ? sqlResult[0] : sqlResult;

    return res.status(200).json({ 
      success: true, 
      message: `تم حفظ البيانات وتنشيط العلاقات والترجرات بنجاح داخل [${safeSchema}]`,
      data: insertedRow
    });

  } catch (error) {
    console.error(`❌ فشل التسكين وتشغيل العلاقات:`, error.message);
    return res.status(400).json({ 
      success: false, 
      error: error.message,
      details: "تأكد من أن الـ contact_id أو الـ item_id المرسل من الموبايل موجود بالفعل في جدول جهات العميل."
    });
  }
}
