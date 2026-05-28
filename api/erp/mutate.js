import { createClient } from '@supabase/supabase-js';

// قراءة المتغيرات المؤمنة من سيرفر فيرسيل
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("خطأ حرج: متغيرات بيئة العمل لـ Supabase غير معرفة في إعدادات Vercel!");
}

// تهيئة اتصال سوبابيز بمفتاح الأدمن الخارق لتخطي حماية السكيمات ديناميكياً
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // 1️⃣ تفعيل إعدادات الـ CORS الكاملة لتأمين استقرار حركة المرور مع الأندرويد
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // السماح بطلبات POST فقط لعمليات الحفظ والتعديل
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'الطريقة غير مسموح بها، استخدم POST' });
  }

  // 2️⃣ استقبال المعيار الموحد الجديد
  // table: اسم الجدول المستهدف بالإنجليزية (مثل: items, invoices, contacts)
  // data: كائن مرن يحتوي على أسماء الأعمدة وقيمها القادمة من الموبايل مباشرة
  const { schema, table, data } = req.body;

  // التحقق من سلامة البيانات المستقبلة من تطبيق الموبايل لنواة AI
  if (!schema || !table || !data) {
    return res.status(400).json({ 
      success: false, 
      error: 'البيانات المرسلة ناقصة، المعيار يتطلب إرسال (schema, table, data)' 
    });
  }

  try {
    // 3️⃣ التنفيذ الديناميكي الحر والموحد داخل قاعدة البيانات 🚀
    const { data: dbResult, error: dbErr } = await supabaseAdmin
      .schema(schema) // توجيه المحرك ديناميكياً للسكيما الخاصة بالمؤسسة
      .from(table)    // توجيه المحرك للجدول المطلوب هندسياً
      .insert([data]) // حقن مصفوفة البيانات أوتوماتيكياً مهما تنوعت الأعمدة
      .select();

    if (dbErr) throw dbErr;

    // 4️⃣ الرد الموحد بالنجاح وإرجاع السطر المحفور في قاعدة البيانات
    return res.status(200).json({ 
      success: true, 
      message: `تم حفر البيانات بنجاح في جدول ${table}`,
      data: dbResult && dbResult.length > 0 ? dbResult[0] : null 
    });

  } catch (error) {
    console.error(`خطأ الباك إند الموحد أثناء الحفظ في جدول ${table}:`, error);
    // إرجاع تفاصيل الخطأ الحقيقية القادمة من PostgreSQL لتسهيل الفحص في الموبايل
    return res.status(400).json({ 
      success: false, 
      error: error.message || error 
    });
  }
}
