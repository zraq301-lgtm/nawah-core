// src/components/ProductionManager.jsx
import React, { useState, useEffect } from 'react';
import { Factory, Save, ArrowLeft, AlertTriangle, Box, Calendar, Clock, Plus, Trash2, Zap, RefreshCw } from 'lucide-react';

// 🚀 إدارة الكاش والمزامنة الفورية لـ زاد الخير
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

const ProductionManager = ({ onBack }) => {
  const queryClient = useQueryClient();

  // 📥 جلب بيانات جدول الأصناف (items) من السكيما للحصول على الـ id والأسعار والكميات الحالية
  const { data: stockResponse, isLoading, refetch } = useQuery({
    queryKey: ['stock'],
    queryFn: () => apiService.getData('stock'),
    staleTime: 0, 
  });

  const itemsList = Array.isArray(stockResponse)
    ? stockResponse
    : (stockResponse?.data || stockResponse?.items || []);

  // 🔄 تصفية الخامات بناءً على سكيما items
  const rawMaterials = itemsList.filter(item => {
    if (!item) return false;
    const itemType = (item.item_type || '').toString().toLowerCase().trim();
    const itemName = (item.name || '').toString().toLowerCase().trim();
    return (
      itemType === 'raw_material' || 
      itemType === 'خامة' || 
      itemType === 'مواد خام' ||
      (!itemName.includes('معمول') && !itemName.includes('جاهز') && itemType !== 'product')
    );
  });

  // تصفية المنتجات الجاهزة الجاهزة للاختيار عند الإنتاج
  const readyProducts = itemsList.filter(item => {
    if (!item) return false;
    const itemType = (item.item_type || '').toString().toLowerCase().trim();
    const itemName = (item.name || '').toString().toLowerCase().trim();
    return itemType === 'product' || itemName.includes('معمول') || itemName.includes('جاهز');
  });

  const [ingredientsInputs, setIngredientsInputs] = useState({});
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'الأولى',
    products: [{ item_id: '', quantity: 0 }],
    wasteQty: 0
  });

  const shifts = ['الأولى', 'الثانية', 'السهرة', 'إضافي'];

  useEffect(() => {
    setIngredientsInputs(prev => {
      const updated = { ...prev };
      rawMaterials.forEach(item => {
        if (item.id && updated[item.id] === undefined) {
          updated[item.id] = 0;
        }
      });
      return updated;
    });
  }, [stockResponse]);

  const handleChange = (e, category, field, index = null) => {
    const value = e.target.type === 'number' ? (e.target.value === '' ? 0 : parseFloat(e.target.value)) : e.target.value;
    
    if (category === 'ingredients') {
      setIngredientsInputs(prev => ({ ...prev, [field]: value }));
    } else if (category === 'products') {
      const updatedProducts = [...formData.products];
      updatedProducts[index] = { ...updatedProducts[index], [field]: value };
      setFormData(prev => ({ ...prev, products: updatedProducts }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const addProductField = () => {
    setFormData(prev => ({ ...prev, products: [...prev.products, { item_id: '', quantity: 0 }] }));
  };

  const removeProductField = (index) => {
    setFormData(prev => ({ ...prev, products: formData.products.filter((_, i) => i !== index) }));
  };

  // 🚀 العملية الكبرى: تشغيل السحب والإنتاج المتوافق مع الـ Trigger
  const handleProcessProduction = async () => {
    const timestamp = Date.now();
    
    // تجهيز مصفوفات العناصر للفواتير
    const consumedItemsQueue = [];
    const producedItemsQueue = [];
    
    let totalMaterialsCost = 0;

    // 1️⃣ أولاً: التحقق وتجميع الخامات المستهلكة (لعمل فاتورة الـ sale الخاصة بالسحب)
    for (const [itemId, requiredQty] of Object.entries(ingredientsInputs)) {
      if (requiredQty <= 0) removeProductField;
      
      const stockItem = itemsList.find(s => s.id === parseInt(itemId));
      if (!stockItem) continue;

      const availableQty = parseFloat(stockItem.available_quantity || 0);
      const costPrice = parseFloat(stockItem.cost_price || 0);

      // حزام الأمان ضد العجز
      if (availableQty < requiredQty) {
        alert(`⚠️ عجز في المادة الخام: ${stockItem.name}\nالمطلوب: ${requiredQty} | المتوفر: ${availableQty}`);
        return;
      }

      totalMaterialsCost += (requiredQty * costPrice);

      consumedItemsQueue.push({
        item_id: stockItem.id,
        quantity: requiredQty,
        unit_price: costPrice // يتم السحب بسعر التكلفة
      });
    }

    if (consumedItemsQueue.length === 0) {
      alert("⚠️ يرجى تحديد مادة خام واحدة على الأقل واستهلاك كمية منها.");
      return;
    }

    // 2️⃣ ثانياً: تجميع المنتجات التامة (لعمل فاتورة الـ purchase الخاصة بالإدخال للسيستم)
    let totalProducedUnits = 0;
    for (const prod of formData.products) {
      if (!prod.item_id || prod.quantity <= 0) continue;
      
      const stockItem = itemsList.find(s => s.id === parseInt(prod.item_id));
      if (!stockItem) continue;

      totalProducedUnits += prod.quantity;
      producedItemsQueue.push({
        item_id: stockItem.id,
        quantity: prod.quantity,
        unit_price: 0 // سيتم تحديث السعر بناءً على نصيب التكلفة لاحقاً
      });
    }

    if (producedItemsQueue.length === 0) {
      alert("⚠️ يرجى اختيار المنتج التام الناتج وتحديد كميته.");
      return;
    }

    // حساب نصيب الوحدة من تكلفة الخامات المسحوبة
    const costPerUnit = totalMaterialsCost / totalProducedUnits;

    // تحديث أسعار المنتجات في قائمة الإدخال بالتكلفة الفعلية المستخرجة
    producedItemsQueue.forEach(p => {
      p.unit_price = parseFloat(costPerUnit.toFixed(2));
    });

    try {
      // 🟩 الخطوة [1]: إنشاء فاتورة السحب (sale) للخامات لتشغيل الـ Trigger لخصمها
      const saleInvoiceNumber = `RAW-OUT-${timestamp}`;
      const saleInvoiceRes = await apiService.postData('invoices', {
        invoice_number: saleInvoiceNumber,
        invoice_type: 'sale',
        contact_id: 1, // جهة التعامل العامة الافتراضية بالسكيما
        gross_amount: totalMaterialsCost,
        net_amount: totalMaterialsCost,
        paid_amount: totalMaterialsCost,
        remaining_amount: 0,
        description: `سحب خامات تشغيل - وردية ${formData.shift} بتاريخ ${formData.date}`
      });

      const saleInvoiceId = saleInvoiceRes?.id || saleInvoiceRes?.data?.id;

      // إدراج عناصر الخامات المستهلكة لتبدأ دالة sync_stock_and_accounts بالخصم فوراً
      for (const rawItem of consumedItemsQueue) {
        await apiService.postData('invoice_items', {
          invoice_id: saleInvoiceId,
          item_id: rawItem.item_id,
          quantity: rawItem.quantity,
          unit_price: rawItem.unit_price
        });
      }

      // 🟩 الخطوة [2]: إنشاء فاتورة التوريد (purchase) لإضافة المنتج التام للمخزن عبر الـ Trigger
      const purchaseInvoiceNumber = `PROD-IN-${timestamp}`;
      const purchaseInvoiceRes = await apiService.postData('invoices', {
        invoice_number: purchaseInvoiceNumber,
        invoice_type: 'purchase',
        contact_id: 1,
        gross_amount: totalMaterialsCost,
        net_amount: totalMaterialsCost,
        paid_amount: totalMaterialsCost,
        remaining_amount: 0,
        description: `إدخال إنتاج تام - وردية ${formData.shift} بتاريخ ${formData.date}`
      });

      const purchaseInvoiceId = purchaseInvoiceRes?.id || purchaseInvoiceRes?.data?.id;

      // إدراج المنتجات الجديدة لتبدأ دالة sync_stock_and_accounts بالزيادة فوراً في المخزن
      for (const prodItem of producedItemsQueue) {
        await apiService.postData('invoice_items', {
          invoice_id: purchaseInvoiceId,
          item_id: prodItem.item_id,
          quantity: prodItem.quantity,
          unit_price: prodItem.unit_price
        });
      }

      // 🔄 تنظيف الكاش سحابياً ليعيد التطبيق قراءة الجرد الحديثة بعد تفعيل الـ Trigger
      await queryClient.invalidateQueries({ queryKey: ['stock'] });

      alert(`✅ تم الترحيل والمزامنة مع السكيما بنجاح!\n• تم سحب الخامات تلقائياً عبر التريجر (فاتورة: ${saleInvoiceNumber})\n• تم إضافة الإنتاج الجديد للمخزن (فاتورة: ${purchaseInvoiceNumber})\n• تكلفة الوحدة المنتجة: ${costPerUnit.toFixed(2)} ج.م`);
      
      if (onBack) onBack();

    } catch (error) {
      console.error("❌ خطأ أثناء ترحيل عمليات السكيما:", error);
      alert("🚨 فشل الترحيل، يرجى مراجعة اتصال الشبكة وصلاحيات السكيما.");
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 15px', borderRadius: '12px', border: '2px solid #e2e8f0',
    fontSize: '16px', fontWeight: 'bold', textAlign: 'center', outline: 'none', color: '#1e293b', boxSizing: 'border-box'
  };

  const cardStyle = {
    backgroundColor: '#fff', borderRadius: '24px', padding: '20px', marginBottom: '20px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
  };

  return (
    <div style={{ direction: 'rtl', padding: '15px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: "'Tajawal', sans-serif" }}>
      
      {/* كارت البيانات للوردية */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Factory size={26} color="#4f46e5" />
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px', fontWeight: '700' }}>لوحة الإنتاج والمزامنة مع السكيما</h2>
          </div>
          <button onClick={() => refetch()} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}>
            <RefreshCw size={16} color="#4f46e5" className={isLoading ? "spin-animation" : ""} />
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}><Calendar size={12} /> تاريخ الوردية</label>
            <input type="date" value={formData.date} onChange={(e) => handleChange(e, 'info', 'date')} style={{ ...inputStyle, textAlign: 'right' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}><Clock size={12} /> الوردية الحالية</label>
            <select value={formData.shift} onChange={(e) => handleChange(e, 'info', 'shift')} style={inputStyle}>
              {shifts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* كارت استهلاك وسحب الخامات */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Zap size={20} color="#f59e0b" />
          <h3 style={{ margin: 0, color: '#475569', fontSize: '15px', fontWeight: '700' }}>كميات المواد الخام المستهلكة (للسحب)</h3>
        </div>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#4f46e5', fontWeight: 'bold' }}>🔄 جاري فحص أرصدة الخامات...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
            {rawMaterials.map(item => (
              <div key={item.id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '6px', color: '#1e293b' }}>{item.name}</div>
                <input 
                  type="number" 
                  value={ingredientsInputs[item.id] || ''} 
                  placeholder="0" 
                  onChange={(e) => handleChange(e, 'ingredients', item.id)} 
                  style={inputStyle} 
                />
                <div style={{ fontSize: '11px', marginTop: '6px', fontWeight: '600', color: (item.available_quantity || 0) > 0 ? '#10b981' : '#ef4444', textAlign: 'center' }}>
                  المتاح: {item.available_quantity || 0}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* كارت إنتاج السلع والمنتجات الجاهزة */}
      <div style={{ ...cardStyle, backgroundColor: '#1e293b', color: '#fff' }}>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box size={20} color="#3b82f6" />
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '15px', fontWeight: '700' }}>المنتجات التامة الناتجة (للإضافة للمخزن)</h3>
          </div>
          <button onClick={addProductField} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={14} /> صنف منتج</button>
        </div>

        {formData.products.map((prod, index) => (
          <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '12px', backgroundColor: '#2d3a4f', padding: '12px', borderRadius: '15px', alignItems: 'center' }}>
            <select 
              value={prod.item_id} 
              onChange={(e) => handleChange(e, 'products', 'item_id', index)} 
              style={{ ...inputStyle, background: '#1e293b', color: '#fff', border: '1px solid #475569', textAlign: 'right' }}
            >
              <option value="">-- اختر المنتج --</option>
              {readyProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            
            <input 
              type="number" 
              value={prod.quantity || ''} 
              onChange={(e) => handleChange(e, 'products', 'quantity', index)} 
              placeholder="الكمية المنتجة" 
              style={{ ...inputStyle, background: '#1e293b', color: '#fff', border: '1px solid #475569', width: '120px' }} 
            />
            
            {index > 0 && (
              <button onClick={() => removeProductField(index)} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}><Trash2 size={16} /></button>
            )}
          </div>
        ))}

        <button 
          onClick={handleProcessProduction} 
          style={{ width: '100%', padding: '16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '17px', marginTop: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Save size={18} /> ترحيل الإنتاج وتشغيل الـ Trigger الفوري
        </button>
      </div>

      <button onClick={onBack} style={{ width: '100%', background: '#fff', border: '1px solid #cbd5e1', padding: '14px', borderRadius: '15px', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ArrowLeft size={16} /> العودة للشاشة السابقة</button>
    </div>
  );
};

export default ProductionManager;
