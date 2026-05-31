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

  // 🌟 محرك الفرز والتوزيع الذكي المتوافق تماماً مع السكيما المركزية لجدول (items)
  useEffect(() => {
    // 🛡️ حزام أمان ثلاثي الطبقات: استخراج المصفوفة الصافية أينما اختبأت داخل رد الـ API
    let itemsList = [];
    if (Array.isArray(stockData)) {
      itemsList = stockData;
    } else if (stockData && Array.isArray(stockData.data)) {
      itemsList = stockData.data;
    } else if (stockData && Array.isArray(stockData.items)) {
      itemsList = stockData.items;
    }

    if (itemsList && itemsList.length > 0) {
      console.log('📦 [Inventory Logic] جاري معالجة وفرز الأصناف:', itemsList);
      
      const raws = [];
      const finished = [];

      itemsList.forEach(item => {
        if (!item) return;

        // تنظيف القيم النصية لضمان دقة المقارنة وتجنب أخطاء حقول الـ null
        const itemType = (item.item_type || item.type || item.category || '').toString().trim().toLowerCase();
        const itemName = (item.name || '').toString().trim().toLowerCase();
        
        // 1️⃣ الفرز الصارم للمنتجات التامة (إذا كان النوع product، أو الاسم يحتوي على الكلمات الدلالية)
        if (
          itemType === 'product' || 
          itemType === 'منتج نهائي' || 
          itemName.includes('معمول') || 
          itemName.includes('جاهز')
        ) {
          finished.push(item);
        } 
        // 2️⃣ ما عدا ذلك يصنف تلقائياً كخامات ومواد أولية (حزام أمان لعدم ضياع أي صنف)
        else {
          raws.push(item);
        }
      });

      setRawMaterialsData(raws);
      setFinishedProductsData(finished);
    } else {
      setRawMaterialsData([]);
      setFinishedProductsData([]);
    }
  }, [stockData]); // يراقب مصفوفة البيانات المركزية القادمة من React Query في الملف الأب

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
    activeTab: { background: '#4f46e5', color: '#fff', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' },
    contentArea: { marginTop: '10px' },
    loadingText: { textAlign: 'center', padding: '30px', color: '#4f46e5', fontWeight: 'bold' }
  };

  return (
    <div style={styles.container}>
      {/* شريط التنقل العلوي المتجاوب تماماً مع الهاتف المحمول */}
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
            {/* 1️⃣ واجهة المواد الخام */}
            {activeTab === 'raw' && (
              <RawMaterials 
                categories={rawMaterialsData} 
                onDeleteItem={onDeleteItem} 
                onRefresh={handleRefreshData}
                onSelectForPurchase={onSelectForPurchase} 
              />
            )}

            {/* 2️⃣ واجهة تسجيل حركة التوريد (تستقبل المخزن كاملاً ومدمجاً لإجراء عمليات الجرد السريع والتوريد) */}
            {activeTab === 'supply' && (
              <SupplyEntry 
                onInventoryEntry={async (entryData) => {
                  await onInventoryEntry(entryData);
                  handleRefreshData(); 
                }} 
                categories={[...rawMaterialsData, ...finishedProductsData]} 
              />
            )}

            {/* 3️⃣ واجهة المنتجات النهائية */}
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
