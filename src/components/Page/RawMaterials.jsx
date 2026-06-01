// src/components/RawMaterials.jsx
import React, { useState } from 'react';
import { Trash2, Layers, Package, BarChart3, AlertTriangle, Barcode, ShoppingCart, Search, RefreshCw } from 'lucide-react';

// 🚀 استيراد أدوات إدارة الكاش والمزامنة السحابية الفورية
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

const RawMaterials = ({ onDeleteItem, onSelectForPurchase }) => {
  const queryClient = useQueryClient(); // محرك إنعاش الكاش عند الحذف أو التعديل
  const [searchTerm, setSearchTerm] = useState('');

  // 📥 تشغيل محرك المزامنة الذكي لجلب المخزن كاملاً سحابياً تلقائياً
  const { data: stockData = [], isLoading, refetch } = useQuery({
    queryKey: ['stock'],
    queryFn: () => apiService.getData('stock'), // السيرفر سيترجمها لـ items تلقائياً
    staleTime: 1000 * 60 * 2, // كاش طازج لمدة دقيقتين
  });

  // 🛡️ حزام أمان لاستخراج المصفوفة الصافية سواء كانت قادمة مباشرة أو مغلفة داخل كائن data
  const itemsList = Array.isArray(stockData) 
    ? stockData 
    : (stockData?.data || stockData?.items || []);

  // 🔄 تصفية وعزل الخامات فقط (استبعاد المنتجات النهائية كالمعمول والجاهز) بناءً على حقل الاسم والنوع
  const rawData = itemsList.filter(item => {
    if (!item) return false;
    const itemName = (item.name || '').toString().toLowerCase();
    const itemType = (item.item_type || item.type || item.category || '').toString().toLowerCase();
    
    // استبعاد لو كان منتج نهائي
    return !(
      itemType === 'product' || 
      itemType === 'منتج نهائي' || 
      itemType === 'منتجات' ||
      itemName.includes("معمول") || 
      itemName.includes("جاهز")
    );
  });

  // محرك البحث الذكي (البحث بالاسم أو الباركود)
  const filteredRawData = rawData.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.barcode || '').includes(searchTerm)
  );

  // دالة الحذف المعززة بإنعاش الكاش الفوري
  const handleDelete = async (id, name) => {
    if (window.confirm(`هل أنت متأكد من حذف خامة: ${name} من شجرة المخازن؟`)) {
      if (onDeleteItem) {
        await onDeleteItem(id);
        // كسر الكاش وإجبار السيرفر على جلب قائمة جرد جديدة
        await queryClient.invalidateQueries({ queryKey: ['stock'] });
      }
    }
  };

  return (
    <div style={{ padding: '5px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      
      {/* 🔍 شريط البحث الذكي + زر التحديث اليدوي */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', right: '14px', top: '14px', color: '#94a3b8' }} size={18} />
          <input 
            className="glass-input" 
            placeholder="ابحث عن خامة بالاسم أو الباركود..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ paddingRight: '42px', width: '100%', boxSizing: 'border-box', borderRadius: '12px' }} 
          />
        </div>
        <button 
          onClick={() => refetch()} 
          style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="تحديث البيانات من السيرفر"
        >
          <RefreshCw size={18} color="#4f46e5" className={isLoading ? "spin-animation" : ""} />
        </button>
      </div>

      {/* ⏳ حالة جاري التحميل */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#4f46e5', fontWeight: 'bold' }}>
          🔄 جاري سحب الخامات والمواد الأولية من نيون...
        </div>
      ) : filteredRawData.length > 0 ? (
        filteredRawData.map((item, index) => {
          const currentId = item?.id || index;
          const availableQty = Number(item?.available_quantity || item?.quantity || item?.balance || 0); 
          const costPrice = Number(item?.cost_price || item?.price || 0); 
          const itemBarcode = item?.barcode || 'بدون باركود';
          const itemName = item?.name || 'صنف غير مسمى';
          
          const isLowStock = availableQty <= 5;

          return (
            <div 
              key={currentId} 
              className="glass-card" 
              style={{ 
                marginBottom: '12px', 
                padding: '16px', 
                position: 'relative',
                backgroundColor: '#fff',
                borderRadius: '15px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                borderRight: isLowStock ? '4px solid #ef4444' : '4px solid #4f46e5',
                transition: 'transform 0.2s'
              }}
            >
              {/* السطر الأول: اسم الخامة + الباركود + أزرار التحكم */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} color={isLowStock ? "#ef4444" : "#4f46e5"} />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', fontWeight: '700' }}>
                      {itemName}
                    </h3>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    <Barcode size={12} />
                    <span>الباركود: {itemBarcode}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {onSelectForPurchase && (
                    <button
                      onClick={() => onSelectForPurchase(item)}
                      style={{
                        background: 'rgba(79, 70, 229, 0.1)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        color: '#4f46e5',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}
                    >
                      <ShoppingCart size={14} /> لشراء خامة
                    </button>
                  )}

                  <button 
                    onClick={() => handleDelete(currentId, itemName)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="حذف الخامة من المخزن"
                  >
                    <Trash2 size={18} color="#ef4444" style={{ opacity: 0.8 }} />
                  </button>
                </div>
              </div>

              {/* مؤشر مرئي في حالة انخفاض المخزون */}
              {isLowStock && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c', fontSize: '0.75rem', marginBottom: '10px', background: '#fef2f2', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}>
                  <AlertTriangle size={12} />
                  <span>مخزون حرج! سيتم تحديثه تلقائياً فور حفظ حركة توريد</span>
                </div>
              )}

              {/* السطر الثاني: الكميات والأسعار المتزامنة بالكامل */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                
                <div style={{ 
                  flex: 1, 
                  background: isLowStock ? 'rgba(239, 68, 68, 0.05)' : 'rgba(79, 70, 229, 0.03)', 
                  padding: '10px', 
                  borderRadius: '10px', 
                  textAlign: 'center',
                  border: '1px solid rgba(226, 232, 240, 0.8)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Package size={12} /> الكمية المتاحة بالمخزن
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isLowStock ? '#ef4444' : '#1e293b' }}>
                    {availableQty}
                  </span>
                </div>

                <div style={{ 
                  flex: 1, 
                  background: 'rgba(39, 174, 96, 0.03)', 
                  padding: '10px', 
                  borderRadius: '10px', 
                  textAlign: 'center',
                  border: '1px solid rgba(226, 232, 240, 0.8)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <BarChart3 size={12} /> سعر تكلفة الشراء
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#27ae60' }}>
                    {costPrice} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>ج.م</span>
                  </span>
                </div>

              </div>

            </div>
          );
        })
      ) : (
        <div style={{ background: '#fff', borderRadius: '15px', textAlign: 'center', padding: '4px', color: '#94a3b8', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '30px' }}>
            <Package size={36} style={{ marginBottom: '8px', opacity: 0.4, color: '#4f46e5' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>لا توجد مواد خام مسجلة تطابق بحثك حالياً</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default RawMaterials;
