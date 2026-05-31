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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'الطريقة غير مسموح بها، استخدم GET' });
  }

  const { schema, table } = req.query;

  if (!schema || !table) {
    return res.status(400).json({ 
      success: false, 
      error: 'المعطيات المرسلة ناقصة، المعيار يتطلب إرسال (schema و table)' 
    });
  }

  // 🔌 تهيئة اتصال قاعدة البيانات واستخدام معايير الحديثة للـ WHATWG URL لمنع التنبيهات
  let sql;
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    sql = postgres({
      host: dbUrl.hostname,
      port: dbUrl.port || 5432,
      database: dbUrl.pathname.replace('/', ''),
      username: dbUrl.username,
      password: dbUrl.password,
      ssl: 'require',
      onnotice: () => {} // 🔕 كتم التنبيهات والإشعارات الداخلية (Notices) لعدم تشتيت المحرك لـ catch
    });
  } catch (urlErr) {
    sql = postgres(process.env.DATABASE_URL, { 
      ssl: 'require',
      onnotice: () => {} // 🔕 كتم التنبيهات هنا أيضاً
    });
  }

  try {
    const safeSchema = String(schema).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const safeTable = String(table).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!safeSchema || !safeTable) {
      return res.status(400).json({ 
        success: false, 
        error: 'أسماء الجداول أو بيئة العمل غير صالحة بعد التنظيف والتأمين' 
      });
    }

    // 🏗️ المحرك التلقائي التأسيسي المعزول داخل بلوك مستقل تماماً
    try {
      await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${safeSchema}`);

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
      // طباعة خطأ التأسيس في الكونسول الخلفي فقط دون مقاطعة طلب العميل
      console.warn('⚠️ تنبيه محرك التأسيس التلقائي:', migrationError.message);
    }

    // 🚀 الاستعلام السحابي الحقيقي لجلب البيانات الفعلية المخزنة
    const dbResult = await sql`
      SELECT * FROM ${sql(safeSchema)}.${sql(safeTable)}
      ORDER BY id DESC
    `;

    // 🧠 تقسيم جهات الاتصال وفرزها ديناميكياً لتغذية الفرونت إند
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

    return res.status(200).json({ 
      success: true, 
      table: safeTable,
      schema: safeSchema,
      data: dbResult 
    });

  } catch (error) {
    console.error(`❌ خطأ حرج حقيقي أثناء معالجة جدول ${table}:`, error.message);
    
    return res.status(500).json({
      success: false,
      error: "حدث خطأ في السيرفر أثناء معالجة البيانات، يرجى المحاولة لاحقاً"
    });
  } finally {
    if (sql) await sql.end({ timeout: 0.5 });
  }
}
