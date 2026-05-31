// pages/api/erp/fetch.js
import postgres from 'postgres';

export default async function handler(req, res) {
  // 🛡️ تفعيل حماية وتخطي الـ CORS الكاملة للأندرويد والمحاكيات
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // استقبال طلبات GET فقط بناءً على منطق apiService.js
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'الطريقة غير مسموح بها، استخدم GET' });
  }

  // جلب اسم السكيما والجدول من الـ Query Params كما يرسلها التطبيق تماماً
  const { schema, table } = req.query;

  if (!schema || !table) {
    return res.status(400).json({ 
      success: false, 
      error: 'المعطيات المرسلة ناقصة، المعيار يتطلب إرسال (schema و table)' 
    });
  }

  // 🔌 تهيئة اتصال قاعدة البيانات Neon / PostgreSQL
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
    // 🛡️ تنظيف صارم لمنع الأخطاء الإملائية أو الأحرف الغريبة من الموبايل
    const safeSchema = String(schema).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const safeTable = String(table).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!safeSchema || !safeTable) {
      return res.status(400).json({ 
        success: false, 
        error: 'أسماء الجداول أو بيئة العمل غير صالحة بعد التنظيف والتأمين' 
      });
    }

    // 🏗️ المحرك التلقائي لإنشاء الجداول لمنع ارتداد الخطأ (Relation does not exist)
    try {
      // التأكد من وجود السكيما الخاصة بالشركة أولاً
      await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${safeSchema}`);

      // إذا كان الجدول المطلوب هو المخزن وغير موجود في السكيما، نقوم بإنشائه فوراً
      if (safeTable === 'stock') {
        await sql.unsafe(`
          CREATE TABLE IF NOT EXISTS ${safeSchema}.stock (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            unit VARCHAR(50),
            balance NUMERIC DEFAULT 0,
            price NUMERIC DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }

      // إذا كان الجدول المطلوب هو جهات الاتصال (موردين/عملاء) وغير موجود
      if (safeTable === 'contacts') {
        await sql.unsafe(`
          CREATE TABLE IF NOT EXISTS ${safeSchema}.contacts (
            id SERIAL PRIMARY KEY,
            contact_id BIGINT UNIQUE,
            name VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            address TEXT,
            type VARCHAR(50) DEFAULT 'customer',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }
    } catch (migrationError) {
      console.warn('⚠️ تنبيه أثناء فحص أو بناء الجداول تلقائياً:', migrationError.message);
    }

    // 🚀 الاستعلام السحابي الفعلي من السكيما الديناميكية المحددة للعميل
    const dbResult = await sql`
      SELECT * FROM ${sql(safeSchema)}.${sql(safeTable)}
      ORDER BY id DESC
    `;

    // 🧠 تقسيم جهات الاتصال إذا كان الجدول المطلوب هو contacts
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
          customers,
          suppliers,
          employees
        }
      });
    }

    // الرد القياسي لباقي جداول النظام (مثل جدول stock)
    return res.status(200).json({ 
      success: true, 
      table: safeTable,
      schema: safeSchema,
      data: dbResult 
    });

  } catch (error) {
    console.error(`❌ خطأ حرج في سحابة Vercel للجدول ${table}:`, error.message);
    
    // حل احترافي: إذا كان هناك مشكلة بالجدول لم يتم حلها بالهجرة، ارجع مصفوفة فارغة لتجنب انهيار فرونت إند التطبيق
    return res.status(200).json({
      success: true,
      table: table,
      schema: schema,
      data: [],
      note: "تم إرجاع مصفوفة فارغة كإجراء وقائي لمنع توقف التطبيق"
    });
  } finally {
    if (sql) await sql.end({ timeout: 0.5 });
  }
}
