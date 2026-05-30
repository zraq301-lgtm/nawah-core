import React, { useState, useEffect } from 'react';
import { Package, Truck, Archive } from 'lucide-react';

// استيراد الصفحات الثلاث
import RawMaterials from './Page/RawMaterials';
import SupplyEntry from './Page/SupplyEntry';
import FinishedProducts from './Page/FinishedProducts';

const Inventory = ({ onDeleteItem, onInventoryEntry, stockData = [], loading = false, onRefresh }) => {
  // الحالة المسؤولة عن تحديد أي واجهة تظهر الآن
  const [activeTab, setActiveTab] = useState('raw');
  
  // حالات تخزين البيانات المفروزة والموزعة محلياً
  const [rawMaterialsData, setRawMaterialsData] = useState([]);
  const [finishedProductsData, setFinishedProductsData] = useState([]);

  // 🌟 دالة الفرز والتوزيع الذكي بناءً على البيانات المستلمة من كود الـ App الرئيسي
  useEffect(() => {
    if (stockData && stockData.length > 0) {
      console.log('📦 الأصناف المستلمة من كود الـ App داخل المخزن:', stockData);
      
      // فك الفرز والتوزيع بناءً على الهيكل السحابي والمعياري:
      const raws = stockData.filter(item => item.item_type === 'raw_material' || item.type === 'خامات' || item.category === 'خامات');
      const finished = stockData.filter(item => item.item_type === 'product' || item.type === 'منتج نهائي' || item.category === 'منتج نهائي');

      setRawMaterialsData(raws);
      setFinishedProductsData(finished);
    } else {
      setRawMaterialsData([]);
      setFinishedProductsData([]);
    }
  }, [stockData]); // يتم إعادة الفرز تلقائياً فور تغير البيانات القادمة من الـ App

  // دالة لتحديث البيانات من خلال استدعاء دالة التحديث الممررة من الـ App
  const handleRefreshData = () => {
    if (typeof onRefresh === 'function') {
      onRefresh();
    }
  };

  const styles = {
    container: { padding: '15px', direction: 'rtl', backgroundColor: '#f0f4f8', minHeight: '100vh' },
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
      fontSize: '14px'
    },
    activeTab: { background: '#22c55e', color: '#fff' },
    contentArea: { marginTop: '10px' },
    loadingText: { textAlign: 'center', padding: '20px', color: '#64748b', fontWeight: 'bold' }
  };

  return (
    <div style={styles.container}>
      {/* شريط التنقل */}
      <div style={styles.tabContainer}>
        <div 
          style={{...styles.tab, ...(activeTab === 'raw' ? styles.activeTab : {})}} 
          onClick={() => setActiveTab('raw')}
        >
          <Archive size={18} /> الخامات
        </div>
        <div 
          style={{...styles.tab, ...(activeTab === 'supply' ? styles.activeTab : {})}} 
          onClick={() => setActiveTab('supply')}
        >
          <Truck size={18} /> توريد
        </div>
        <div 
          style={{...styles.tab, ...(activeTab === 'finished' ? styles.activeTab : {})}} 
          onClick={() => setActiveTab('finished')}
        >
          <Package size={18} /> منتجات
        </div>
      </div>

      {/* منطقة عرض المحتوى مع مؤشر تحميل ذكي مستلم من الأب */}
      <div style={styles.contentArea}>
        
        {loading ? (
          <div style={styles.loadingText}>جاري مزامنة وجلب بيانات المخازن المعزولة...</div>
        ) : (
          <>
            {/* واجهة الخامات الفولاذية (تستقبل خاماتها المفرزة) */}
            {activeTab === 'raw' && (
              <RawMaterials 
                categories={rawMaterialsData} 
                onDeleteItem={onDeleteItem} 
                onRefresh={handleRefreshData}
              />
            )}

            {/* واجهة تسجيل التوريد */}
            {activeTab === 'supply' && (
              <SupplyEntry 
                onInventoryEntry={async (entryData) => {
                  await onInventoryEntry(entryData);
                  handleRefreshData(); // استدعاء التحديث المركزي فور حفظ حركة توريد جديدة
                }} 
                categories={[...rawMaterialsData, ...finishedProductsData]} 
              />
            )}

            {/* واجهة المنتجات النهائية (تستقبل المنتجات التامة المفرزة) */}
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
