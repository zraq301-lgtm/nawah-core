// src/components/Inventory.jsx
import React, { useState, useEffect } from 'react';
import { Package, Truck, Archive } from 'lucide-react';

// استيراد الصفحات الثلاث
import RawMaterials from './Page/RawMaterials';
import SupplyEntry from './Page/SupplyEntry';
import FinishedProducts from './Page/FinishedProducts';

const Inventory = ({ onDeleteItem, onInventoryEntry, stockData = [], loading = false, onRefresh, onSelectForPurchase }) => {
  // الحالة المسؤولة عن تحديد أي واجهة تظهر الآن
  const [activeTab, setActiveTab] = useState('raw');
  
  // حالات تخزين البيانات المفروزة والموزعة محلياً
  const [rawMaterialsData, setRawMaterialsData] = useState([]);
  const [finishedProductsData, setFinishedProductsData] = useState([]);

  // 🌟 محرك الفرز والتوزيع الذكي المتوافق تماماً مع السكيما المركزية (items)
  useEffect(() => {
    // 🛡️ حزام أمان: استخراج المصفوفة بشكل صحيح سواء كانت قادمة مباشرة أو داخل كائن (stockData.items)
    const itemsList = Array.isArray(stockData) 
      ? stockData 
      : (stockData?.items || stockData?.data || []);

    if (itemsList && itemsList.length > 0) {
      console.log('📦 الأصناف المكتشفة وجاري فرزها داخل المخزن:', itemsList);
      
      // الفرز الفولاذي بناءً على الحقل الأصيل بالسكيما item_type مع دعم الفلاتر النصية كحزام أمان إضافي
      const raws = itemsList.filter(item => {
        const type = (item?.item_type || item?.type || '').toLowerCase();
        const name = (item?.name || '').toLowerCase();
        
        // الصنف يعتبر مادة خام إذا كان نوعه مادة خام، أو اسمه لا يحتوي على المنتجات المصنعة كالمعمول والجاهز
        return type === 'raw_material' || type === 'خامات' || (!(name.includes("معمول") || name.includes("جاهز")));
      });

      const finished = itemsList.filter(item => {
        const type = (item?.item_type || item?.type || '').toLowerCase();
        const name = (item?.name || '').toLowerCase();
        
        // الصنف يعتبر منتج نهائي تام الصنع إذا كان يحمل النوع أو يحتوي على الكلمات المفتاحية للبيع
        return type === 'product' || type === 'منتج نهائي' || name.includes("معمول") || name.includes("جاهز");
      });

      setRawMaterialsData(raws);
      setFinishedProductsData(finished);
    } else {
      setRawMaterialsData([]);
      setFinishedProductsData([]);
    }
  }, [stockData]); // يتم إعادة الفرز تلقائياً وفوراً عند حدوث أي حركة مشتريات أو سحب سحابية

  // دالة لتحديث البيانات من خلال استدعاء دالة التحديث الممررة من الـ App
  const handleRefreshData = () => {
    if (typeof onRefresh === 'function') {
      onRefresh();
    }
  };

  const styles = {
    container: { padding: '15px', direction: 'rtl', backgroundColor: '#f0f4f8', minHeight: '100vh', fontFamily: "'Tajawal', sans-serif" },
    tabContainer: { 
      display: 'flex', 
      background: '#fff', 
      borderRadius: '20px', 
      padding: '8px', 
      marginBottom: '20px', 
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      position: 'sticky',
      top: '10px',
      zIndex: 10
    },
    tab: { 
      flex: 1, 
      padding: '12px', 
      textAlign: 'center', 
      borderRadius: '15px', 
      cursor: 'pointer', 
      transition: '0.3s', 
      fontWeight: 'bold', 
      color: '#64748b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '14px',
      userSelect: 'none'
    },
    activeTab: { background: '#4f46e5', color: '#fff', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }, // تغيير الأخضر للأزرق الاحترافي ليتناسق مع لوحة التوريد والموردين
    contentArea: { marginTop: '10px' },
    loadingText: { textAlign: 'center', padding: '30px', color: '#4f46e5', fontWeight: 'bold' }
  };

  return (
    <div style={styles.container}>
      {/* شريط التنقل العلوي المريح للعمل من الهاتف المحمول */}
      <div style={styles.tabContainer}>
        <div 
          style={{...styles.tab, ...(activeTab === 'raw' ? styles.activeTab : {})}} 
          onClick={() => setActiveTab('raw')}
        >
          <Archive size={18} /> المواد الخام
        </div>
        <div 
          style={{...styles.tab, ...(activeTab === 'supply' ? styles.activeTab : {})}} 
          onClick={() => setActiveTab('supply')}
        >
          <Truck size={18} /> تسجيل حركة توريد
        </div>
        <div 
          style={{...styles.tab, ...(activeTab === 'finished' ? styles.activeTab : {})}} 
          onClick={() => setActiveTab('finished')}
        >
          <Package size={18} /> المنتجات النهائية
        </div>
      </div>

      {/* منطقة عرض المحتوى مع مؤشر تحميل وعرض مرن */}
      <div style={styles.contentArea}>
        
        {loading ? (
          <div style={styles.loadingText}>🔄 جاري مزامنة بيانات المخازن وتحديث كميات الأصناف...</div>
        ) : (
          <>
            {/* 1️⃣ واجهة المواد الخام (تم ربطها بدالة سحب المشتريات والفرز الدقيق) */}
            {activeTab === 'raw' && (
              <RawMaterials 
                categories={rawMaterialsData} 
                onDeleteItem={onDeleteItem} 
                onRefresh={handleRefreshData}
                onSelectForPurchase={onSelectForPurchase} // تمرير دالة سحب المشتريات للواجهة الداخلية
              />
            )}

            {/* 2️⃣ واجهة تسجيل حركة التوريد (تستقبل جميع الأصناف لإمكانية تعديل كميات أي صنف) */}
            {activeTab === 'supply' && (
              <SupplyEntry 
                onInventoryEntry={async (entryData) => {
                  await onInventoryEntry(entryData);
                  handleRefreshData(); // استدعاء التحديث المركزي الفوري فور حفظ حركة توريد لتحديث الكميات المتاحة
                }} 
                categories={[...rawMaterialsData, ...finishedProductsData]} 
              />
            )}

            {/* 3️⃣ واجهة المنتجات النهائية تام الصنع */}
            {activeTab === 'finished' && (
              <FinishedProducts 
                categories={finishedProductsData} 
                onDeleteItem={onDeleteItem} 
                onRefresh={handleRefreshData}
              />
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default Inventory;
