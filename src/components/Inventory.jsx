// src/components/Inventory.jsx
import React, { useState, useEffect } from 'react';
import { Package, Truck, Archive } from 'lucide-react';

// استيراد الصفحات الداخلية للمخزن
import RawMaterials from './Page/RawMaterials';
import SupplyEntry from './Page/SupplyEntry';
import FinishedProducts from './Page/FinishedProducts';

const Inventory = ({ 
  onDeleteItem, 
  onInventoryEntry, 
  stockData = [], 
  loading = false, 
  onRefresh, 
  onSelectForPurchase 
}) => {
  
  // الحالة المسؤولة عن تحديد التبويب النشط
  const [activeTab, setActiveTab] = useState('raw');
  
  // حالات تخزين البيانات المفروزة محلياً
  const [rawMaterialsData, setRawMaterialsData] = useState([]);
  const [finishedProductsData, setFinishedProductsData] = useState([]);

  // 🧠 محرك الفرز والتوزيع الاحترافي للأصناف بناءً على السكيما المركزية
  useEffect(() => {
    // استخراج المصفوفة الصافية بأمان
    const itemsList = Array.isArray(stockData) 
      ? stockData 
      : (stockData?.data || stockData?.items || []);

    if (itemsList && itemsList.length > 0) {
      const raws = [];
      const finished = [];

      itemsList.forEach((item) => {
        if (!item) return;

        // تهيئة القيم النصية للمقارنة وتفادي أخطاء الـ Null والفراغات
        const itemType = (item.item_type || item.type || item.category || '').toString().trim().toLowerCase();
        const itemName = (item.name || '').toString().trim().toLowerCase();

        // تصفية المنتجات التامة بناءً على النوع أو الكلمات المفتاحية بالسكيما
        if (
          itemType === 'product' || 
          itemType === 'منتج نهائي' || 
          itemType === 'منتجات' ||
          itemName.includes('معمول') || 
          itemName.includes('جاهز')
        ) {
          finished.push(item);
        } else {
          // أي صنف آخر يتم إدراجه تلقائياً كخامة لضمان عدم اختفائه
          raws.push(item);
        }
      });

      setRawMaterialsData(raws);
      setFinishedProductsData(finished);
    } else {
      setRawMaterialsData([]);
      setFinishedProductsData([]);
    }
  }, [stockData]);

  // دالة تحديث البيانات المركزية
  const handleRefreshData = () => {
    if (typeof onRefresh === 'function') {
      onRefresh();
    }
  };

  // تنسيقات الواجهة (تأخذ طابع نظام زاد الخير الاحترافي الأزرق)
  const styles = {
    container: { 
      padding: '15px', 
      direction: 'rtl', 
      backgroundColor: '#f0f4f8', 
      minHeight: '100vh', 
      fontFamily: "'Tajawal', sans-serif" 
    },
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
    activeTab: { 
      background: '#4f46e5', 
      color: '#fff', 
      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' 
    },
    contentArea: { marginTop: '10px' },
    loadingText: { 
      textAlign: 'center', 
      padding: '30px', 
      color: '#4f46e5', 
      fontWeight: 'bold' 
    }
  };

  return (
    <div style={styles.container}>
      
      {/* شريط تبويبات المخزن */}
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

      {/* منطقة رندر واجهات المخزن */}
      <div style={styles.contentArea}>
        {loading ? (
          <div style={styles.loadingText}>🔄 جاري مزامنة بيانات المخازن وتحديث كميات الأصناف...</div>
        ) : (
          <>
            {/* 1️⃣ تبويب المواد الخام */}
            {activeTab === 'raw' && (
              <RawMaterials 
                categories={rawMaterialsData} 
                onDeleteItem={onDeleteItem} 
                onRefresh={handleRefreshData}
                onSelectForPurchase={onSelectForPurchase} 
              />
            )}

            {/* 2️⃣ تبويب حركة التوريد والجرد */}
            {activeTab === 'supply' && (
              <SupplyEntry 
                onInventoryEntry={async (entryData) => {
                  await onInventoryEntry(entryData);
                  handleRefreshData(); 
                }} 
                categories={[...rawMaterialsData, ...finishedProductsData]} 
              />
            )}

            {/* 3️⃣ تبويب المنتجات الجاهزة والبيع */}
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
