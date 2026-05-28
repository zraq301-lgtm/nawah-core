import { createClient } from '@supabase/supabase-js';

// 🔥 قراءة المتغيرات المؤمنة من سيرفر فيرسيل مباشرة لحماية البيانات على GitHub
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// تأمين السيرفر: التأكد من أن المتغيرات تم ضبطها في إعدادات فيرسيل قبل تشغيل الدالة
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("خطأ حرج: متغيرات بيئة العمل لـ Supabase غير معرفة في إعدادات Vercel!");
}

// تهيئة اتصال سوبابيز بمفتاح الأدمن الخارق لتخطي حماية السكيمات
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // السماح بطلبات POST فقط لعمليات الحفظ والتعديل
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'الطريقة غير مسموح بها، استخدم POST' });
  }

  const { schema, action, data } = req.body;

  // التحقق من سلامة البيانات المستقبلة من تطبيق الموبايل لنواة AI
  if (!schema || !action || !data) {
    return res.status(400).json({ success: false, error: 'البيانات المرسلة من الموبايل ناقصة' });
  }

  try {
    let result;

    // المايسترو الذكي: يوجه الحفظ للجدول الصحيح جوه السكيما المخصصة
    switch (action) {
      
      // 1️⃣ قسم الأصناف والمخازن (نواة AI)
      case 'ADD_PRODUCT':
        const { data: prodData, error: prodErr } = await supabaseAdmin
          .from('الأصناف_والمخزون')
          .schema(schema) // التوجيه الديناميكي للسكيما الفريدة للشركة
          .insert([{
            كود_الباركود: data.barcode,
            الاسم: data.name,
            نوع_الصنف: data.type,
            سعر_التكلفة: data.cost,
            سعر_البيع: data.price
          }])
          .select();
        
        if (prodErr) throw prodErr;
        result = prodData[0];
        break;

      // 2️⃣ قسم المبيعات والمشتريات (الفواتير والحركات)
      case 'SAVE_INVOICE':
        const { data: invData, error: invErr } = await supabaseAdmin
          .from('الحركات_والفواتير')
          .schema(schema)
          .insert([{
            رقم_الحركة: data.code,
            نوع_الحركة: data.type, // بيع أو شراء
            الجهة_id: data.entityId,
            إجمالي_الخام: data.gross,
            الخصم: data.discount,
            الصافي: data.net,
            المدفوع: data.paid,
            المتبقي: data.rest
          }])
          .select();

        if (invErr) throw invErr;
        result = invData[0];
        break;

      // 3️⃣ قسم الحضور والرواتب (الموارد البشرية)
      case 'LOG_ATTENDANCE':
        const { data: attData, error: attErr } = await supabaseAdmin
          .from('الحضور_والرواتب')
          .schema(schema)
          .insert([{
            الموظف_id: data.employeeId,
            الحالة: data.status, // حضور أو انصراف
            الراتب_اليومي: data.wage
          }])
          .select();

        if (attErr) throw attErr;
        result = attData[0];
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
