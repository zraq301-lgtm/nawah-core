// pages/api/data/get.js
import postgres from 'postgres';

export default async function handler(req, res) {
  // 🛡️ تفعيل حماية وتخطي الـ CORS الكاملة للأندرويد والمحاكيات
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // السماح بطلبات GET فقط لعمليات جلب البيانات
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'الطريقة غير مسموح بها، استخدم GET' });
  }

  // المعيار الموحد: جلب اسم السكيما والجدول مباشرة من الـ Query Params
  const { schema, table } = req.query;

  if (!schema || !table) {
    return res.status(400).json({ 
      success: false, 
      error: 'المعطيات المرسلة ناقصة، المعيار يتطلب إرسال (schema و table)' 
    });
  }

  // 🔌 تفكيك الرابط بشكل آمن لحل تحذير Node.js ومنع الثغرات
  let sql;
  try {
    const parsedUrl = new URL(process.env.DATABASE_URL);
    sql = postgres({
      host: parsedUrl.hostname,
      port: parsedUrl.port || 5432,
      database: parsedUrl.pathname.replace('/', ''),
      username: parsedUrl.username,
      password: parsedUrl.password,
      ssl: 'require'
    });
  } catch (urlErr) {
    sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
  }

  try {
    // 🛡️ تنظيف صارم لأسماء السكيما والجداول لمنع الفراغات أو الأحرف الغريبة القادمة من الهاتف
    const safeSchema = String(schema).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const safeTable = String(table).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    // التحقق الفولاذي المحدث بعد التنظيف لضمان عدم تمرير قيم فارغة أو خبيثة
    if (!safeSchema || !safeTable) {
      return res.status(400).json({ 
        success: false, 
        error: 'أسماء الجداول أو بيئة العمل غير صالحة بعد التنظيف والتأمين' 
      });
    }

    // 🚀 الاستعلام الديناميكي الآمن باستخدام الـ Identifiers لـ postgres.js
    const dbResult = await sql`
      SELECT * FROM ${sql(safeSchema)}.${sql(safeTable)}
      ORDER BY id DESC
    `;

    // 🧠 المحرك الذكي للتصنيف: إذا كان الجدول المطلوب هو جدول الجهات والموردين الموحد
    if (safeTable === 'contacts') {
      const customers = dbResult.filter(item => item.type === 'customer' || item.type === 'general');
      const suppliers = dbResult.filter(item => item.type === 'supplier');
      const employees = dbResult.filter(item => item.type === 'employee');

      return res.status(200).json({ 
        success: true, 
        table: safeTable,
        schema: safeSchema,
        data: dbResult, 
        categorized: {  
          customers: customers,
          suppliers: suppliers,
          employees: employees
        }
      });
    }

    // الرد الطبيعي الافتراضي لباقي جداول النظام كالمخزن والفواتير
    return res.status(200).json({ 
      success: true, 
      table: safeTable,
      schema: safeSchema,
      data: dbResult 
    });

  } catch (error) {
    console.error(`❌ خطأ الباك إند أثناء جلب البيانات من جدول ${table}:`, error.message);
    
    if (error.message.includes('does not exist')) {
      return res.status(404).json({
        success: false,
        error: `الجدول (${table}) غير موجود حالياً في بيئة العمل`
      });
    }

    return res.status(400).json({ 
      success: false, 
      error: "فشل استدعاء البيانات من السيرفر السحابي، يرجى إعادة المحاولة" 
    });
  } finally {
    if (sql) await sql.end({ timeout: 0.5 });
  }
}
