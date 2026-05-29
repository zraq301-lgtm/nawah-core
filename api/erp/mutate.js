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
    console.log(`🚀 [تسكين مباشر بدون استعلام نصي] الاسكيما: ${safeSchema} -> الجدول: ${targetTable}`);

    // خريطة الحقول المعتمدة لكل جدول في قاعدة البيانات
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

    // دالة تصفية الحقول لمنع أخطاء الحقول غير الموجودة بالـ Database
    const extractTablePayload = (rawDataset, tableName) => {
      const allowedFields = schemaFields[tableName];
      if (!allowedFields) return null;
      const payload = {};
      allowedFields.forEach(field => {
        if (rawDataset[field] !== undefined && rawDataset[field] !== '') {
          payload[field] = rawDataset[field];
        }
      });
      return Object.keys(payload).length > 0 ? payload : null;
    };

    let responseData = null;

    if (targetTable === 'invoices') {
      const invoiceData = { ...data };
      
      // جهوزية واحتساب الأرقام للفاتورة
      invoiceData.gross_amount = Number(invoiceData.gross_amount || 0);
      invoiceData.discount = Number(invoiceData.discount || 0);
      invoiceData.tax_amount = Number(invoiceData.tax_amount || 0);
      invoiceData.net_amount = Number(invoiceData.net_amount || (invoiceData.gross_amount - invoiceData.discount + invoiceData.tax_amount));
      invoiceData.paid_amount = Number(invoiceData.paid_amount || 0);
      invoiceData.remaining_amount = Number(invoiceData.net_amount - invoiceData.paid_amount);
      invoiceData.contact_id = invoiceData.contact_id || 1; 
      invoiceData.invoice_type = invoiceData.invoice_type || (action?.toLowerCase().includes('purchase') ? 'purchase' : 'sale');

      const filteredInvoice = extractTablePayload(invoiceData, 'invoices');
      
      // 1. تسكين الفاتورة في جدول الاسكيما مباشرة
      const { data: insertedInvoice, error: invErr } = await supabaseAdmin
        .from(`${safeSchema}.invoices`)
        .insert([filteredInvoice])
        .select()
        .single();

      if (invErr) throw invErr;
      responseData = insertedInvoice;

      // 2. تسكين مصفوفة الأصناف المرتبطة بالفاتورة تلقائياً (إن وجدت)
      const itemsArray = data.items || data.invoice_items || [];
      if (Array.isArray(itemsArray) && itemsArray.length > 0) {
        const filteredItemsPayload = itemsArray.map(item => {
          const itemDoc = {
            invoice_id: insertedInvoice.id, // ربط الـ Foreign Key بالفاتورة المنشأة حالياً
            item_id: item.id || item.item_id,
            quantity: Number(item.quantity || 1),
            unit_price: Number(item.price || item.unit_price || 0)
          };
          return extractTablePayload(itemDoc, 'invoice_items');
        }).filter(Boolean);

        if (filteredItemsPayload.length > 0) {
          const { error: itemsErr } = await supabaseAdmin
            .from(`${safeSchema}.invoice_items`)
            .insert(filteredItemsPayload);
          
          if (itemsErr) console.error("⚠️ خطأ غير حرج أثناء إدراج حزمة الأصناف:", itemsErr.message);
        }
      }

      // 3. تسكين حركة الخزينة التلقائية في حال وجود كاش مدفوع
      if (invoiceData.paid_amount > 0) {
        const cashDoc = {
          invoice_id: insertedInvoice.id,
          account_id: data.account_id || 1,
          flow_type: invoiceData.invoice_type === 'sale' ? 'in' : 'out',
          amount: invoiceData.paid_amount,
          description: `دفعة نقدية تلقائية للفاتورة رقم: ${invoiceData.invoice_number}`
        };
        const filteredCash = extractTablePayload(cashDoc, 'cash_transactions');
        
        if (filteredCash) {
          const { error: cashErr } = await supabaseAdmin
            .from(`${safeSchema}.cash_transactions`)
            .insert([filteredCash]);
          
          if (cashErr) console.error("⚠️ خطأ غير حرج أثناء إدراج حركة النقدية:", cashErr.message);
        }
      }

    } else {
      // التعامل المباشر مع الجداول العادية الأخرى البسيطة
      const filteredPayload = extractTablePayload(data, targetTable);
      if (!filteredPayload) {
        throw new Error(`البيانات لا تطابق حقول جدول [${targetTable}] في الاسكيما.`);
      }

      const { data: insertedRow, error: tableErr } = await supabaseAdmin
        .from(`${safeSchema}.${targetTable}`)
        .insert([filteredPayload])
        .select()
        .single();

      if (tableErr) throw tableErr;
      responseData = insertedRow;
    }

    return res.status(200).json({ 
      success: true, 
      message: `تم تسكين البيانات والمزامنة السحابية بنجاح داخل الاسكيما [${safeSchema}] والجدول [${targetTable}]`,
      data: responseData
    });

  } catch (error) {
    console.error(`❌ فشل تسكين البيانات المباشر:`, error.message);
    return res.status(400).json({ 
      success: false, 
      error: error.message,
      details: "فشل التحقق من صحة البيانات أو قيود الجداول المباشرة."
    });
  }
}
