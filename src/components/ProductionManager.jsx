import React, { useState, useEffect } from 'react';
import { Factory, Save, ArrowLeft, Box, Calendar, Clock, Zap, RefreshCw, Layers } from 'lucide-react';

// 🚀 إدارة الكاش والمزامنة الفورية لـ زاد الخير
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

const ProductionManager = ({ onBack }) => {
  const queryClient = useQueryClient();

  // 📥 جلب بيانات جدول الأصناف (items) من السكيما
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

  // 🍩 تصفية المنتجات الجاهزة والنهائية لـ زاد الخير
  const readyProducts = itemsList.filter(item => {
    if (!item) return false;
    const itemType = (item.item_type || '').toString().toLowerCase().trim();
    const itemName = (item.name || '').toString().toLowerCase().trim();
    return itemType === 'product' || itemName.includes('معمول') || itemName.includes('جاهز') || itemType === 'منتج جاهز';
  });

  // حالات تخزين مدخلات الكميات (الحل الجذري لمشكلة عدم القراءة الظاهرة بالصورة)
  const [ingredientsInputs, setIngredientsInputs] = useState({});
  
  // شاشة خطة الإنتاج المحددة بالأسفل
  const [selectedProductId, setSelectedProductId] = useState('');
  const [requiredUnits, setRequiredUnits] = useState('');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'الأولى'
  });

  const shifts = ['الأولى', 'الثانية', 'السهرة', 'إضافي'];

  // تعيين المنتج الأول تلقائياً في القائمة المنسدلة عند تحميل البيانات
  useEffect(() => {
    if (readyProducts.length > 0 && !selectedProductId) {
      setSelectedProductId(readyProducts[0].id.toString());
    }
  }, [stockResponse]);

  // دالة التعامل مع تغيير قيم المواد الخام بدقة
  const handleRawInputChange = (itemId, value) => {
    setIngredientsInputs(prev => ({
      ...prev,
      [itemId]: value === '' ? '' : parseFloat(value)
    }));
  };

  // 🚀 زر الحفظ والترحيل الرئيسي المرتبط بالشاشة السفلية وحسابات المخزن
  const handleProcessProduction = async () => {
    const timestamp = Date.now();
    const consumedItemsQueue = [];
    let totalMaterialsCost = 0;

    // 1️⃣ الفحص الأمني للمدخلات (تم إصلاح الثغرة السابقة)
    const activeMaterialsEntries = Object.entries(ingredientsInputs).filter(([_, qty]) => qty > 0);
    
    if (activeMaterialsEntries.length === 0) {
      alert("⚠️ يرجى إدخال كمية مادة خام واحدة على الأقل في الحقول المخصصة بالأعلى لبدء التشغيل.");
      return;
    }

    if (!selectedProductId) {
      alert("⚠️ يرجى اختيار نوع المنتج المطلوب إنتاجه من الشاشة بالأسفل.");
      return;
    }

    const unitsToProduce = parseFloat(requiredUnits);
    if (!unitsToProduce || unitsToProduce <= 0) {
      alert("⚠️ يرجى تحديد عدد الوحدات المطلوب إنتاجها في الشاشة بالأسفل.");
      return;
    }

    // الحصول على بيانات المنتج المختار للإنتاج
    const targetProduct = readyProducts.find(p => p.id === parseInt(selectedProductId));
    if (!targetProduct) {
      alert("⚠️ المنتج المختار غير موجود بالسكيما.");
      return;
    }

    // 2️⃣ احتساب الكميات المستهلكة من المواد الخام ومراجعة أرصدة المخزن
    for (const [itemId, requiredQty] of activeMaterialsEntries) {
      const stockItem = itemsList.find(s => s.id === parseInt(itemId));
      if (!stockItem) continue;

      const availableQty = parseFloat(stockItem.available_quantity || 0);
      const costPrice = parseFloat(stockItem.cost_price || 0);

      // حزام أمان صارم ضد العجز
      if (availableQty < requiredQty) {
        alert(`⚠️ عجز في رصيد المخزن للمادة: ${stockItem.name}\nالمطلوب للتشغيل: ${requiredQty} | المتاح فعلياً: ${availableQty}`);
        return;
      }

      totalMaterialsCost += (requiredQty * costPrice);

      consumedItemsQueue.push({
        item_id: stockItem.id,
        name: stockItem.name,
        quantity: requiredQty,
        unit_price: costPrice
      });
    }

    // حساب تكلفة الوحدة الواحدة من المنتج بناءً على الخامات الفعلية المستهلكة
    const costPerUnit = totalMaterialsCost / unitsToProduce;

    try {
      // 🟩 الخطوة الأولى: إنشاء فاتورة السحب (sale) لخفض كميات الخامات المستهلكة فقط (والباقي يظل بالمخزن)
      const saleInvoiceNumber = `RAW-OUT-${timestamp}`;
      const saleInvoiceRes = await apiService.postData('invoices', {
        invoice_number: saleInvoiceNumber,
        invoice_type: 'sale',
        contact_id: 1, 
        gross_amount: totalMaterialsCost,
        net_amount: totalMaterialsCost,
        paid_amount: totalMaterialsCost,
        remaining_amount: 0,
        description: `سحب خامات لإنتاج [${unitsToProduce} وحدة] من [${targetProduct.name}] - وردية ${formData.shift}`
      });

      const saleInvoiceId = saleInvoiceRes?.id || saleInvoiceRes?.data?.id;

      for (const rawItem of consumedItemsQueue) {
        await apiService.postData('invoice_items', {
          invoice_id: saleInvoiceId,
          item_id: rawItem.item_id,
          quantity: rawItem.quantity,
          unit_price: rawItem.unit_price
        });
      }

      // 🟩 الخطوة الثانية: إنشاء فاتورة الإدخال (purchase) لزيادة رصيد المنتج المنتج المحدد بالأسفل
      const purchaseInvoiceNumber = `PROD-IN-${timestamp}`;
      const purchaseInvoiceRes = await apiService.postData('invoices', {
        invoice_number: purchaseInvoiceNumber,
        invoice_type: 'purchase',
        contact_id: 1,
        gross_amount: totalMaterialsCost,
        net_amount: totalMaterialsCost,
        paid_amount: totalMaterialsCost,
        remaining_amount: 0,
        description: `إيداع كمية الإنتاج التام لـ [${targetProduct.name}] بعدد [${unitsToProduce} وحدة] - التكلفة محسوبة بدقة`
      });

      const purchaseInvoiceId = purchaseInvoiceRes?.id || purchaseInvoiceRes?.data?.id;

      await apiService.postData('invoice_items', {
        invoice_id: purchaseInvoiceId,
        item_id: targetProduct.id,
        quantity: unitsToProduce,
        unit_price: parseFloat(costPerUnit.toFixed(2))
      });

      // 🔄 تحديث كاش النظام وقراءة الجرد الفوري
      await queryClient.invalidateQueries({ queryKey: ['stock'] });

      alert(`✅ تم الإنتاج بنجاح مذهل!\n• المنتج النهائي: ${targetProduct.name}\n• الكمية المضافة للمخزن: ${unitsToProduce} وحدة\n• تم سحب الخامات بدقة وتثبيت الباقي في المخزن.\n• تكلفة الوحدة الصافية: ${costPerUnit.toFixed(2)} ج.م`);
      
      // تفريغ الحقول بعد النجاح
      setIngredientsInputs({});
      setRequiredUnits('');
      
      if (onBack) onBack();

    } catch (error) {
      console.error("❌ خطأ ترحيل السكيما:", error);
      alert("🚨 فشل الترحيل السحابي، يرجى مراجعة اتصال السيرفر.");
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0',
    fontSize: '16px', fontWeight: 'bold', textAlign: 'center', outline: 'none', color: '#1e293b', boxSizing: 'border-box'
  };

  const cardStyle = {
    backgroundColor: '#fff', borderRadius: '24px', padding: '20px', marginBottom: '20px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
  };

  return (
    <div style={{ direction: 'rtl', padding: '15px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: "'Tajawal', sans-serif" }}>
      
      {/* قسم معلومات الوردية */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Factory size={26} color="#4f46e5" />
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '18px', fontWeight: '700' }}>لوحة إنتاج زاد الخير الذكية</h2>
          </div>
          <button onClick={() => refetch()} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}>
            <RefreshCw size={16} color="#4f46e5" className={isLoading ? "spin-animation" : ""} />
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}><Calendar size={12} /> تاريخ الوردية</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData(p => ({...p, date: e.target.value}))} style={{ ...inputStyle, textAlign: 'right', padding: '8px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}><Clock size={12} /> الوردية</label>
            <select value={formData.shift} onChange={(e) => setFormData(p => ({...p, shift: e.target.value}))} style={{ ...inputStyle, padding: '8px' }}>
              {shifts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* قسم المواد الخام المستهلكة بالأعلى */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <Zap size={20} color="#f59e0b" />
          <h3 style={{ margin: 0, color: '#475569', fontSize: '15px', fontWeight: '700' }}>1️⃣ أدخل كميات المواد الخام المستخدمة فعلياً</h3>
        </div>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '15px', color: '#4f46e5', fontWeight: 'bold' }}>🔄 جاري فحص أرصدة المخزن...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
            {rawMaterials.map(item => (
              <div key={item.id} style={{ background: '#f8fafc', padding: '10px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <input 
                  type="number" 
                  value={ingredientsInputs[item.id] || ''} 
                  placeholder="0" 
                  onChange={(e) => handleRawInputChange(item.id, e.target.value)} 
                  style={{ ...inputStyle, padding: '8px', fontSize: '15px' }} 
                />
                <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: '600', color: (item.available_quantity || 0) > 0 ? '#10b981' : '#ef4444', textAlign: 'center' }}>
                  المخزن: {item.available_quantity || 0}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* الشاشة الجديدة بالأسفل: تحديد نوع المنتج والكمية المطلوبة بدقة والربط بزر الحفظ */}
      <div style={{ ...cardStyle, backgroundColor: '#1e293b', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          <Layers size={20} color="#3b82f6" />
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '15px', fontWeight: '700' }}>2️⃣ شاشة أمر الإنتاج المستهدف وتوزيع التكلفة</h3>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '15px', color: '#3b82f6' }}>جاري تحميل الأصناف...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
            
            {/* الخانة الأولى: اختيار اسم المنتج التام المطلوب إنتاجه */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>نوع المنتج المطلوب إنتاجه من الخامات</label>
              <select 
                value={selectedProductId} 
                onChange={(e) => setSelectedProductId(e.target.value)} 
                style={{ ...inputStyle, background: '#2d3a4f', color: '#fff', border: '1px solid #475569', textAlign: 'right' }}
              >
                <option value="">-- اختر المنتج التام --</option>
                {readyProducts.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} (المخزون الحالي: {product.available_quantity || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* الخانة الثانية: تسجيل عدد الوحدات المطلوب إنتاجها */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>عدد الوحدات المطلوب إنتاجها (سيتم خصم الخامات المحددة لها والباقي يرد للمخزن)</label>
              <input 
                type="number" 
                value={requiredUnits} 
                placeholder="اكتب عدد الوحدات هنا (مثال: 500)" 
                onChange={(e) => setRequiredUnits(e.target.value)} 
                style={{ ...inputStyle, background: '#2d3a4f', color: '#10b981', border: '1px solid #475569' }} 
              />
            </div>

          </div>
        )}

        {/* زر الترحيل الرئيسي المرتبط بحسابات الشاشة المضافة */}
        <button 
          onClick={handleProcessProduction} 
          style={{ width: '100%', padding: '15px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', marginTop: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Save size={18} /> ترحيل كميات الإنتاج المحددة وتفعيل الـ Trigger
        </button>
      </div>

      {/* زر العودة للشاشة السابقة */}
      <button onClick={onBack} style={{ width: '100%', background: '#fff', border: '1px solid #cbd5e1', padding: '14px', borderRadius: '15px', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ArrowLeft size={16} /> العودة للشاشة السابقة</button>
    </div>
  );
};

export default ProductionManager;
