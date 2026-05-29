import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // 1️⃣ تأمين الاتصال ومسارات الـ CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'استخدم POST' });

  const { schema, table, action, data } = req.body;

  if (!schema || !data) {
    return res.status(400).json({ success: false, error: 'البيانات المرسلة ناقصة تماماً' });
  }

  const safeSchema = String(schema).trim().toLowerCase();
  
  // تحديد الجدول المستهدف تلقائياً بناءً على الـ action أو الـ table الممرر
  let targetTable = table || (action && action.toLowerCase().replace('add_', '') + 's');
  if (action?.toUpperCase() === 'ADD_PURCHASE_INVOICE' || action?.toUpperCase() === 'ADD_SALE_INVOICE') {
    targetTable = 'invoices';
  }

  try {
    console.log(`🎯 [بدء تصفية الرمل وتحليل الحزم] للشركة: ${safeSchema} -> جدول رئيسي: ${targetTable}`);

    // ==========================================
    // 🏭 [ماكينة التصفية والفرز والتطهير]
    // ==========================================
    
    // الخريطة الذهنية للحقول المعتمدة لكل جدول في الاسكيما (لمنع حقن أي حقول غريبة)
    const schemaFields = {
      contacts: ['id', 'name', 'type', 'phone', 'tax_number', 'current_balance'],
      items: ['id', 'barcode', 'name', 'item_type', 'available_quantity', 'cost_price', 'sale_price'],
      invoices: ['id', 'invoice_number', 'invoice_type', 'contact_id', 'created_at', 'gross_amount', 'discount', 'tax_amount', 'net_amount', 'paid_amount', 'remaining_amount'],
      invoice_items: ['id', 'invoice_id', 'item_id', 'quantity', 'unit_price'],
      accounts: ['id', 'account_name', 'account_type', 'current_balance'],
      cash_transactions: ['id', 'account_id', 'flow_type', 'amount', 'invoice_id', 'description'],
      hr_attendance: ['id', 'employee_id', 'attendance_date', 'check_in', 'check_out', 'base_salary', 'allowances_and_deductions'],
      system_logs: ['id', 'user_id', 'action', 'old_details', 'new_details', 'created_at']
    };

    // دالة داخلية لتنظيف وتجهيز القيم لـ SQL بناءً على نوع البيانات المسموح
    const cleanValue = (val) => {
      if (val === null || val === undefined || val === '') return 'NULL';
      if (typeof val === 'number' || typeof val === 'boolean') return val;
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      return `'${String(val).trim().replace(/'/g, "''")}'`;
    };

    // دالة استخلاص وتصفية الحقول المطابقة فقط للجدول المستهدف
    const extractTablePayload = (rawDataset, tableName) => {
      const allowedFields = schemaFields[tableName];
      if (!allowedFields) return null;
      
      const payload = {};
      allowedFields.forEach(field => {
        if (rawDataset[field] !== undefined) payload[field] = rawDataset[field];
      });
      return Object.keys(payload).length > 0 ? payload : null;
    };

    let finalQueries = [];

    // ==========================================
    // 🧠 [التحليل الذكي للبيانات المستلمة]
    // ==========================================
    
    if (targetTable === 'invoices') {
      // 🌾 فك وفصل الرمل عن الحصى: استخراج رأس الفاتورة أولاً
      const invoiceData = { ...data };
      
      // تأمين الحقول الأساسية الحسابية حتى لو الواجهة بعتتها نصوص أو نسيتها
      invoiceData.gross_amount = Number(invoiceData.gross_amount || 0);
      invoiceData.discount = Number(invoiceData.discount || 0);
      invoiceData.tax_amount = Number(invoiceData.tax_amount || 0);
      invoiceData.net_amount = Number(invoiceData.net_amount || (invoiceData.gross_amount - invoiceData.discount + invoiceData.tax_amount));
      invoiceData.paid_amount = Number(invoiceData.paid_amount || 0);
      invoiceData.remaining_amount = Number(invoiceData.net_amount - invoiceData.paid_amount);
      
      // إذا لم يرسل معرف جهة، نربطه تلقائياً بالمورد/العميل العام رقم 1 الممزوع افتراضياً
      invoiceData.contact_id = invoiceData.contact_id || 1; 
      invoiceData.invoice_type = invoiceData.invoice_type || (action?.toLowerCase().includes('purchase') ? 'purchase' : 'sale');

      const filteredInvoice = extractTablePayload(invoiceData, 'invoices');
      const invCols = Object.keys(filteredInvoice).map(k => `"${k}"`).join(', ');
      const invVals = Object.values(filteredInvoice).map(cleanValue).join(', ');

      // 1. استعلام إدخال رأس الفاتورة وحجز الـ ID المولد
      finalQueries.push(`
        INSERT INTO "${safeSchema}"."invoices" (${invCols}) 
        VALUES (${invVals}) 
        RETURNING id INTO v_invoice_id;
      `);

      // 2. 🪨 استخراج زلط تفاصيل الأصناف (invoice_items) إن وجدت مدمجة بالحزمة
      const itemsArray = data.items || data.invoice_items || [];
      if (Array.isArray(itemsArray) && itemsArray.length > 0) {
        itemsArray.forEach(item => {
          const itemDoc = {
            item_id: item.id || item.item_id,
            quantity: Number(item.quantity || 1),
            unit_price: Number(item.price || item.unit_price || 0)
          };
          
          const filteredItem = extractTablePayload(itemDoc, 'invoice_items');
          const itemCols = Object.keys(filteredItem).map(k => `"${k}"`).join(', ');
          // هنا نضع v_invoice_id المحجوز ديناميكياً من الخطوة السابقة لربط العلاقات
          const itemVals = Object.values(filteredItem).map(cleanValue).join(', ').replace('NULL', 'v_invoice_id');

          finalQueries.push(`
            INSERT INTO "${safeSchema}"."invoice_items" (invoice_id, ${itemCols}) 
            VALUES (v_invoice_id, ${itemVals});
          `);
        });
      }

      // 3. 🪙 تصفية المعاملة المالية وإرسال نقد الفاتورة للخزينة الافتراضية
      if (invoiceData.paid_amount > 0) {
        const cashDoc = {
          account_id: data.account_id || 1, // الخزينة الرئيسية رقم 1
          flow_type: invoiceData.invoice_type === 'sale' ? 'in' : 'out',
          amount: invoiceData.paid_amount,
          description: `دفعة نقدية تلقائية للفاتورة رقم: ${invoiceData.invoice_number}`
        };

        const filteredCash = extractTablePayload(cashDoc, 'cash_transactions');
        const cashCols = Object.keys(filteredCash).map(k => `"${k}"`).join(', ');
        const cashVals = Object.values(filteredCash).map(cleanValue).join(', ');

        finalQueries.push(`
          INSERT INTO "${safeSchema}"."cash_transactions" (invoice_id, ${cashCols}) 
          VALUES (v_invoice_id, ${cashVals});
        `);
      }

    } else {
      // 🛠️ المعالجة المباشرة لبقية الجداول العادية (contacts, items, etc.)
      const filteredPayload = extractTablePayload(data, targetTable);
      if (!filteredPayload) {
        throw new Error(`البيانات الممررة لا تطابق أي حقول مسجلة لجدول [${targetTable}] في الاسكيما.`);
      }

      const columns = Object.keys(filteredPayload).map(key => `"${key}"`).join(', ');
      const values = Object.values(filteredPayload).map(cleanValue).join(', ');

      finalQueries.push(`
        INSERT INTO "${safeSchema}"."${targetTable}" (${columns}) 
        VALUES (${values}) 
        RETURNING *;
      `);
    }

    // ==========================================
    // 🚀 [التغليف والصب في قالب المعاملة الموحدة]
    // ==========================================
    let masterSql = '';
    
    if (targetTable === 'invoices') {
      masterSql = `
        DO $$ 
        DECLARE 
          v_invoice_id INTEGER;
        BEGIN 
          PERFORM set_config('search_path', '${safeSchema}, public', true);
          ${finalQueries.join('\n')}
        END $$;
        SELECT COALESCE(json_agg(r), '[]'::json) FROM "${safeSchema}"."invoices" r WHERE r.id = (SELECT max(id) FROM "${safeSchema}"."invoices");
      `;
    } else {
      masterSql = `
        WITH set_path AS (
          SELECT set_config('search_path', '${safeSchema}, public', true)
        ),
        rows AS (
          ${finalQueries[0].replace(';', '')}
        ) 
        SELECT rows.* FROM rows, set_path;
      `;
    }

    console.log(`📝 الاستعلام الفولاذي المصفى نهائياً:`, masterSql);

    // 4️⃣ الإرسال والعبور من البوابة الإلكترونية الموحدة
    const { data: sqlResult, error: sqlErr } = await supabaseAdmin
      .rpc('exec_sql', { sql_query: masterSql });

    if (sqlErr) throw sqlErr;

    const insertedRow = (Array.isArray(sqlResult) && sqlResult.length > 0) ? sqlResult[0] : sqlResult;

    return res.status(200).json({ 
      success: true, 
      message: `تمت تصفية حزمة البيانات كيميائياً وحفظها بالكامل في جداول [${safeSchema}] بنجاح وتفعيل العلاقات.`,
      data: insertedRow
    });

  } catch (error) {
    console.error(`❌ فشل التسكين والتصفية:`, error.message);
    return res.status(400).json({ 
      success: false, 
      error: error.message,
      details: "فشلت التصفية التلقائية. تأكد من إرسال الحقول الأساسية للعملية المعالجة."
    });
  }
}
