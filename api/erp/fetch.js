import { createClient } from '@supabase/supabase-js';

// 🔥 قراءة وتحويل الرابط أوتوماتيكياً للـ الميكانيكية الحديثة لتجنب تحذير Node.js
const supabaseUrlRaw = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrlRaw || !supabaseServiceKey) {
  console.error("خطأ حرج: متغيرات بيئة العمل لـ Supabase غير معرفة في إعدادات Vercel!");
}

// تنظيف وتأمين الرابط باستخدام المعيار الحديث (WHATWG URL) لمنع الـ DeprecationWarning
const supabaseUrl = supabaseUrlRaw ? new URL(supabaseUrlRaw).toString() : '';

// تهيئة اتصال سوبابيز بمفتاح الأدمن الخارق
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // تفعيل حماية وتخطي الـ CORS للأندرويد والمحاكيات
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'الطريقة غير مسموح بها، استخدم GET' });
  }

  const { schema, view } = req.query;

  if (!schema || !view) {
    return res.status(400).json({ success: false, error: 'المعطيات المرسلة (السكيما أو نوع العرض) ناقصة' });
  }

  try {
    let dataResult;

    switch (view) {
      case 'GET_STOCK':
        const { data: stock, error: stockErr } = await supabaseAdmin
          .schema(schema)
          .from('الأصناف_والمخزون')
          .select('*')
          .order('id', { ascending: false });

        if (stockErr) throw stockErr;
        dataResult = stock;
        break;

      case 'GET_INVOICES':
        const { data: invoices, error: invErr } = await supabaseAdmin
          .schema(schema)
          .from('الحركات_والفواتير')
          .select('*')
          .order('id', { ascending: false });

        if (invErr) throw invErr;
        dataResult = invoices;
        break;

      case 'GET_ATTENDANCE':
        const { data: attendance, error: attErr } = await supabaseAdmin
          .schema(schema)
          .from('الحضور_والرواتب')
          .select('*')
          .order('id', { ascending: false });

        if (attErr) throw attErr;
        dataResult = attendance;
        break;

      default:
        return res.status(400).json({ success: false, error: 'نوع عرض البيانات غير مدرج في المعمارية' });
    }

    return res.status(200).json({ success: true, data: dataResult });

  } catch (error) {
    console.error('خطأ الباك إند الموحد أثناء جلب البيانات:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
