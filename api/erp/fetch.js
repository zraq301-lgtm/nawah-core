import { createClient } from '@supabase/supabase-js';

// 🔥 قراءة وتحويل الرابط أوتوماتيكياً للمعيار الحديث لتجنب تحذير Node.js (WHATWG URL)
const supabaseUrlRaw = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrlRaw || !supabaseServiceKey) {
  console.error("خطأ حرج: متغيرات بيئة العمل لـ Supabase غير معرفة في إعدادات Vercel!");
}

const supabaseUrl = supabaseUrlRaw ? new URL(supabaseUrlRaw).toString() : '';

// تهيئة اتصال سوبابيز بمفتاح الأدمن الخارق
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // تفعيل حماية وتخطي الـ CORS الكاملة للأندرويد والمحاكيات
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // السماح بطلبات GET فقط لعمليات جلب البيانات
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'الطريقة غير مسموح بها، استخدم GET' });
  }

  // المعيار الموحد الجديد: جلب اسم السكيما والجدول بالإنجليزية مباشرة من الـ Query Params
  const { schema, table } = req.query;

  if (!schema || !table) {
    return res.status(400).json({ 
      success: false, 
      error: 'المعطيات المرسلة ناقصة، المعيار يتطلب إرسال (schema و table)' 
    });
  }

  try {
    // 🚀 التنفيذ الديناميكي الفولاذي لطلب الجلب لأي جدول
    const { data: dbResult, error: dbErr } = await supabaseAdmin
      .schema(schema) // التوجيه الديناميكي للسكيما
      .from(table)    // التوجيه الديناميكي للجدول (items, invoices, contacts, hr_attendance... إلخ)
      .select('*')
      .order('id', { ascending: false }); // ترتيب تنازلي لعرض الأحدث دائماً

    if (dbErr) throw dbErr;

    // الرد الموحد بالبيانات المطلوبة
    return res.status(200).json({ 
      success: true, 
      table: table,
      data: dbResult 
    });

  } catch (error) {
    console.error(`خطأ الباك إند الموحد أثناء جلب البيانات من جدول ${table}:`, error);
    return res.status(400).json({ 
      success: false, 
      error: error.message || error 
    });
  }
}
