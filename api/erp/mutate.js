import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
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
  
  let targetTable = table || (action && action.toLowerCase().replace('add_', '') + 's');
  if (action?.toUpperCase() === 'ADD_PURCHASE_INVOICE' || action?.toUpperCase() === 'ADD_SALE_INVOICE') {
    targetTable = 'invoices';
  }

  try {
    console.log(`🎯 [العبور الآمن من البوابة] الاسكيما: ${safeSchema} -> الجدول: ${targetTable}`);

    // خريطة الحقول المعتمدة للاسكيما
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

    const cleanValue = (val) => {
      if (val === null || val === undefined || val === '') return 'NULL';
      if (typeof val === 'number' || typeof val === 'boolean') return val;
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      return `'${String(val).trim().replace(/'/g, "''")}'`;
    };

    const extractTablePayload = (rawDataset, tableName) => {
      const allowedFields = schemaFields[tableName];
      if (!allowedFields) return null;
      const payload = {};
      allowedFields.forEach(field => {
        if (rawDataset[field] !== undefined) payload[field] = rawDataset[field];
      });
      return Object.keys(payload).length > 0 ? payload : null;
    };

    // 🔥 تعديل دالة التنفيذ: إجبار محرك الـ RPC على استقبال الاستعلام كـ SELECT مغلف لمنع انهيار "INTO"
    const executeQuery = async (sql) => {
      const { data: result, error: err } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
      if (err) throw err;
      return (Array.isArray(result) && result.length > 0) ? result[0] : result;
    };

    let finalResponseData = null;

    if (targetTable === 'invoices') {
      const invoiceData = { ...data };
      
      invoiceData.gross_amount = Number(invoiceData.gross_amount || 0);
      invoiceData.discount = Number(invoiceData.discount || 0);
      invoiceData.tax_amount = Number(invoiceData.tax_amount || 0);
      invoiceData.net_amount = Number(invoiceData.net_amount || (invoiceData.gross_amount - invoiceData.discount + invoiceData.tax_amount));
      invoiceData.paid_amount = Number(invoiceData.paid_amount || 0);
      invoiceData.remaining_amount = Number(invoiceData.net_amount - invoiceData.paid_amount);
      invoiceData.contact_id = invoiceData.contact_id || 1; 
      invoiceData.invoice_type = invoiceData.invoice_type || (action?.toLowerCase().includes('purchase') ? 'purchase' : 'sale');

      const filteredInvoice = extractTablePayload(invoiceData, 'invoices');
      const invCols = Object.keys(filteredInvoice).map(k => `"${k}"`).join(', ');
      const invVals = Object.values(filteredInvoice).map(cleanValue).join(', ');

      // تغليف جملة الإدخال داخل تعبير SELECT موجه ليرضي بوابة الـ RPC
      const insertInvoiceSql = `
        WITH inserted_rows AS (
          INSERT INTO "${safeSchema}"."invoices" (${invCols}) 
          VALUES (${invVals}) 
          RETURNING *
        )
        SELECT * FROM inserted_rows;
      `;
      
      finalResponseData = await executeQuery(insertInvoiceSql);
      const newInvoiceId = finalResponseData.id;

      // 2. إدخال الأصناف بشكل تتابعي مغلف بـ SELECT
      const itemsArray = data.items || data.invoice_items || [];
      if (Array.isArray(itemsArray) && itemsArray.length > 0) {
        for (const item of itemsArray) {
          const itemDoc = {
            invoice_id: newInvoiceId,
            item_id: item.id || item.item_id,
            quantity: Number(item.quantity || 1),
            unit_price: Number(item.price || item.unit_price || 0)
          };
          const filteredItem = extractTablePayload(itemDoc, 'invoice_items');
          if (filteredItem) {
            const itemCols = Object.keys(filteredItem).map(k => `"${k}"`).join(', ');
            const itemVals = Object.values(filteredItem).map(cleanValue).join(', ');
            
            const insertItemSql = `
              WITH inserted_item AS (
                INSERT INTO "${safeSchema}"."invoice_items" (${itemCols}) 
                VALUES (${itemVals}) 
                RETURNING *
              )
              SELECT * FROM inserted_item;
            `;
            await executeQuery(insertItemSql);
          }
        }
      }

      // 3. إدخال حركة الخزينة التلقائية مغلفة بـ SELECT
      if (invoiceData.paid_amount > 0) {
        const cashDoc = {
          invoice_id: newInvoiceId,
          account_id: data.account_id || 1,
          flow_type: invoiceData.invoice_type === 'sale' ? 'in' : 'out',
          amount: invoiceData.paid_amount,
          description: `دفعة نقدية تلقائية للفاتورة رقم: ${invoiceData.invoice_number}`
        };
        const filteredCash = extractTablePayload(cashDoc, 'cash_transactions');
        if (filteredCash) {
          const cashCols = Object.keys(filteredCash).map(k => `"${k}"`).join(', ');
          const cashVals = Object.values(filteredCash).map(cleanValue).join(', ');
          
          const insertCashSql = `
            WITH inserted_cash AS (
              INSERT INTO "${safeSchema}"."cash_transactions" (${cashCols}) 
              VALUES (${cashVals}) 
              RETURNING *
            )
            SELECT * FROM inserted_cash;
          `;
          await executeQuery(insertCashSql);
        }
      }

    } else {
      // الجداول العادية البسيطة مغلفة بـ SELECT لمنع مشكلة الـ INTO
      const filteredPayload = extractTablePayload(data, targetTable);
      if (!filteredPayload) {
        throw new Error(`البيانات لا تطابق حقول جدول [${targetTable}] في الاسكيما.`);
      }

      const columns = Object.keys(filteredPayload).map(key => `"${key}"`).join(', ');
      const values = Object.values(filteredPayload).map(cleanValue).join(', ');

      const insertSimpleSql = `
        WITH inserted_simple AS (
          INSERT INTO "${safeSchema}"."${targetTable}" (${columns}) 
          VALUES (${values}) 
          RETURNING *
        )
        SELECT * FROM inserted_simple;
      `;
      finalResponseData = await executeQuery(insertSimpleSql);
    }

    return res.status(200).json({ 
      success: true, 
      message: `تم العبور من البوابة بنجاح وحفظ البيانات في اسكيما الشركة [${safeSchema}]`,
      data: finalResponseData
    });

  } catch (error) {
    console.error(`❌ فشل العبور عبر البوابة:`, error.message);
    return res.status(400).json({ 
      success: false, 
      error: error.message,
      details: "تأكد من مطابقة أسماء حقول الجداول داخل تصفية قواعد البيانات وجرب مجدداً."
    });
  }
}
