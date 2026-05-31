// src/components/RawMaterials.jsx
import React from 'react';
import { Trash2, Layers, Package, BarChart3, AlertTriangle } from 'lucide-react';

const RawMaterials = ({ categories = [], onDeleteItem }) => {
  
  // 🔄 تصفية الخامات فقط وعزل المنتجات التامة (مثل المعمول والجاهز) بناءً على منطق الفلترة الخاص بك
  const rawData = categories.filter(item => {
    const name = (item.name || '').toLowerCase();
    return !(name.includes("معمول") || name.includes("جاهز"));
  });

  return (
    <div style={{ padding: '5px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      
      {rawData.length > 0 ? (
        rawData.map(item => {
          // حساب مستوى الخطر أو النقص في الرصيد لتنبيه المستخدم برمجياً أثناء سحب المواد الخام
          const isLowStock = Number(item.balance || 0) <= 5;

          return (
            <div 
              key={item.id || item.item_id} 
              className="glass-card" 
              style={{ 
                marginBottom: '12px', 
                padding: '16px', 
                position: 'relative',
                borderRight: isLowStock ? '4px solid #ef4444' : '4px solid #27ae60',
                transition: 'transform 0.2s'
              }}
            >
              {/* السطر الأول: اسم الخامة + زر الحذف المعزز بأمان */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color={isLowStock ? "#ef4444" : "#4f46e5"} />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', fontWeight: '700' }}>
                    {item.name}
                  </h3>
                </div>
                
                {/* أيقونة الحذف بتأثير تفاعلي */}
                <button 
                  onClick={() => {
                    if(window.confirm(`هل أنت متأكد من حذف خامة: ${item.name}؟`)) {
                      onDeleteItem(item.id || item.item_id);
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

              {/* مؤشر مرئي سريع لو المادة الخام أوشكت على النفاد */}
              {isLowStock && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c', fontSize: '0.75rem', marginBottom: '10px', background: '#fef2f2', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}>
                  <AlertTriangle size={12} />
                  <span>مخزون حرج! يرجى إعادة تعبئة الخامة لتجنب توقف الإنتاج</span>
                </div>
              )}

              {/* السطر الثاني: الحقول المالية والكمية طبقا للسكيما وسحب المواد */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                
                {/* مربع رصيد الخامة الحالي */}
                <div style={{ 
                  flex: 1, 
                  background: isLowStock ? 'rgba(239, 68, 68, 0.05)' : 'rgba(79, 70, 229, 0.03)', 
                  padding: '10px', 
                  borderRadius: '10px', 
                  textAlign: 'center',
                  border: '1px solid rgba(226, 232, 240, 0.8)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Package size={12} /> الرصيد الحالي
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isLowStock ? '#ef4444' : '#1e293b' }}>
                    {item.balance || 0} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>وحدة</span>
                  </span>
                </div>

                {/* مربع تكلفة/سعر الوحدة من الخامة */}
                <div style={{ 
                  flex: 1, 
                  background: 'rgba(39, 174, 96, 0.03)', 
                  padding: '10px', 
                  borderRadius: '10px', 
                  textAlign: 'center',
                  border: '1px solid rgba(226, 232, 240, 0.8)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <BarChart3 size={12} /> سعر التكلفة
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#27ae60' }}>
                    {item.price || 0} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>ج.م</span>
                  </span>
                </div>

              </div>

            </div>
          );
        })
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
          <Package size={36} style={{ marginBottom: '8px', opacity: 0.4, color: '#4f46e5' }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>لا توجد مواد خام مسجلة في المستودع حالياً</p>
        </div>
      )}

    </div>
  );
};

export default RawMaterials;
