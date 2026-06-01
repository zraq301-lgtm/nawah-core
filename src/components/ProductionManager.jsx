// src/components/Page/ProductionManager.jsx
import React, { useState, useEffect } from 'react';
import { Factory, Save, ArrowLeft, AlertTriangle, Box, Calendar, Clock, Plus, Trash2, Zap, RefreshCw } from 'lucide-react';

// 🚀 إدارة الكاش السحابي للـ ERP
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';

const ProductionManager = ({ onSaveProduction, onSaveWaste, onBack }) => {
  const queryClient = useQueryClient();

  // 📥 [1] جلب بيانات جدول الأصناف (items) سحابياً وبشكل فوري لضمان دقة الأرصدة قبل السحب
  const { data: stockResponse, isLoading, refetch } = useQuery({
    queryKey: ['stock'],
    queryFn: () => apiService.getData('stock'),
    staleTime: 0, // جلب البيانات طازجة دائماً لعدم حدوث عجز وهمي في الخامات
  });

  // 🛡️ حزام أمان لاستخراج مصفوفة الأصناف الفعلية المتاحة في قاعدة البيانات
  const itemsList = Array.isArray(stockResponse)
    ? stockResponse
    : (stockResponse?.data || stockResponse?.items || []);

  // 🔄 [2] تطبيق الفرز القياسي المتوافق مع السكيما لعزل المواد الخام القابلة للخصم والاستهلاك
  const rawMaterials = itemsList.filter(item => {
    if (!item) return false;
    const itemType = (item.item_type || '').toString().toLowerCase().trim();
    const itemName = (item.name || '').toString().toLowerCase().trim();

    // فرز مرن وعام: تصفية الأصناف المسجلة كخامة أو التي لا تحمل وسوم المنتجات الجاهزة
    return (
      itemType === 'raw_material' || 
      itemType === 'خامة' || 
      itemType === 'مواد خام' ||
      (!itemName.includes('معمول') && !itemName.includes('جاهز') && itemType !== 'product')
    );
  });

  // حالة لتخزين كائن المدخلات الخاص بالخامات المستهلكة
  const [ingredientsInputs, setIngredientsInputs] = useState({});

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'الأولى',
    products: [{ name: '', quantity: 0 }],
    wasteQty: 0
  });

  // مزامنة كميات الخامات من السكيما دون تصفير القيم التي يكتبها المستخدم أثناء التشغيل
  useEffect(() => {
    setIngredientsInputs(prev => {
      const updated = { ...prev };
      rawMaterials.forEach(item => {
        if (item.name) {
          const trimmedName = item.name.trim();
          if (updated[trimmedName] === undefined) {
            updated[trimmedName] = 0;
          }
        }
      });
      return updated;
    });
  }, [stockResponse]);

  const shifts = ['الأولى', 'الثانية', 'السهرة', 'إضافي'];

  const handleChange = (e, category, field, index = null) => {
    const value = e.target.type === 'number' ? (e.target.value === '' ? 0 : parseFloat(e.target.value)) : e.target.value;
    
    if (category === 'ingredients') {
      setIngredientsInputs(prev => ({
        ...prev,
        [field]: value
      }));
    } else if (category === 'products') {
      const updatedProducts = [...formData.products];
      updatedProducts[index] = { ...updatedProducts[index], [field]: value };
      setFormData(prev => ({ ...prev, products: updatedProducts }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const addProductField = () => {
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, { name: '', quantity: 0 }]
    }));
  };

  const removeProductField = (index) => {
    const updatedProducts = formData.products.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, products: updatedProducts }));
  };

  // 🚀 [3] معالجة الترحيل وحساب تكلفة الإنتاج وتحديث الأرصدة
  const handleProcessProduction = async () => {
    let totalActualCost = 0;
    const actualConsumedIngredients = {};

    // التحقق الفوري والدقيق من الخامات بناءً على الأرصدة السحابية الحالية
    for (const [ingName, requiredQty] of Object.entries(ingredientsInputs)) {
      if (!ingName || requiredQty <= 0) continue;
      
      const cleanIngName = ingName.trim().toLowerCase();
      // البحث عن الخامة داخل مصفوفة السكيما المحدثة
      const stockItem = itemsList.find(s => s.name && s.name.trim().toLowerCase() === cleanIngName);
      
      // ربط دقيق بحقل available_quantity التابع لقاعدة البيانات
      const totalAvailable = stockItem ? parseFloat(stockItem.available_quantity || 0) : 0;
      const currentCostPrice = stockItem ? parseFloat(stockItem.cost_price || 0) : 0;

      if (!stockItem || totalAvailable < requiredQty) {
        alert(`⚠️ عجز في مادة: ${ingName}\nالمطلوب استهلاكه: ${requiredQty}\nالمتوفر حالياً بالسكيما: ${totalAvailable}`);
        return;
      }

      // حساب التكلفة الفعلية بناءً على سعر تكلفة الشراء المسجل بالسيستم
      totalActualCost += (requiredQty * currentCostPrice);
      actualConsumedIngredients[ingName.trim()] = requiredQty;
    }

    // حساب مجموع الوحدات المنتجة أياً كان نوع المنتج النهائي
    const totalProductionUnits = formData.products.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0);
    
    if (totalProductionUnits <= 0) {
      alert("⚠️ يرجى إدخال كمية الوحدات المنتجة أولاً");
      return;
    }

    // نصيب الوحدة الواحدة المنتجة من تكلفة المواد الخام الصافية
    const costPerUnit = totalActualCost / totalProductionUnits;

    // تجميع البيانات النهائية للحفظ والإرسال
    const productionPayload = {
      ...formData,
      ingredients: actualConsumedIngredients,
      id: Date.now(),
      totalActualCost: parseFloat(totalActualCost.toFixed(2)),
      actualUnitCost: parseFloat(costPerUnit.toFixed(2)),
      totalProducedQty: totalProductionUnits
    };

    try {
      // 💾 ترحيل وحفظ عملية الإنتاج الفعلي للجهة الخلفية
      if (onSaveProduction) {
        await onSaveProduction(productionPayload);
      }

      // ترحيل الهالك التشغيلي إن وجد
      if (formData.wasteQty > 0 && onSaveWaste) {
        await onSaveWaste({
          id: Date.now() + 1,
          date: formData.date,
          item: `هالك تشغيل - وردية ${formData.shift}`,
          quantity: formData.wasteQty,
          costAtLoss: parseFloat((costPerUnit * formData.wasteQty).toFixed(2)),
          reason: "هالك تشغيل خط الإنتاج"
        });
      }

      // 🔄 تنظيف وتحديث كاش الـ React Query لإجبار النظام على سحب قراءة جرد حية وجديدة فوراً
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      
      alert(`✅ تم ترحيل الإنتاج بنجاح وصيانة التكاليف!\n• تم تعديل أرصدة الخامات المستهلكة.\n• تم احتساب تكلفة الوحدة: ${costPerUnit.toFixed(2)} ج.م\n• إجمالي تكلفة التشغيل: ${totalActualCost.toFixed(2)} ج.م`);
      
      if (onBack) onBack();

    } catch (error) {
      console.error("❌ خطأ أثناء حفظ وترحيل عملية الإنتاج ومزامنة المخزن:", error);
      alert("🚨 فشل ترحيل البيانات السحابية، يرجى التحقق من اتصال السيرفر.");
    }
  };

  // الاستايلات القياسية الموحدة للمظهر الزجاجي العصري
  const inputStyle = {
    width: '100%', padding: '12px 15px', borderRadius: '12px', border: '2px solid #e2e8f0',
    fontSize: '17px', fontWeight: 'bold', textAlign: 'center', outline: 'none', color: '#1e293b', boxSizing: 'border-box'
  };

  const cardStyle = {
    backgroundColor: '#fff', borderRadius: '24px', padding: '20px', marginBottom: '20px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
  };

  return (
    <div className="production-manager" style={{ direction: 'rtl', padding: '15px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: "'Tajawal', sans-serif" }}>
      
      {/* القسم الأول: كارت البيانات الأساسية للوردية */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Factory size={26} color="#4f46e5" />
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '21px', fontWeight: '700' }}>تشغيل الإنتاج والتكلفة العام</h2>
          </div>
          <button 
            onClick={() => refetch()} 
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}
            title="تحديث الأرصدة الحالية"
          >
            <RefreshCw size={16} color="#4f46e5" className={isLoading ? "spin-animation" : ""} />
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}><Calendar size={13} /> تاريخ الوردية</label>
            <input type="date" value={formData.date} onChange={(e) => handleChange(e, 'info', 'date')} style={{ ...inputStyle, textAlign: 'right' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}><Clock size={13} /> توقيت التشغيل</label>
            <select value={formData.shift} onChange={(e) => handleChange(e, 'info', 'shift')} style={inputStyle}>
              {shifts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* القسم الثاني: سحب واستنزاف كميات الخامات والمواد الأولية */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Zap size={20} color="#f59e0b" />
          <h3 style={{ margin: 0, color: '#475569', fontSize: '16px', fontWeight: '700' }}>الخامات المستهلكة في الطبخة / التشغيلة</h3>
        </div>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#4f46e5', fontWeight: 'bold', fontSize: '14px' }}>
            🔄 جاري جلب كميات الخامات المتوفرة بالسكيما الحية...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
            {rawMaterials.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '15px', fontSize: '14px' }}>
                لا توجد مواد خام مسجلة في المخازن حالياً
              </div>
            ) : (
              rawMaterials.map(item => {
                if (!item?.name) return null;
                const ing = item.name.trim();
                const availableQty = item.available_quantity || 0;
                return (
                  <div key={item.id || ing} style={{ background: '#f8fafc', padding: '12px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '6px', color: '#1e293b', whitespace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ing}</div>
                    <input 
                      type="number" 
                      value={ingredientsInputs[ing] || ''} 
                      placeholder="0" 
                      onChange={(e) => handleChange(e, 'ingredients', ing)} 
                      style={inputStyle} 
                    />
                    <div style={{ fontSize: '11px', marginTop: '6px', fontWeight: '600', color: availableQty > 0 ? '#10b981' : '#ef4444', textAlign: 'center' }}>
                      المتاح: {availableQty}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* القسم الثالث: الأصناف المنتجة والنهائية والهوالك */}
      <div style={{ ...cardStyle, backgroundColor: '#1e293b', color: '#fff' }}>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box size={20} color="#3b82f6" />
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: '700' }}>الأصناف والمنتجات التامة المنتجة</h3>
          </div>
          <button onClick={addProductField} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={14} /> صنف منتج</button>
        </div>

        {formData.products.map((prod, index) => (
          <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '12px', backgroundColor: '#2d3a4f', padding: '12px', borderRadius: '15px', alignItems: 'center' }}>
            <input type="text" value={prod.name} placeholder="اسم المنتج الفعلي" onChange={(e) => handleChange(e, 'products', 'name', index)} style={{ ...inputStyle, background: '#1e293b', color: '#fff', border: '1px solid #475569', fontSize: '15px' }} />
            <input type="number" value={prod.quantity || ''} onChange={(e) => handleChange(e, 'products', 'quantity', index)} placeholder="الكمية" style={{ ...inputStyle, background: '#1e293b', color: '#fff', border: '1px solid #475569', fontSize: '15px' }} />
            {index > 0 && (
              <button onClick={() => removeProductField(index)} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}><Trash2 size={16} /></button>
            )}
          </div>
        ))}

        {/* حقل الهالك المتوافق مع سحوبات التكاليف */}
        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #334155' }}>
          <label style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={13} /> كمية الهالك / التالف من التشغيل:</label>
          <input type="number" value={formData.wasteQty || ''} onChange={(e) => handleChange(e, 'info', 'wasteQty')} style={{ ...inputStyle, backgroundColor: '#fff', marginTop: '8px', fontSize: '15px' }} placeholder="الكمية الهالكة بالوحدات" />
        </div>

        <button 
          onClick={handleProcessProduction} 
          style={{ width: '100%', padding: '16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '17px', marginTop: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Save size={18} /> ترحيل البيانات وحساب التكلفة السحابية
        </button>
      </div>

      {/* زر الرجوع للخلف للعودة إلى اللوحة الرئيسية */}
      <button onClick={onBack} style={{ width: '100%', marginTop: '5px', background: '#fff', border: '1px solid #cbd5e1', padding: '14px', borderRadius: '15px', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ArrowLeft size={16} /> العودة للشاشة السابقة</button>
    </div>
  );
};

export default ProductionManager;
