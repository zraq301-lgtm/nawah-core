// داخل ملف src/components/Inventory.jsx
// استبدل الـ useEffect القديم بهذا الـ useEffect الفولاذي:

useEffect(() => {
  // 🛡️ حزام أمان لاستخراج المصفوفة الصافية
  let itemsList = [];
  if (Array.isArray(stockData)) {
    itemsList = stockData;
  } else if (stockData && Array.isArray(stockData.data)) {
    itemsList = stockData.data;
  } else if (stockData && Array.isArray(stockData.items)) {
    itemsList = stockData.items;
  }

  // 🚨 اختبار الفحص لـ زاد الخير ERP:
  console.log("📢 [فحص المخزن] البيانات الخام القادمة من السيرفر مباشرة هي:", stockData);
  console.log("💡 [فحص المخزن] المصفوفة المستخرجة الجاهزة للفرز:", itemsList);

  if (itemsList && itemsList.length > 0) {
    const raws = [];
    const finished = [];

    itemsList.forEach((item, index) => {
      if (!item) return;

      // طباعة تفاصيل كل صنف في الكونسول لنعرف مسميات الحقول الدقيقة (item_type أم type؟)
      console.log(`🔍 صنف رقم [${index}]:`, { 
        name: item.name, 
        item_type: item.item_type, 
        type: item.type, 
        category: item.category 
      });

      // تحويل القيم لنصوص صغيرة لتفادي مشاكل الفراغات وحالة الأحرف
      const itemType = (item.item_type || item.type || item.category || '').toString().trim().toLowerCase();
      const itemName = (item.name || '').toString().trim().toLowerCase();
      
      // 🕵️ شروط الفرز المحدثة والموسعة جداً:
      if (
        itemType === 'product' || 
        itemType === 'منتج نهائي' || 
        itemType === 'منتجات' ||
        itemName.includes('معمول') || 
        itemName.includes('جاهز')
      ) {
        finished.push(item);
      } else {
        // أي شيء آخر يذهب كـ مادة خام (هكذا نضمن عدم اختفاء أي صنف حتى لو لم يطابق الشروط)
        raws.push(item);
      }
    });

    // 🛡️ حزام أمان نهائي: إذا فشل الفرز وخرجت المصفوفات فارغة رغم وجود بيانات بالسيرفر
    if (raws.length === 0 && finished.length === 0 && itemsList.length > 0) {
      console.warn("⚠️ تحذير: شروط الفرز لم تطابق أي صنف، تم تحويل كل البيانات لقسم الخامات كإجراء احتياطي.");
      setRawMaterialsData(itemsList); // عرض الكل في الخامات مؤقتاً لكي لا تظهر الشاشة فارغة
      setFinishedProductsData([]);
    } else {
      setRawMaterialsData(raws);
      setFinishedProductsData(finished);
    }

  } else {
    // إذا كانت البيانات القادمة من السيرفر فارغة فعلياً
    console.log("❌ [فحص المخزن] السيرفر أرجع مصفوفة فارغة تماماً لا تحتوي على أي أصناف.");
    setRawMaterialsData([]);
    setFinishedProductsData([]);
  }
}, [stockData]);
