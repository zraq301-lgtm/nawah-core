import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("خطأ حرج: متغيرات بيئة العمل لـ Supabase غير معرفة في إعدادات Vercel!");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // تفعيل إعدادات الـ CORS الكاملة لتأمين استقرار حركة المرور مع الأندرويد
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'استخدم POST' });

  // استقبال المعطيات الديناميكية القادمة من الأندرويد
  const { schema, table, action, data } = req.body;

  // تحديد اسم الجدول ديناميكياً بناءً على طلب الواجهة
  let targetTable = table || (action && action.toLowerCase().replace('add_', '') + 's');
  if (action === 'ADD_PURCHASE_INVOICE') targetTable = 'invoices'; 

  if (!schema || !targetTable || !data) {
    return res.status(400).json({ 
      success: false, 
      error: 'البيانات المرسلة ناقصة. يتطلب النظام: (schema, table, data)' 
    });
  }

  // 📥 تسكين البيانات مباشرة كما هي قادمة من الواجهة دون اللعب في أسماء الأعمدة لضمان التطابق
  const finalPayload = { ...data };

  // إذا كانت البيانات تحتوي على تفاصيل شحنة فرعية معقدة، نضع معرف الشحنة في مكانه ونحذف الكائن الفرعي
  if (finalPayload.batch_info) {
    finalPayload.batch_id = finalPayload.batch_info.batchId || finalPayload.batch_id;
    delete finalPayload.batch_info;
  }

  try {
    console.log(`🎯 جاري تسكين البيانات مباشرة داخل سكيما الشركة [${schema}] - جدول [${targetTable}]:`, finalPayload);

    // 🚀 استدعاء دالة الـ RPC لحقن وتسكين البيانات فوراً في سكيما الشركة الصحيحة
    const { data: rpcResult, error: rpcErr } = await supabaseAdmin
      .rpc('insert_dynamic_tenant_data', {
        p_schema: schema,       // رقم الشركة القادم من الواجهة (tenant_xxxxxxxx)
        p_table: targetTable,   // الجدول المطلوب التسكين فيه داخل السكيما
        p_data: finalPayload    // البيانات الصافية المتطابقة مع أعمدة الجدول
      });

    if (rpcErr) throw rpcErr;

    // الرد بالنجاح وإرجاع السطر الذي تم تسكينه وحفظه
    return res.status(200).json({ 
      success: true, 
      message: `تم تسكين البيانات بنجاح داخل النظام المعزول للشركة [${schema}]`,
      table: targetTable,
      data: rpcResult
    });

  } catch (error) {
    console.error(`❌ خطأ أثناء التسكين في سكيما الشركة [${schema}]:`, error);
    return res.status(400).json({ 
      success: false, 
      error: error.message || error,
      details: error.details || "تأكد من أن جميع الحقول المرسلة تطابق أسماء أعمدة الجدول تماماً"
    });
  }
}
