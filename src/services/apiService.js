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

    // 💡 محرك الدمج والتحويل الذكي لمنع اختفاء البيانات في الواجهات
    if (tableName === 'contacts') {
      // ندمج الحقل المفلتر 'categorized' مباشرة داخل المصفوفة الأساسية 
      // لكي تقرأها صفحات العملاء والموردين كيفما كانت طريقة برمجتها
      const contactsArray = resData.data || [];
      contactsArray.categorized = resData.categorized || { customers: [], suppliers: [], employees: [] };
      return contactsArray;
    }

    // الرد الافتراضي لباقي جداول النظام كالمخزن والفواتير لضمان عدم كسر React Query
    return resData.data || []; 
  },
