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
   * @param {string} tableName - اسم الجدول (contacts, items, invoices, accounts, etc.)
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
    // 🧠 محرك التفكيك والفرز الذكي بناءً على سكيما الجداول الافتراضية
    // ------------------------------------------------------------------
    
    // [1] تفكيك جدول الجهات (contacts) لضمان عدم اختفاء واجهات العملاء والموردين
    if (tableName === 'contacts') {
      const contactsArray = resData.data || [];
      contactsArray.categorized = resData.categorized || { customers: [], suppliers: [], employees: [] };
      return contactsArray;
    }

    // [2] تفكيك جدول الأصناف والمخزون (items) أو الاستدعاء القديم (stock)
    if (tableName === 'items' || tableName === 'stock') {
      return resData.data || resData.items || (Array.isArray(resData) ? resData : []);
    }

    // [3] تفكيك جدول الفواتير الرئيسي وتفاصيلها (invoices / invoice_items)
    if (tableName === 'invoices' || tableName === 'invoice_items') {
      return resData.data || resData.invoices || resData.invoice_items || [];
    }

    // [4] تفكيك جداول الحسابات والنقدية (accounts / cash_transactions)
    if (tableName === 'accounts' || tableName === 'cash_transactions') {
      return resData.data || resData.accounts || resData.transactions || [];
    }

    // [5] جدول الحضور والرواتب وسجلات النظام (hr_attendance / system_logs)
    if (tableName === 'hr_attendance' || tableName === 'system_logs') {
      return resData.data || resData.logs || resData.attendance || [];
    }

    // 🛡️ القاعدة الذهبية الاحتياطية لـ React Query: إذا لم يطابق أي جدول مخصص، نمرر المصفوفة الصافية المستخرجة
    return Array.isArray(resData) ? resData : (resData.data || []);
  },

  /**
   * 2️⃣ محرك حفظ، تعديل، وترحيل البيانات الموحد (POST)
   * @param {string} tableName - اسم الجدول المستهدف بالحفظ
   * @param {Object} rowData - كائن البيانات المرسل متوافقاً مع أعمدة السكيما
   */
  createData: async (tableName, rowData = {}) => {
    const activeSchema = await getActiveSchema();

    if (!activeSchema) {
      throw new Error("لم يتم العثور على بيئة عمل نشطة، يرجى تسجيل الدخول أولاً");
    }

    const fullUrl = `https://project-902ma.vercel.app/api/erp/mutate`;

    const options = {
      url: fullUrl,
      headers: { 'Content-Type': 'application/json' },
      data: {
        table: tableName,       // اسم الجدول المستهدف بالتعديل أو الإضافة
        schema: activeSchema,   // عزل وحماية البيانات عبر السكيما الممررة
        ...rowData              // نشر كافة الحقول البرمجية المرسلة (مثل barcode, available_quantity)
      }
    };

    const response = await CapacitorHttp.post(options);
    const resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

    // تأمين أكواد النجاح القياسية لقواعد البيانات (200 نجاح أو 201 تم الإنشاء بنجاح)
    if (response.status !== 200 && response.status !== 201 && !resData?.success) {
      throw new Error(resData?.error || `فشل ترحيل وحفظ البيانات بجدول ${tableName} بترميز (${response.status})`);
    }

    console.log(`🚀 [Mutation Success] تم حفظ البيانات بنجاح في جدول [${tableName}]:`, resData);
    return resData; // يعود بـ { success: true, message: '...' }
  }
};
