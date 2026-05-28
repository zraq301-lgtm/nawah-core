import React, { useState, useEffect } from 'react';
import { Package, Truck, Archive } from 'lucide-react';
import { CapacitorHttp } from '@capacitor/core'; // 🔥 استيراد محرك الجلب العابر للأندرويد

// استيراد الصفحات الثلاث
import RawMaterials from './Page/RawMaterials';
import SupplyEntry from './Page/SupplyEntry';
import FinishedProducts from './Page/FinishedProducts';

const Inventory = ({ onDeleteItem, onInventoryEntry }) => {
  // الحالة المسؤولة عن تحديد أي واجهة تظهر الآن
  const [activeTab, setActiveTab] = useState('raw');
  
  // حالات تخزين البيانات المفروزة من السيرفر
  const [rawMaterialsData, setRawMaterialsData] = useState([]);
  const [finishedProductsData, setFinishedProductsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 📥 1️⃣ دالة جلب البيانات الموحدة باستخدام CapacitorHttp وتوزيعها تلقائياً
  const fetchStockData = async () => {
    try {
      setLoading(true);
      const schema = localStorage.getItem('tenant_schema') || 'public';

      const options = {
        url: `https://project-902ma.vercel.app/api/erp/fetch?schema=${schema}&view=GET_STOCK`,
        headers: { 'Content-Type': 'application/json' }
      };

      const response = await CapacitorHttp.get(options);
      
      if (response.data && response.data.data) {
        const allItems = response.data.data;
        console.log('📦 الأصناف المجلوبة من نواة AI:', allItems);

        // 🌟 فك الفرز والتوزيع الذكي:
        // افترضنا هنا أن الجدول يحتوي على حقل باسم type أو category لتحديد طبيعة الصنف
        // قم بتعديل المسميات (مثل 'خامات' أو 'منتج نهائي') حسب الـ Value المخزنة بقاعدتك
        const raws = allItems.filter(item => item.type === 'خامات' || item.category === 'خامات');
        const finished = allItems.filter(item => item.type === 'منتج نهائي' || item.category === 'منتج نهائي');

        setRawMaterialsData(raws);
        setFinishedProductsData(finished);
      }
    } catch (error) {
      console.error('❌ خطأ أثناء جلب بيانات المخزن السحابي:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 2️⃣ تشغيل دالة الجلب التلقائي بمجرد فتح الشاشة
  useEffect(() => {
    fetchStockData();
  }, []);

  // دالة لتحديث البيانات محلياً وإعادة المزامنة عند إجراء أي حركة توريد جديدة
  const handleRefreshData = () => {
    fetchStockData();
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

      {/* منطقة عرض المحتوى مع مؤشر تحميل ذكي */}
      <div style={styles.contentArea}>
        
        {loading ? (
          <div style={styles.loadingText}>جاري مزامنة وجلب بيانات المخازن المعزولة...</div>
        ) : (
          <>
            {/* واجهة الخامات الفولاذية (تستقبل خاماتها فقط) */}
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
                  handleRefreshData(); // إعادة تحديث المخازن فور حفظ توريد جديد
                }} 
                categories={[...rawMaterialsData, ...finishedProductsData]} 
              />
            )}

            {/* واجهة المنتجات النهائية (تستقبل المنتجات التامة فقط) */}
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
