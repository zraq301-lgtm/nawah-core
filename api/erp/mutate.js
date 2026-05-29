import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // تفعيل إعدادات الـ CORS الكاملة للأندرويد
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'استخدم POST' });

  const { schema, table, action, data } = req.body;

  if (!schema || !data) {
    return res.status(400).json({ success: false, error: 'البيانات المرسلة ناقصة' });
  }

  // تنظيف وتأمين الحروف
  const safeSchema = String(schema).trim().toLowerCase();
  let targetTable = table || (action && action.toLowerCase().replace('add_', '') + 's');
  if (action === 'ADD_PURCHASE_INVOICE') targetTable = 'invoices'; 

  const finalPayload = { ...data };
  if (finalPayload.batch_info) {
    finalPayload.batch_id = finalPayload.batch_info.batchId || finalPayload.batch_id;
    delete finalPayload.batch_info;
  }

  try {
    console.log(`🚀 [معالجة الـ Syntax] تحضير الاستعلام لـ ${safeSchema}.${targetTable}`);

    // 1️⃣ بناء أسماء الأعمدة بشكل آمن ومحاط بأقواس مزدوجة
    const columns = Object.keys(finalPayload).map(key => `"${key}"`).join(', ');

    // 2️⃣ تحضير وتغليف القيم بشكل صارم لمنع الأخطاء العشوائية للنصوص والتواريخ
    const values = Object.values(finalPayload).map(val => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number' || typeof val === 'boolean') return val;
      
      // تأمين الحقول النصية والتواريخ ضد الـ SQL Injection والرموز الخاصة
      const safeString = String(val).replace(/'/g, "''");
      return `'${safeString}'`;
    }).join(', ');

    // 3️⃣ 🔥 الصياغة الاحترافية المعدلة (تغليف الـ INSERT داخل تعبير SELECT متوافق مع البوابة)
    const rawSql = `WITH rows AS (INSERT INTO "${safeSchema}"."${targetTable}" (${columns}) VALUES (${values}) RETURNING *) SELECT * FROM rows`;
    
    console.log(`📝 الاستعلام النقي النهائي الجاهز للحقن البنائي:`, rawSql);

    // 4️⃣ استدعاء الدالة المساعدة الخارقة
    const { data: sqlResult, error: sqlErr } = await supabaseAdmin
      .rpc('exec_sql', { sql_query: rawSql });

    if (sqlErr) throw sqlErr;

    // الدالة تعيد النتيجة داخل مصفوفة JSON، نسحب السطر الأول والأحدث
    const insertedRow = (Array.isArray(sqlResult) && sqlResult.length > 0) ? sqlResult[0] : sqlResult;

    return res.status(200).json({ 
      success: true, 
      message: `تم التسكين وحفظ البيانات بنجاح في السكيما المعزولة [${safeSchema}]`,
      data: insertedRow
    });

  } catch (error) {
    console.error(`❌ فشل التسكين بالـ SQL النقي:`, error.message);
    return res.status(400).json({ 
      success: false, 
      error: error.message,
      details: "تأكد من مطابقة أسماء حقول الكائن في الأندرويد مع أسماء أعمدة الجدول في الداتابيز."
    });
  }
}
