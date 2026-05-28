import { createClient } from '@supabase/supabase-js';

// 🔥 قراءة المتغيرات المؤمنة من سيرفر فيرسيل مباشرة لحماية البيانات على GitHub
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// تأمين السيرفر: التحقق من ضبط المتغيرات قبل التنفيذ
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("خطأ حرج: متغيرات بيئة العمل لـ Supabase غير معرفة في إعدادات Vercel!");
}

// تهيئة اتصال سوبابيز بمفتاح الأدمن الخارق لتخطي حماية السكيمات وقراءتها ديناميكياً
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // تفعيل حماية وتخطي الـ CORS للأندرويد والمحاكيات
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // السماح بطلبات GET فقط لعمليات القراءة والجلب
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'الطريقة غير مسموح بها، استخدم GET' });
  }

  // استلام السكيما ونوع العرض (view) من رابط الطلب (Query Params)
  const { schema, view } = req.query;

  // التحقق من سلامة المعطيات القادمة من تطبيق الأندرويد لنواة AI
  if (!schema || !view) {
    return res.status(400).json({ success: false, error: 'المعطيات المرسلة (السكيما أو نوع العرض) ناقصة' });
  }

  try {
    let dataResult;

    // المايسترو الذكي: يوجه عملية الجلب للجدول الصحيح بناءً على الشاشة المفتوحة في الموبايل
    switch (view) {
      
      // 1️⃣ جلب بضاعة وجرد المخزن بالكامل
      case 'GET_STOCK':
        const { data: stock, error: stockErr } = await supabaseAdmin
          .schema(schema) // 🔥 تصحيح ذهبي: السكيما أولاً قبل الـ .from لتوجيه المحرك ديناميكياً
          .from('الأصناف_والمخزون')
          .select('*')
          .order('id', { ascending: false });

        if (stockErr) throw stockErr;
        dataResult = stock;
        break;

      // 2️⃣ جلب كشف الفواتير بالكامل (مبيعات ومشتريات) للتقارير
      case 'GET_INVOICES':
        const { data: invoices, error: invErr } = await supabaseAdmin
          .schema(schema) // 🔥 تصحيح ذهبي: تحديد السكيما أولاً
          .from('الحركات_والفواتير')
          .select('*')
          .order('id', { ascending: false });

        if (invErr) throw invErr;
        dataResult = invoices;
        break;

      // 3️⃣ جلب سجل الحضور والرواتب الخاص بالموظفين
      case 'GET_ATTENDANCE':
        const { data: attendance, error: attErr } = await supabaseAdmin
          .schema(schema) // 🔥 تصحيح ذهبي: تحديد السكيما أولاً
          .from('الحضور_والرواتب')
          .select('*')
          .order('id', { ascending: false });

        if (attErr) throw attErr;
        dataResult = attendance;
        break;

      default:
        return res.status(400).json({ success: false, error: 'نوع عرض البيانات (View) غير مدرج في معمارية المايسترو' });
    }

    // إرسال مصفوفة البيانات الصافية للموبايل لتوزيعها على الواجهات الزجاجية
    return res.status(200).json({ success: true, data: dataResult });

  } catch (error) {
    console.error('خطأ الباك إند الموحد أثناء جلب البيانات:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
