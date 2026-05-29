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

  // 2️⃣ استقبال المعطيات مع دعم "الأكشن القديم" و "الجدول الحديث" في آن واحد لمنع انهيار الـ 400
  const { schema, table, action, data } = req.body;

  // ذكاء اصطناعي مصغر: إذا أرسل التطبيق "action" بدلاً من "table"، نقوم بتحويله ديناميكياً لاسم الجدول الصحيح
  let targetTable = table;
  if (!targetTable && action) {
    if (action === 'ADD_PURCHASE_INVOICE' || action === 'ADD_PURCHASE') {
      targetTable = 'purchases'; 
    } else if (action === 'ADD_ORDER_REQUEST') {
      targetTable = 'order_requests';
    } else {
      targetTable = action.toLowerCase().replace('add_', '') + 's'; // تحويل تلقائي احتياطي
    }
  }

  const activeSchema = schema || 'public';

  // التحقق الفضفاض من سلامة البيانات (إذا وجدنا سكيما وجدول وبيانات نمضي قدماً)
  if (!targetTable || !data) {
    return res.status(400).json({ 
      success: false, 
      error: 'البيانات المرسلة مفقودة أو ناقصة الهيكل الدلالي، المعيار يتطلب (schema, table/action, data)' 
    });
  }

  try {
    // 🧹 دالة تنظيف وتوحيد المفاتيح (Mapping): 
    // تحويل أي حقل مرسل بـ camelCase من الموبايل إلى snake_case المتوقع في PostgreSQL
    const cleanedData = {};
    Object.keys(data).forEach(key => {
      // تحويل مثل paymentMethod إلى payment_method
      const databaseKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      cleanedData[databaseKey] = data[key];
    });

    // استخراج الداتا الصافية وحذف أي كائنات فرعية قد تسبب خطأ 400 في سوبابيز (مثل حقول الأوبجكت المعقدة)
    if (cleanedData.batch_info) {
      // إذا كانت داتا الفاتورة تحتوي على تفاصيل شحنة فرعية، نقوم بمسطحها أو دمج الأعمدة الأساسية
      cleanedData.batch_id = cleanedData.batch_info.batchId || cleanedData.batch_id;
      delete cleanedData.batch_info;
    }

    console.log(`🚀 جاري محاولة الحفر في جدول [${targetTable}] داخل السكيما [${activeSchema}]:`, cleanedData);

    // 3️⃣ التنفيذ الديناميكي المرن والموحد داخل قاعدة البيانات
    const { data: dbResult, error: dbErr } = await supabaseAdmin
      .schema(activeSchema) 
      .from(targetTable)    
      .insert([cleanedData]) // الحقن داخل مصفوفة
      .select();

    if (dbErr) throw dbErr;

    // 4️⃣ الرد الموحد بالنجاح وإرجاع السطر المحفور في قاعدة البيانات
    return res.status(200).json({ 
      success: true, 
      message: `تم حفر البيانات بنجاح في جدول ${targetTable}`,
      table: targetTable,
      data: dbResult && dbResult.length > 0 ? dbResult[0] : null 
    });

  } catch (error) {
    console.error(`❌ خطأ الباك إند الموحد أثناء الحفظ في جدول ${targetTable}:`, error);
    
    // إرجاع تفاصيل دقيقة جداً من PostgreSQL لمساعدتك في الفرونت إند على معرفة العمود المسبب للمشكلة
    return res.status(400).json({ 
      success: false, 
      error: error.message || error,
      details: error.details || "تأكد من مطابقة أسماء الأعمدة في قاعدة البيانات مع الحقول المرسلة",
      hint: error.hint || "راجع قيود الجداول (Constraints أو Foreign Keys)"
    });
  }
}
