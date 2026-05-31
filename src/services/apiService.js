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
      // التحقق مما إذا كانت القيمة مخزنة كـ JSON string أو نص عادي
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
  } catch (e) {
    console.warn("فشل نظام الشيرد بريفرنس، الانتقال للحل الاحتياطي", e);
  }
  return localStorage.getItem('tenant_schema') || '';
};

export const apiService = {
  
  /**
   * 1️⃣ رابط جلب البيانات الكامل والخاص بك الذكي (GET)
   * @param {string} tableName - اسم الجدول بالإنجليزية (مثال: 'stock')
   */
  getData: async (tableName) => {
    const activeSchema = await getActiveSchema();

    if (!activeSchema) {
      throw new Error("لم يتم العثور على بيئة عمل نشطة، يرجى تسجيل الدخول أولاً");
    }

    // الرابط الخاص بك بالكامل بعد دمج السكيما والجدول ديناميكياً
    const fullUrl = `https://project-902ma.vercel.app/api/erp/fetch?schema=${encodeURIComponent(activeSchema)}&table=${encodeURIComponent(tableName)}`;

    const options = {
      url: fullUrl,
      headers: { 'Content-Type': 'application/json' }
    };

    const response = await CapacitorHttp.get(options);
    const resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

    if (response.status !== 200 || !resData.success) {
      throw new Error(resData.error || `خطأ في جلب البيانات بترميز (${response.status})`);
    }

    // 💡 محرك الدمج والتحويل الذكي لمنع اختفاء البيانات في واجهات الموردين والعملاء
    if (tableName === 'contacts') {
      const contactsArray = resData.data || [];
      contactsArray.categorized = resData.categorized || { customers: [], suppliers: [], employees: [] };
      return contactsArray;
    }

    // الرد الافتراضي لباقي جداول النظام كالمخزن والفواتير لضمان عدم كسر React Query
    return resData.data || []; 
  },

  /**
   * 2️⃣ رابط حفظ وإرسال البيانات الكامل والخاص بك (POST)
   * @param {string} tableName - اسم الجدول المستهدف بالإنجليزية (مثال: 'stock')
   * @param {Object} rowData - كائن البيانات المراد حفظه (اسم المنتج، الكمية... إلخ)
   */
  createData: async (tableName, rowData = {}) => {
    const activeSchema = await getActiveSchema();

    if (!activeSchema) {
      throw new Error("لم يتم العثور على بيئة عمل نشطة، يرجى تسجيل الدخول أولاً");
    }

    // الرابط الخاص بك بالكامل لإرسال وحفظ البيانات كما هو
    const fullUrl = `https://project-902ma.vercel.app/api/erp/mutate`;

    const options = {
      url: fullUrl,
      headers: { 'Content-Type': 'application/json' },
      data: {
        table: tableName,       // إرسال اسم الجدول للباك إند
        schema: activeSchema,   // إرسال السكيما تلقائياً لعزل الموارد
        ...rowData              // دمج حقول البيانات المرسلة
      }
    };

    const response = await CapacitorHttp.post(options);
    const resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

    if (response.status !== 200 && response.status !== 201 && !resData?.success) {
      throw new Error(resData?.error || `فشل ترحيل البيانات بترميز (${response.status})`);
    }

    return resData; // يعيد { success: true, message: '...' }
  }
};
