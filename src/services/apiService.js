// src/services/apiService.js
import { CapacitorHttp } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * دالة مساعدة داخلية لقراءة اسم السكيما الديناميكية المحفوظة للهاتف (Android SharedPreferences)
 */
const getActiveSchema = async () => {
  try {
    const { value } = await Preferences.get({ key: 'tenant_schema' });
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
  } catch (e) {
    console.warn("⚠️ فشل نظام الشيرد بريفرنس، الانتقال للحل الاحتياطي", e);
  }
  return localStorage.getItem('tenant_schema') || '';
};

export const apiService = {
  
  /**
   * 1️⃣ محرك جلب وتفكيك البيانات الموحد والذكي لجميع الجداول (GET)
   * @param {string} tableName - اسم الجدول (contacts, items, product_boms, production_orders, etc.)
   */
  getData: async (tableName) => {
    const activeSchema = await getActiveSchema();

    if (!activeSchema) {
      throw new Error("لم يتم العثور على بيئة عمل نشطة، يرجى تسجيل الدخول أولاً");
    }

    // بناء الرابط الموحد باستخدام السكيما واسم الجدول ديناميكياً
    const fullUrl = `https://project-902ma.vercel.app/api/erp/fetch?schema=${encodeURIComponent(activeSchema)}&table=${encodeURIComponent(tableName)}`;

    const options = {
      url: fullUrl,
      headers: { 'Content-Type': 'application/json' }
    };

    const response = await CapacitorHttp.get(options);
    
    // تأمين تحويل الرد إلى كائن جافا سكريبت سواء عاد بنص أو كائن جاهز
    const resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

    // التحقق من نجاح العملية من طرف السيرفر
    if (response.status !== 200 || !resData.success) {
      throw new Error(resData.error || `خطأ في جلب بيانات جدول ${tableName} بترميز (${response.status})`);
    }

    // 🔍 طباعة تفصيلية مريحة للـ Debugging على شاشة الموبايل
    console.log(`📡 [API Success] تم سحب وتفكيك جدول [${tableName}]:`, resData);

    // ------------------------------------------------------------------
    // 🧠 محرك التفكيك والفرز الذكي بناءً على سكيما الجداول الجديدة المحدثة
    // ------------------------------------------------------------------
    
    // [1] تفكيك جدول الجهات والحسابات المطور (contacts) لفرز العملاء والموردين والموظفين
    if (tableName === 'contacts') {
      const contactsArray = resData.data || [];
      contactsArray.categorized = resData.categorized || { customers: [], suppliers: [], employees: [], general: [] };
      return contactsArray;
    }

    // [2] تفكيك جدول الأصناف والمخزون الشامل (items) مع دعم مسمى (stock) القديم لعدم كسر الكود القديم
    if (tableName === 'items' || tableName === 'stock') {
      return resData.data || resData.items || (Array.isArray(resData) ? resData : []);
    }

    // [3] تفكيك جداول تهيئة الطبخات، المعايير ومكوناتها (product_boms / bom_ingredients)
    if (tableName === 'product_boms' || tableName === 'bom_ingredients') {
      return resData.data || resData.product_boms || resData.bom_ingredients || [];
    }

    // [4] تفكيك جدول أوامر التشغيل والإنتاج الفعلي (production_orders) ودعم الاسم القديم احتياطياً
    if (tableName === 'production_orders' || tableName === 'production_history') {
      return resData.data || resData.production_orders || [];
    }

    // [5] تفكيك جدول إدارة الهالك والفاقد (waste_records) أو (waste)
    if (tableName === 'waste_records' || tableName === 'waste') {
      return resData.data || resData.waste_records || [];
    }

    // [6] تفكيك جدول الفواتير الرئيسي وتفاصيلها (invoices / invoice_items)
    if (tableName === 'invoices' || tableName === 'invoice_items') {
      return resData.data || resData.invoices || resData.invoice_items || [];
    }

    // [7] تفكيك جداول الخزائن، البنوك وحركات النقدية (accounts / cash_transactions)
    if (tableName === 'accounts' || tableName === 'cash_transactions') {
      return resData.data || resData.accounts || resData.cash_transactions || [];
    }

    // [8] جدول الحضور والرواتب وعقود الموظفين وسجلات النظام (hr_attendance / system_logs)
    if (tableName === 'hr_attendance' || tableName === 'system_logs') {
      return resData.data || resData.hr_attendance || resData.system_logs || [];
    }

    // 🛡️ القاعدة الذهبية الاحتياطية لـ React Query: إذا لم يطابق أي جدول مخصص، نمرر المصفوفة الصافية المستخرجة
    return Array.isArray(resData) ? resData : (resData.data || []);
  },

  /**
   * 2️⃣ محرك حفظ، تعديل، وترحيل البيانات الموحد (POST)
   * @param {string} tableName - اسم الجدول المستهدف بالحفظ بناءً على السكيما الجديدة
   * @param {Object} rowData - كائن البيانات المرسل متوافقاً مع أعمدة السكيما الجديدة (يدعم extra_attributes)
   */
  createData: async (tableName, rowData = {}) => {
    const activeSchema = await getActiveSchema();

    if (!activeSchema) {
      throw new Error("لم يتم العثور على بيئة عمل نشطة، يرجى تسجيل الدخول أولاً");
    }

    // تحويل تلقائي لأسماء الجداول القديمة إلى المسميات الجديدة المحترفة قبل الرفع للسيرفر
    let targetTable = tableName;
    if (tableName === 'stock') targetTable = 'items';
    if (tableName === 'production_history') targetTable = 'production_orders';
    if (tableName === 'waste') targetTable = 'waste_records';

    const fullUrl = `https://project-902ma.vercel.app/api/erp/mutate`;

    const options = {
      url: fullUrl,
      headers: { 'Content-Type': 'application/json' },
      data: {
        table: targetTable,     // اسم الجدول المستهدف بالتعديل المحاذي للسكيما
        schema: activeSchema,   // عزل وحماية البيانات عبر السكيما الممررة
        ...rowData              // نشر كافة الحقول البرمجية المرسلة (مثل barcode, available_quantity, extra_attributes)
      }
    };

    const response = await CapacitorHttp.post(options);
    const resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

    // تأمين أكواد النجاح القياسية لقواعد البيانات (200 نجاح أو 201 تم الإنشاء بنجاح)
    if (response.status !== 200 && response.status !== 201 && !resData?.success) {
      throw new Error(resData?.error || `فشل ترحيل وحفظ البيانات بجدول ${targetTable} بترميز (${response.status})`);
    }

    console.log(`🚀 [Mutation Success] تم حفظ البيانات بنجاح في جدول [${targetTable}]:`, resData);
    return resData; // يعود بـ { success: true, message: '...' }
  }
};
