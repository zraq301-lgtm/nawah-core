// src/components/RawMaterials.jsx
import React from 'react';
import { Trash2, Layers, Package, BarChart3, AlertTriangle, Barcode, ShoppingCart } from 'lucide-react';

const RawMaterials = ({ categories = [], onDeleteItem, onSelectForPurchase }) => {
  
  // 🔄 تصفية الخامات فقط وعزل المنتجات التامة (مثل المعمول والجاهز) بناءً على منطق الفلترة الخاص بك
  // يتم الفحص هنا على حقل `name` المذكور في سكيما جدول public.items
  const rawData = categories.filter(item => {
    const name = (item.name || '').toLowerCase();
    return !(name.includes("معمول") || name.includes("جاهز"));
  });

  return (
    <div style={{ padding: '5px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      
      {rawData.length > 0 ? (
        rawData.map(item => {
          // 🛡️ مواءمة الحقول مع السكيما المركزية (items) لنيون:
          const currentId = item.id;
          const availableQty = Number(item.available_quantity || 0); // الكمية المتاحة بالمخزن بالسكيما
          const costPrice = Number(item.cost_price || 0); // سعر التكلفة/الشراء بالسكيما
          const itemBarcode = item.barcode || 'بدون باركود';
          
          // حساب مستوى الخطر أو النقص في الرصيد لتنبيه المستخدم قبل سحب المواد الخام
          const isLowStock = availableQty <= 5;

          return (
            <div 
              key={currentId} 
              className="glass-card" 
              style={{ 
                marginBottom: '12px', 
                padding: '16px', 
                position: 'relative',
                borderRight: isLowStock ? '4px solid #ef4444' : '4px solid #27ae60',
                transition: 'transform 0.2s'
              }}
            >
              {/* السطر الأول: اسم الخامة + الباركود + زر الحذف المعزز بأمان */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} color={isLowStock ? "#ef4444" : "#4f46e5"} />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', fontWeight: '700' }}>
                      {item.name}
                    </h3>
                  </div>
                  {/* عرض الباركود لسهولة مطابقته في فواتير المشتريات (invoice_items) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    <Barcode size={12} />
                    <span>الباركود: {itemBarcode}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* 🛒 زر سريع لإدراج المادة الخام مباشرة في فاتورة مشتريات جديدة إذا كانت متوفرة في الأب */}
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

                  {/* أيقونة الحذف بتأثير تفاعلي */}
                  <button 
                    onClick={() => {
                      if(window.confirm(`هل أنت متأكد من حذف خامة: ${item.name} من شجرة المخازن؟`)) {
                        onDeleteItem(currentId);
                      }
                    }} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="حذف الخامة من المخزن"
                  >
                    <Trash2 size={18} color="#ef4444" style={{ opacity: 0.8 }} />
                  </button>
                </div>
              </div>

              {/* مؤشر مرئي سريع لو المادة الخام أوشكت على النفاد */}
              {isLowStock && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c', fontSize: '0.75rem', marginBottom: '10px', background: '#fef2f2', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}>
                  <AlertTriangle size={12} />
                  <span>مخزون حرج! سيتم تحديثه تلقائياً فور حفظ فاتورة توريد (Purchase Invoice)</span>
                </div>
              )}

              {/* السطر الثاني: الحقول المالية والكمية طبقا للسكيما الصارمة لـ items */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                
                {/* مربع رصيد الخامة الحالي (available_quantity) */}
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

                {/* مربع تكلفة/سعر الشراء الحالي (cost_price) */}
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
        <div className="glass-card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
          <Package size={36} style={{ marginBottom: '8px', opacity: 0.4, color: '#4f46e5' }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>لا توجد خامات مسجلة في جدول الأصناف حالياً</p>
        </div>
      )}

    </div>
  );
};

export default RawMaterials;
