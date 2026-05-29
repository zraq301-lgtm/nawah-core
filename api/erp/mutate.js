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

  // تنظيف الحروف وتحويلها لصغيرة
  const safeSchema = String(schema).trim().toLowerCase();
  let targetTable = table || (action && action.toLowerCase().replace('add_', '') + 's');
  if (action === 'ADD_PURCHASE_INVOICE') targetTable = 'invoices'; 

  const finalPayload = { ...data };
  if (finalPayload.batch_info) {
    finalPayload.batch_id = finalPayload.batch_info.batchId || finalPayload.batch_id;
    delete finalPayload.batch_info;
  }

  try {
    console.log(`🚀 [الحل الفولاذي] تسكين مباشر بالـ SQL النقي في: ${safeSchema}.${targetTable}`);

    // بناء استعلام SQL ديناميكي خارق لقيود الـ Exposed Schemas والكاش
    const columns = Object.keys(finalPayload).map(key => `"${key}"`).join(', ');
    const values = Object.values(finalPayload).map(val => {
      if (typeof val === 'number' || typeof val === 'boolean') return val;
      if (val === null) return 'NULL';
      return `'${String(val).replace(/'/g, "''")}'`; // حماية ضد SQL Injection
    }).join(', ');

    // الاستعلام النقي الموجه مباشرة للسكيما المعزولة
    const rawSql = `INSERT INTO "${safeSchema}"."${targetTable}" (${columns}) VALUES (${values}) RETURNING *;`;

    // استدعاء دالة تشغيل الـ SQL المباشرة في سوبابيز (تأكد من وجود دالة exec_sql أو query لديك في الـ RPC)
    const { data: sqlResult, error: sqlErr } = await supabaseAdmin
      .rpc('exec_sql', { sql_query: rawSql }); // أو اسم دالة الـ rpc المخصصة للـ SQL عندك مثل 'query'

    if (sqlErr) throw sqlErr;

    return res.status(200).json({ 
      success: true, 
      message: `تم التسكين بنجاح قطعي عبر محرك الـ SQL في [${safeSchema}]`,
      data: sqlResult
    });

  } catch (error) {
    console.error(`❌ فشل التسكين بالـ SQL النقي:`, error.message);
    return res.status(400).json({ 
      success: false, 
      error: error.message,
      details: "إذا فشل الـ RPC، يرجى التأكد من إضافة السكيما في Exposed Schemas داخل لوحة تحكم سوبابيز"
    });
  }
}
