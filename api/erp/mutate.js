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
    console.log(`🚀 [تنشيط مسار العلاقات] جاري التسكين الآمن في: ${safeSchema}.${targetTable}`);

    // 1️⃣ بناء أسماء الأعمدة
    const columns = Object.keys(finalPayload).map(key => `"${key}"`).join(', ');

    // 2️⃣ بناء وتحضير القيم
    const values = Object.values(finalPayload).map(val => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number' || typeof val === 'boolean') return val;
      return `'${String(val).replace(/'/g, "''")}'`;
    }).join(', ');

    // 3️⃣ 🔥 الاستعلام الفولاذي المطور:
    // نستخدم set_config لضبط الـ search_path بشكل مدمج (Inline) يتوافق مع الدالة 100%
    const rawSql = `
      WITH set_path AS (
        SELECT set_config('search_path', '${safeSchema}, public', true)
      ),
      rows AS (
        INSERT INTO "${safeSchema}"."${targetTable}" (${columns}) 
        VALUES (${values}) 
        RETURNING *
      ) 
      SELECT rows.* FROM rows, set_path
    `;
    
    console.log(`📝 الاستعلام النقي المدمج والجاهز للحقن:`, rawSql);

    // 4️⃣ تمرير الاستعلام النظيف للبوابة
    const { data: sqlResult, error: sqlErr } = await supabaseAdmin
      .rpc('exec_sql', { sql_query: rawSql });

    if (sqlErr) throw sqlErr;

    const insertedRow = (Array.isArray(sqlResult) && sqlResult.length > 0) ? sqlResult[0] : sqlResult;

    return res.status(200).json({ 
      success: true, 
      message: `تم حفظ الفاتورة وتنشيط العلاقات والترجرات بنجاح كامل داخل [${safeSchema}]`,
      data: insertedRow
    });

  } catch (error) {
    console.error(`❌ فشل التسكين وتشغيل العلاقات:`, error.message);
    return res.status(400).json({ 
      success: false, 
      error: error.message,
      details: "تأكد من صحة البيانات المرسلة وأن الـ contact_id موجود في جدول العلاقات الحالية للعميل."
    });
  }
}
