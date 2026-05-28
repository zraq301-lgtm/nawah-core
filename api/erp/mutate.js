import { createClient } from '@supabase/supabase-js';

// 🔥 قراءة المتغيرات المؤمنة من سيرفر فيرسيل مباشرة لحماية البيانات على GitHub
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// تأمين السيرفر: التحقق من أن المتغيرات تم ضبطها في إعدادات فيرسيل قبل تشغيل الدالة
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("خطأ حرج: متغيرات بيئة العمل لـ Supabase غير معرفة في إعدادات Vercel!");
}

// تهيئة اتصال سوبابيز بمفتاح الأدمن الخارق لتخطي حماية السكيمات
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // تفعيل حماية وتخطي الـ CORS للأندرويد والمحاكيات (مهم جداً لتجنب تجميد الطلب)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // السماح بطلبات POST فقط لعمليات الحفظ والتعديل
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'الطريقة غير مسموح بها، استخدم POST' });
  }

  const { schema, action, data } = req.body;

  // التحقق من سلامة البيانات المستقبلة من تطبيق الموبايل لنواة AI
  if (!schema || !action || !data) {
    return res.status(400).json({ success: false, error: 'البيانات المرسلة من الموبايل ناقصة (السكيما، الإجراء، أو الداتا)' });
  }

  try {
    let result;

    // المايسترو الذكي: يوجه الحفظ للجدول الصحيح جوه السكيما المخصصة
    switch (action) {
      
      // 1️⃣ قسم الأصناف والمخازن (نواة AI)
      case 'ADD_PRODUCT':
        const { data: prodData, error: prodErr } = await supabaseAdmin
          .schema(schema) // السكيما تذكر أولاً دائماً
          .from('الأصناف_والمخزون')
          .insert([{
            كود_الباركود: data.barcode,
            الاسم: data.name,
            نوع_الصنف: data.type, // مطابق لـ (مادة_خام / منتج_تام) في الـ SQL
            سعر_التكلفة: data.cost || 0,
            سعر_البيع: data.price || 0,
            الكمية_المتاحة: data.quantity || 0
          }])
          .select();
        
        if (prodErr) throw prodErr;
        result = prodData && prodData.length > 0 ? prodData[0] : null;
        break;

      // 2️⃣ قسم المبيعات والمشتريات (الفواتير والحركات)
      case 'SAVE_INVOICE':
        const { data: invData, error: invErr } = await supabaseAdmin
          .schema(schema) // تحديد السكيما أولاً
          .from('الحركات_والفواتير')
          .insert([{
            رقم_الحركة: data.code,
            نوع_الحركة: data.type, // بيع أو شراء
            الجهة_id: data.entityId,
            إجمالي_الخام: data.gross || 0,
            الخصم: data.discount || 0,
            صافي_الفاتورة: data.net || 0,   // 🔥 تم تصحيح مسمى الحقل والتعليق
            المبلغ_المدفوع: data.paid || 0, // 🔥 تم تصحيح مسمى الحقل والتعليق
            المتبقي: data.rest || 0        // 🔥 تم تصحيح مسمى الحقل والتعليق
          }])
          .select();

        if (invErr) throw invErr;
        result = invData && invData.length > 0 ? invData[0] : null;
        break;

      // 3️⃣ قسم الحضور والرواتب (الموارد البشرية)
      case 'LOG_ATTENDANCE':
        const { data: attData, error: attErr } = await supabaseAdmin
          .schema(schema) // تحديد السكيما أولاً
          .from('الحضور_والرواتب')
          .insert([{
            الموظف_id: data.employeeId,
            وقت_الحضور: data.status === 'حضور' ? new Date() : null,
            وقت_الانصراف: data.status === 'انصراف' ? new Date() : null,
            الراتب_اليومي_أو_الأساسي: data.wage || 0
          }])
          .select();

        if (attErr) throw attErr;
        result = attData && attData.length > 0 ? attData[0] : null;
        break;

      default:
        return res.status(400).json({ success: false, error: 'هذا الإجراء (Action) غير مدعوم في معمارية المايسترو' });
    }

    // إرسال النتيجة الناجحة للموبايل فوراً
    return res.status(200).json({ success: true, data: result });

  } catch (error) {
    console.error('خطأ الباك إند الموحد أثناء الحفظ:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
