// src/components/RawMaterials.jsx
import React from 'react';
import { Trash2, Layers, Package, BarChart3, AlertTriangle, Barcode, ShoppingCart } from 'lucide-react';

const RawMaterials = ({ categories = [], onDeleteItem, onSelectForPurchase }) => {
  
  // 🛡️ حزام أمان: الاعتماد المباشر على البيانات الممررة من الملف الأب (Inventory) 
  // لأن الأب قام بعمل الفرز الأساسي بالفعل، ونضع هنا فحصاً احتياطياً فقط منعاً لتعليق الصفحة
  const rawData = Array.isArray(categories) ? categories : [];

  return (
    <div style={{ padding: '5px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      
      {rawData.length > 0 ? (
        rawData.map((item, index) => {
          // 🛡️ مواءمة واستخراج الحقول طبقاً للسكيما المركزية الموحدة (items) لزاد الخير:
          const currentId = item?.id || index;
          const availableQty = Number(item?.available_quantity || item?.quantity || 0); 
          const costPrice = Number(item?.cost_price || 0); 
          const itemBarcode = item?.barcode || 'بدون باركود';
          const itemName = item?.name || 'صنف غير مسمى';
          
          // حساب مستوى الخطر (مخزون حرج إذا كانت الكمية 5 أو أقل)
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
                  
                  {/* عرض الباركود المتوافق مع سكيما التوريد والمشتريات */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    <Barcode size={12} />
                    <span>الباركود: {itemBarcode}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* 🛒 زر سريع لإدراج المادة الخام مباشرة في فاتورة المشتريات */}
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

                  {/* أيقونة الحذف المباشر */}
                  <button 
                    onClick={() => {
                      if (window.confirm(`هل أنت متأكد من حذف خامة: ${itemName} من المخزن؟`)) {
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

              {/* مؤشر مرئي في حالة انخفاض المخزون */}
              {isLowStock && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c', fontSize: '0.75rem', marginBottom: '10px', background: '#fef2f2', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}>
                  <AlertTriangle size={12} />
                  <span>مخزون حرج! سيتم تحديثه تلقائياً فور حفظ حركة توريد</span>
                </div>
              )}

              {/* السطر الثاني: الحقول المادية والكميات المتزامنة مع الباك إند */}
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

                {/* مربع تكلفة الشراء (cost_price) */}
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
            <p style={{ margin: 0, fontSize: '0.9rem' }}>لا توجد خامات مسجلة في جدول الأصناف حالياً</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default RawMaterials;
