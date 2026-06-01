// pages/api/erp/fetch.js
import postgres from 'postgres';

export default async function handler(req, res) {
  // 🛡️ تفعيل حماية وتخطي الـ CORS الكاملة لتطبيقات الموبايل (Capacitor) والمحاكيات
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'الطريقة غير مسموح بها، استخدم GET' });
  }

  let { schema, table } = req.query;

  if (!schema || !table) {
    return res.status(400).json({ 
      success: false, 
      error: 'المعطيات المرسلة ناقصة، يتطلب إرسال (schema و table)' 
    });
  }

  // 🔌 تهيئة اتصال قاعدة بيانات Neon مع تأمين تدوير الاتصالات (Connection Pooling)
  let sql;
  try {
    sql = postgres(process.env.DATABASE_URL, { 
      ssl: 'require',
      max: 10, // الحد الأقصى للاتصالات المتزامنة لمنع تعليق السيرفر
      idle_timeout: 20, // إغلاق الاتصالات الخاملة بعد 20 ثانية
      onnotice: () => {} // 🔕 كتم التنبيهات والإشعارات الداخلية لـ Postgres
    });
  } catch (dbErr) {
    console.error('❌ فشل تأسيس الاتصال بقاعدة البيانات لـ Neon:', dbErr.message);
    return res.status(500).json({ success: false, error: 'فشل الاتصال الخارجي بقاعدة البيانات' });
  }

  try {
    // تنظيف الحقول وتأمينها ضد الـ SQL Injection
    const safeSchema = String(schema).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    let safeTable = String(table).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    // 🔄 الجسر الذكي لـ زاد الخير: لو الفرونت إند طلب جدول stock، نقوم بتحويله لـ items ليتطابق مع السكيما
    if (safeTable === 'stock') {
      safeTable = 'items';
    }

    if (!safeSchema || !safeTable) {
      return res.status(400).json({ 
        success: false, 
        error: 'اسم الجدول أو بيئة العمل غير صالحة بعد التنظيف والتأمين' 
      });
    }

    // 🚀 الاستعلام السحابي المحترف والديناميكي لجلب جميع البيانات من أي جدول
    // تم استخدام المعرفات الديناميكية لـ postgres لضمان جلب البيانات بنجاح من Neon
    const dbResult = await sql`
      SELECT * FROM ${sql(safeSchema + '.' + safeTable)}
      ORDER BY id DESC
    `;

    // 🧠 [1] في حال كان الجدول المطلوب هو الجهات (contacts) - نقوم بالفرز والتفكيك الذكي
    if (safeTable === 'contacts') {
      const customers = dbResult.filter(item => item.type === 'customer' || item.type === 'general');
      const suppliers = dbResult.filter(item => item.type === 'supplier');
      const employees = dbResult.filter(item => item.type === 'employee');

      return res.status(200).json({ 
        success: true, 
        table: table, // نرجع الاسم الأصلي المطلب للفرونت لعدم كسر الأب والـ QueryKey
        schema: safeSchema,
        data: dbResult, 
        categorized: { 
          customers,
          suppliers,
          employees
        }
      });
    }

    // 📦 [2] لباقي الجداول (items, invoices, accounts, hr_attendance, system_logs)
    // يعود بالمصفوفة الصافية والكاملة فوراً وبأعلى أداء لشاشة الموبايل
    return res.status(200).json({ 
      success: true, 
      table: table,
      schema: safeSchema,
      data: dbResult 
    });

  } catch (error) {
    console.error(`❌ خطأ حرج حقيقي أثناء جلب جدول [${table}]:`, error.message);
    
    // حزام أمان ذكي: إذا كان الخطأ هو عدم وجود الجدول في قاعدة البيانات بعد، نرجع مصفوفة فارغة بدلاً من كسر الفرونت إند
    if (error.message.includes('does not exist')) {
      return res.status(200).json({
        success: true,
        table: table,
        schema: schema,
        data: [],
        message: 'الجدول فارغ أو لم يتم إنشاؤه بعد في هذه السكيما'
      });
    }

    return res.status(500).json({
      success: false,
      error: `حدث خطأ في السيرفر أثناء جلب البيانات: ${error.message}`
    });
  } finally {
    // 🔒 إغلاق الاتصال بأمان بعد انتهاء الطلب فوراً للحفاظ على حزمة Neon المجانية/المدفوعة
    if (sql) {
      await sql.end({ timeout: 0.5 });
    }
  }
}
