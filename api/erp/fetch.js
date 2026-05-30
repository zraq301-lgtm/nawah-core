// pages/api/data/get.js (أو اسم ملف الجلب الخاص بك)
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

  // المعيار الموحد: جلب اسم السكيما والجدول بالإنجليزية مباشرة من الـ Query Params
  const { schema, table } = req.query;

  if (!schema || !table) {
    return res.status(400).json({ 
      success: false, 
      error: 'المعطيات المرسلة ناقصة، المعيار يتطلب إرسال (schema و table)' 
    });
  }

  // 🔌 الاتصال المباشر والآمن بنظام نيون السحابي (Neon DB) لقراءة السكيما الديناميكية
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

  try {
    // 🛡️ تأمين وحماية أسماء السكيما والجداول لمنع ثغرات الـ SQL Injection
    const safeSchema = schema.trim().toLowerCase();
    const safeTable = table.trim().toLowerCase();

    // التحقق من الهيكل الاسمي لمنع إرسال رموز خبيثة
    if (!/^[a-z0-9_]+$/.test(safeSchema) || !/^[a-z0-9_]+$/.test(safeTable)) {
      return res.status(400).json({ success: false, error: 'أسماء الجداول أو بيئة العمل تحتوي على رموز غير صالحة' });
    }

    // 🚀 الاستعلام الديناميكي الفولاذي من نيون باستخدام الـ Identifiers الآمنة لـ postgres.js
    // يقوم بجلب البيانات وترتيبها تنازلياً حسب الـ id وعزلها للمؤسسة المستهدفة
    const dbResult = await sql`
      SELECT * FROM ${sql(safeSchema)}.${sql(safeTable)}
      ORDER BY id DESC
    `;

    // الرد الموحد بالبيانات المطلوبة بنجاح
    return res.status(200).json({ 
      success: true, 
      table: safeTable,
      schema: safeSchema,
      data: dbResult 
    });

  } catch (error) {
    console.error(`❌ خطأ الباك إند الموحد أثناء جلب البيانات من جدول ${table}:`, error.message);
    
    // التعامل الذكي مع خطأ عدم وجود الجدول في السكيما لتنبيه الواجهة برسمية
    if (error.message.includes('does not exist')) {
      return res.status(404).json({
        success: false,
        error: `الجدول (${table}) غير موجود حالياً في بيئة عمل المؤسسة المعزولة`
      });
    }

    return res.status(400).json({ 
      success: false, 
      error: "فشل استدعاء البيانات من السيرفر السحابي، يرجى إعادة المحاولة" 
    });
  }
}
