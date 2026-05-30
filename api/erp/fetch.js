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

    // 🚀 الاستعلام الديناميكي من نيون باستخدام الـ Identifiers الآمنة لـ postgres.js
    const dbResult = await sql`
      SELECT * FROM ${sql(safeSchema)}.${sql(safeTable)}
      ORDER BY id DESC
    `;

    // 🧠 المحرك الذكي للتصنيف: إذا كان الجدول المطلوب هو جدول الجهات والموردين الموحد
    if (safeTable === 'contacts') {
      // فرز وتجميع كل فئة وتخصص بناءً على حقل الـ type القياسي لنظام الـ ERP
      const customers = dbResult.filter(item => item.type === 'customer' || item.type === 'general');
      const suppliers = dbResult.filter(item => item.type === 'supplier');
      const employees = dbResult.filter(item => item.type === 'employee');

      // الرد الموحد والمصنف مسبقاً لتسهيل قراءته في واجهات App.jsx مباشرة
      return res.status(200).json({ 
        success: true, 
        table: safeTable,
        schema: safeSchema,
        data: dbResult, // المصفوفة الكاملة الخام كما هي
        categorized: {  // البيانات مفرزة ومصنفة حسب التخصص الحقيقي لها
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
