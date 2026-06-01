// src/components/Page/RawMaterials.jsx
import React, { useState } from 'react';
import { Trash2, Layers, Package, BarChart3, AlertTriangle, Barcode, ShoppingCart, Search, RefreshCw, DollarSign } from 'lucide-react';

// 🚀 استيراد أدوات إدارة الكاش والمزامنة السحابية الفورية من React Query
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';

const RawMaterials = ({ onDeleteItem, onSelectForPurchase }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // 📥 جلب بيانات جدول الأصناف (items) سحابياً وبشكل مباشر من السكيما
  // ملاحظة: الـ API الموحد fetch.js مبرمج لاستقبال اسم الجدول وتحويل 'stock' إلى 'items' تلقائياً
  const { data: stockResponse, isLoading, refetch } = useQuery({
    queryKey: ['stock'],
    queryFn: () => apiService.getData('stock'),
    staleTime: 1000 * 60 * 2, // كاش طازج لمدة دقيقتين
  });

  // 🛡️ حزام الأمان الفولاذي لاستخراج المصفوفة الصافية من رد السيرفر (data)
  const itemsList = Array.isArray(stockResponse)
    ? stockResponse
    : (stockResponse?.data || stockResponse?.items || []);

  // 🔄 الفرز الصارم بناءً على السكيما الموحدة: عزل المواد الخام فقط واستبعاد المنتجات الجاهزة والمعمول
  let rawMaterialsData = itemsList.filter(item => {
    if (!item) return false;
    
    // تحويل الحقول لنصوص صغيرة لمنع أخطاء حالة الأحرف
    const itemType = (item.item_type || '').toString().toLowerCase().trim();
    const itemName = (item.name || '').toString().toLowerCase().trim();

    // 🎯 الفرز الذكي: إذا كان النوع صراحة مادة خام، أو الاسم لا يحتوي على الكلمات البيعية (معمول / جاهز)
    return (
      itemType === 'raw_material' || 
      itemType === 'خامة' || 
      itemType === 'مواد خام' ||
      (!itemName.includes('معمول') && !itemName.includes('جاهز') && itemType !== 'product')
    );
  });

  // 🚨 خط الدفاع الاحتياطي: إذا لم يتم العثور على خامات مفروزة، اعرض القائمة كاملة لتجنب الشاشة البيضاء
  if (rawMaterialsData.length === 0 && itemsList.length > 0) {
    rawMaterialsData = itemsList;
  }

  // 🔍 محرك البحث الفوري (بالاسم أو الباركود) المتوافق مع حقول السكيما
  const filteredRawData = rawMaterialsData.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.barcode || '').includes(searchTerm)
  );

  // دالة الحذف المعززة بإنعاش الكاش الفوري لجدول الـ items
  const handleDelete = async (id, name) => {
    if (window.confirm(`هل أنت متأكد من حذف خامة: ${name} نهائياً من جدول الأصناف؟`)) {
      if (onDeleteItem) {
        await onDeleteItem(id);
        // كسر الكاش وإجبار السيرفر على جلب قائمة جرد جديدة ومحدثة
        await queryClient.invalidateQueries({ queryKey: ['stock'] });
      }
    }
  };

  return (
    <div style={{ padding: '5px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      
      {/* 🔍 شريط البحث الذكي + زر التحديث اليدوي السحابي */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', right: '14px', top: '14px', color: '#94a3b8' }} size={18} />
          <input 
            className="glass-input" 
            placeholder="ابحث عن خامة بالاسم أو الباركود التابع للسكيما..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ paddingRight: '42px', width: '100%', boxSizing: 'border-box', borderRadius: '12px' }} 
          />
        </div>
        <button 
          onClick={() => refetch()} 
          style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="سحب فوري للمخزون من نيون"
        >
          <RefreshCw size={18} color="#4f46e5" className={isLoading ? "spin-animation" : ""} />
        </button>
      </div>

      {/* ⏳ حالة جاري جلب البيانات من Neon */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#4f46e5', fontWeight: 'bold' }}>
          🔄 جاري الاتصال بالسكيما وسحب المواد الخام...
        </div>
      ) : filteredRawData.length > 0 ? (
        filteredRawData.map((item, index) => {
          // 🛡️ ربط الحقول الفعلي والآمن بمسميات السكيما (items) الخاصة بـ زاد الخير
          const currentId = item?.id || index;
          const itemName = item?.name || 'صنف غير مسمى';
          const itemBarcode = item?.barcode || 'بدون باركود';
          const availableQty = Number(item?.available_quantity || 0); 
          const costPrice = Number(item?.cost_price || 0); 
          const salePrice = Number(item?.sale_price || 0); 
          
          // تحديد مستوى الخطر بناءً على الكمية المتاحة بالسكيما (5 وحدات أو أقل)
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
              {/* السطر الأول: الاسم والباركود وأزرار المشتريات والحذف */}
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
                    <span>الباركود القياسي: {itemBarcode}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* 🛒 تحويل الصنف مباشرة لفاتورة المشتريات كمادة خام للتوريد */}
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
                      <ShoppingCart size={14} /> شراء خامة
                    </button>
                  )}

                  {/* حذف الصنف من جدول الـ items */}
                  <button 
                    onClick={() => handleDelete(currentId, itemName)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="حذف الخامة من قاعدة البيانات"
                  >
                    <Trash2 size={18} color="#ef4444" style={{ opacity: 0.8 }} />
                  </button>
                </div>
              </div>

              {/* تحذير المخزون الحرج المرتبط بـ الـ Trigger التلقائي */}
              {isLowStock && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c', fontSize: '0.75rem', marginBottom: '10px', background: '#fef2f2', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}>
                  <AlertTriangle size={12} />
                  <span>مخزون حرج! سيتم زيادته تلقائياً بواسطة السيستم فور حفظ فاتورة توريد (purchase)</span>
                </div>
              )}

              {/* السطر الثاني: توزيع حقول السكيما الرقمية (الكمية المتاحة، سعر التكلفة، سعر البيع) */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                
                {/* 1. حقل available_quantity */}
                <div style={{ 
                  flex: 1, 
                  background: isLowStock ? 'rgba(239, 68, 68, 0.05)' : 'rgba(79, 70, 229, 0.03)', 
                  padding: '8px 4px', 
                  borderRadius: '10px', 
                  textAlign: 'center',
                  border: '1px solid rgba(226, 232, 240, 0.8)'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                    <Package size={11} /> الرصيد الحالي
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 'bold', color: isLowStock ? '#ef4444' : '#1e293b' }}>
                    {availableQty}
                  </span>
                </div>

                {/* 2. حقل cost_price */}
                <div style={{ 
                  flex: 1, 
                  background: 'rgba(39, 174, 96, 0.03)', 
                  padding: '8px 4px', 
                  borderRadius: '10px', 
                  textAlign: 'center',
                  border: '1px solid rgba(226, 232, 240, 0.8)'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                    <BarChart3 size={11} /> سعر التكلفة
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#27ae60' }}>
                    {costPrice} <span style={{ fontSize: '0.65rem', fontWeight: 'normal', color: '#64748b' }}>ج.م</span>
                  </span>
                </div>

                {/* 3. حقل sale_price (إضافي متاح في السكيما الجديدة للاحتياط) */}
                <div style={{ 
                  flex: 1, 
                  background: 'rgba(245, 158, 11, 0.03)', 
                  padding: '8px 4px', 
                  borderRadius: '10px', 
                  textAlign: 'center',
                  border: '1px solid rgba(226, 232, 240, 0.8)'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                    <DollarSign size={11} /> سعر البيع
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#f59e0b' }}>
                    {salePrice} <span style={{ fontSize: '0.65rem', fontWeight: 'normal', color: '#64748b' }}>ج.م</span>
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
            <p style={{ margin: 0, fontSize: '0.9rem' }}>لا توجد خامات مسجلة في جدول الأصناف (items) حالياً</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default RawMaterials;
