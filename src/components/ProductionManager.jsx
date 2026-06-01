// src/components/ProductionManager.jsx
import React, { useState, useEffect } from 'react';
import { Factory, Save, ArrowLeft, Box, Calendar, Clock, Zap, RefreshCw, PackagePlus, ArrowDownLeft } from 'lucide-react';

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

  // 🍩 تصفية المنتجات الجاهزة والنهائية لـ زاد الخير (مثل المعمول والإنتاج التام)
  const readyProducts = itemsList.filter(item => {
    if (!item) return false;
    const itemType = (item.item_type || '').toString().toLowerCase().trim();
    const itemName = (item.name || '').toString().toLowerCase().trim();
    return itemType === 'product' || itemName.includes('معمول') || itemName.includes('جاهز') || itemType === 'منتج جاهز';
  });

  // حالات تخزين مدخلات الكميات (مربوطة بـ ID الصنف مباشرة لمنع التداخل)
  const [ingredientsInputs, setIngredientsInputs] = useState({});
  const [productsInputs, setProductsInputs] = useState({});
  const [targetInputs, setTargetInputs] = useState({}); // 🎯 كميات الإنتاج المطلوبة/المستهدفة
  
  // 🆕 حالات شاشة إنتاج الوحدات الجديدة بالأسفل
  const [customProductName, setCustomProductName] = useState('');
  const [unitsToProduce, setUnitsToProduce] = useState(0);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'الأولى'
  });

  const shifts = ['الأولى', 'الثانية', 'السهرة', 'إضافي'];

  // تهيئة قيم المدخلات فور جلب البيانات من السيرفر دون مسح مدخلات المستخدم الحالية
  useEffect(() => {
    if (itemsList.length > 0) {
      setIngredientsInputs(prev => {
        const updated = { ...prev };
        rawMaterials.forEach(item => {
          if (item.id && updated[item.id] === undefined) updated[item.id] = 0;
        });
        return updated;
      });

      setProductsInputs(prev => {
        const updated = { ...prev };
        readyProducts.forEach(item => {
          if (item.id && updated[item.id] === undefined) updated[item.id] = 0;
        });
        return updated;
      });

      setTargetInputs(prev => {
        const updated = { ...prev };
        readyProducts.forEach(item => {
          if (item.id && updated[item.id] === undefined) updated[item.id] = 0;
        });
        return updated;
      });
    }
  }, [stockResponse]);

  const handleInputChange = (itemId, value, type) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    // تحويل الـ id دائماً لرقم أو نص موحد لمنع التداخل والتعارض
    const key = itemId.toString();
    if (type === 'ingredients') {
      setIngredientsInputs(prev => ({ ...prev, [key]: numValue }));
    } else if (type === 'products') {
      setProductsInputs(prev => ({ ...prev, [key]: numValue }));
    } else if (type === 'targets') {
      setTargetInputs(prev => ({ ...prev, [key]: numValue }));
    }
  };

  // 🚀 العملية الكبرى المدمجة: تشغيل السحب، الإنتاج التلقائي، وحساب الوحدات المخصصة المرتجعة في خطوة واحدة
  const handleProcessProduction = async () => {
    const timestamp = Date.now();
    const consumedItemsQueue = [];
    const producedItemsQueue = [];
    let totalMaterialsCost = 0;
    let targetDetailsText = ""; 

    // 1️⃣ تجميع المواد الخام المستهلكة (لعمل فاتورة سحب من نوع sale)
    for (const [itemId, requiredQty] of Object.entries(ingredientsInputs)) {
      if (requiredQty <= 0) continue;
      
      const stockItem = itemsList.find(s => s.id.toString() === itemId.toString());
      if (!stockItem) continue;

      const availableQty = parseFloat(stockItem.available_quantity || 0);
      const costPrice = parseFloat(stockItem.cost_price || 0);

      // حزام الأمان ضد عجز الرصيد
      if (availableQty < requiredQty) {
        alert(`⚠️ عجز في المادة الخام: ${stockItem.name}\nالمطلوب: ${requiredQty} | المتوفر بالمخزن: ${availableQty}`);
        return;
      }

      totalMaterialsCost += (requiredQty * costPrice);

      consumedItemsQueue.push({
        item_id: stockItem.id,
        quantity: requiredQty,
        unit_price: costPrice
      });
    }

    // منع التشغيل إذا لم يتم تحديد خامات
    if (consumedItemsQueue.length === 0) {
      alert("⚠️ يرجى تحديد مادة خام واحدة على الأقل واستهلاك كمية منها لبدء التشغيل.");
      return;
    }

    // 2️⃣ تجميع المنتجات التامة التي تم إضافة كمية إنتاج لها فعلياً
    let totalEnteredQuantity = 0;
    for (const [itemId, quantity] of Object.entries(productsInputs)) {
      if (quantity <= 0) continue;

      const stockItem = itemsList.find(s => s.id.toString() === itemId.toString());
      if (!stockItem) continue;

      const targetQty = targetInputs[itemId] || 0;
      targetDetailsText += `[${stockItem.name}: مطلوب ${targetQty} -> تم ${quantity}] `;

      totalEnteredQuantity += quantity;
      producedItemsQueue.push({
        item_id: stockItem.id,
        quantity: quantity,
        unit_price: 0 // سيتم احتسابه بالتناسب أدناه
      });
    }

    if (producedItemsQueue.length === 0) {
      alert("⚠️ لم يتم إدخال أي كميات إنتاج! يرجى كتابة عدد الوحدات المنتجة أمام الصنف الخاص بها بالأعلى.");
      return;
    }

    // 3️⃣ التحقق والربط مع الشاشة السفلية (إنتاج الوحدات المخصصة وحساب المرتجع)
    let remainingToStock = 0;
    let isCustomProductionActive = false;

    if (customProductName.trim() || unitsToProduce > 0) {
      if (!customProductName.trim()) {
        alert("⚠️ لقد بدأت في استخدام شاشة الوحدات السفلية، يرجى إدخال اسم المنتج المطلوب إنتاجه أولاً.");
        return;
      }
      if (unitsToProduce <= 0) {
        alert("⚠️ يرجى تحديد عدد وحدات صالح أكبر من الصفر للإنتاج في الشاشة السفلية.");
        return;
      }
      if (unitsToProduce > totalEnteredQuantity) {
        alert(`⚠️ عدد الوحدات المراد إنتاجها بالأسفل (${unitsToProduce}) أكبر من إجمالي الكميات المنتجة فعلياً بالأعلى (${totalEnteredQuantity}).`);
        return;
      }
      
      remainingToStock = totalEnteredQuantity - unitsToProduce;
      isCustomProductionActive = true;
    }

    // حساب توزيع نصيب التكلفة الصافية على الوحدات المنتجة بالتساوي بناءً على سحب الخامات الفعلي
    const costPerUnit = totalMaterialsCost / totalEnteredQuantity;
    producedItemsQueue.forEach(p => {
      p.unit_price = parseFloat(costPerUnit.toFixed(2));
    });

    try {
      // 🟩 الخطوة الأولى: إنشاء فاتورة السحب (sale) لتشغيل الـ Trigger وخفض أرصدة الخامات
      const saleInvoiceNumber = `RAW-OUT-${timestamp}`;
      const saleInvoiceRes = await apiService.postData('invoices', {
        invoice_number: saleInvoiceNumber,
        invoice_type: 'sale',
        contact_id: 1, 
        gross_amount: totalMaterialsCost,
        net_amount: totalMaterialsCost,
        paid_amount: totalMaterialsCost,
        remaining_amount: 0,
        description: `سحب خامات تشغيل إنتاج - وردية ${formData.shift} بتاريخ ${formData.date} | تفاصيل خطة الإنتاج المستهدفة: ${targetDetailsText}`
      });

      const saleInvoiceId = saleInvoiceRes?.id || saleInvoiceRes?.data?.id;

      // ترحيل تفاصيل الخامات المسحوبة لربطها بالفاتورة لتفعيل الـ Trigger
      for (const rawItem of consumedItemsQueue) {
        await apiService.postData('invoice_items', {
          invoice_id: saleInvoiceId,
          item_id: rawItem.item_id,
          quantity: rawItem.quantity,
          unit_price: rawItem.unit_price
        });
      }

      // 🟩 الخطوة الثانية: إنشاء فاتورة الإدخال (purchase) لتشغيل الـ Trigger وزيادة أرصدة المنتجات التامة
      const purchaseInvoiceNumber = `PROD-IN-${timestamp}`;
      const purchaseInvoiceRes = await apiService.postData('invoices', {
        invoice_number: purchaseInvoiceNumber,
        invoice_type: 'purchase',
        contact_id: 1,
        gross_amount: totalMaterialsCost,
        net_amount: totalMaterialsCost,
        paid_amount: totalMaterialsCost,
        remaining_amount: 0,
        description: `إيداع خط الإنتاج التام - وردية ${formData.shift} بتاريخ ${formData.date} | المستهدف والفعلي: ${targetDetailsText}`
      });

      const purchaseInvoiceId = purchaseInvoiceRes?.id || purchaseInvoiceRes?.data?.id;

      for (const prodItem of producedItemsQueue) {
        await apiService.postData('invoice_items', {
          invoice_id: purchaseInvoiceId,
          item_id: prodItem.item_id,
          quantity: prodItem.quantity,
          unit_price: prodItem.unit_price
        });
      }

      // 🟩 الخطوة الثالثة: ترحيل مستندات الشاشة السفلية للوحدات المخصصة وتحديث التكلفة
      let customAlertMessage = "";
      if (isCustomProductionActive) {
        const productionInvoiceNum = `UNIT-PROD-${timestamp}`;
        
        // جلب معرف أول منتج جاهز لربطه بعملية الإنتاج المخصصة ليعمل الـ Trigger بالشاشة السفلية
        const fallbackProductId = producedItemsQueue[0]?.item_id || 1;

        const prodCustomRes = await apiService.postData('invoices', {
          invoice_number: productionInvoiceNum,
          invoice_type: 'purchase',
          contact_id: 1,
          gross_amount: costPerUnit * unitsToProduce,
          net_amount: costPerUnit * unitsToProduce,
          paid_amount: costPerUnit * unitsToProduce,
          remaining_amount: 0,
          description: `أمر إنتاج مخصص للمنتج: ${customProductName} | الوحدات المحددة للإنتاج: ${unitsToProduce} وحدة.`
        });

        const prodCustomId = prodCustomRes?.id || prodCustomRes?.data?.id;
        await apiService.postData('invoice_items', {
          invoice_id: prodCustomId,
          item_id: fallbackProductId,
          quantity: unitsToProduce,
          unit_price: parseFloat(costPerUnit.toFixed(2))
        });

        // فاتورة إرجاع الفائض
        if (remainingToStock > 0) {
          const returnInvoiceNum = `PROD-RET-${timestamp}`;
          const retCustomRes = await apiService.postData('invoices', {
            invoice_number: returnInvoiceNum,
            invoice_type: 'purchase',
            contact_id: 1,
            gross_amount: costPerUnit * remainingToStock,
            net_amount: costPerUnit * remainingToStock,
            paid_amount: costPerUnit * remainingToStock,
            remaining_amount: 0,
            description: `إرجاع باقي كميات تشغيل الإنتاج الفائضة إلى المخزن - المنتج: ${customProductName} | الكمية المرجوعة: ${remainingToStock} وحدة.`
          });

          const retCustomId = retCustomRes?.id || retCustomRes?.data?.id;
          await apiService.postData('invoice_items', {
            invoice_id: retCustomId,
            item_id: fallbackProductId,
            quantity: remainingToStock,
            unit_price: parseFloat(costPerUnit.toFixed(2))
          });
        }

        customAlertMessage = `\n\n🔹 [شاشة تشغيل الوحدات المخصصة]:\n• تم إنتاج: ${unitsToProduce} وحدة من (${customProductName})\n• تم إرجاع الفائض للمخزن: ${remainingToStock} وحدة بنجاح!`;
      }

      // 🔄 تنظيف وتحديث كاش النظام لقراءة الجرد الجديد فوراً من قاعدة البيانات
      await queryClient.invalidateQueries({ queryKey: ['stock'] });

      alert(`✅ تم الإنتاج والترحيل بنجاح!\n• تم سحب الخامات تلقائياً بالفاتورة رقم: ${saleInvoiceNumber}\n• تم زيادة المنتجات الجاهزة بالفاتورة رقم: ${purchaseInvoiceNumber}\n• متوسط تكلفة الوحدة المنتجة: ${costPerUnit.toFixed(2)} ج.م${customAlertMessage}`);
      
      // تفريغ الحقول التكميلية بعد النجاح
      setIngredientsInputs({});
      setProductsInputs({});
      setTargetInputs({});
      setCustomProductName('');
      setUnitsToProduce(0);
      if (onBack) onBack();

    } catch (error) {
      console.error("❌ خطأ ترحيل السكيما الموحدة:", error);
      alert("🚨 فشل الترحيل السحابي، يرجى مراجعة اتصال السيرفر.");
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '12px', border: '2px solid #e2e8f0',
    fontSize: '15px', fontWeight: 'bold', textAlign: 'center', outline: 'none', color: '#1e293b', boxSizing: 'border-box'
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
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px', fontWeight: '700' }}>لوحة الإنتاج والمزامنة مع السكيما</h2>
          </div>
          <button onClick={() => refetch()} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}>
            <RefreshCw size={16} color="#4f46e5" className={isLoading ? "spin-animation" : ""} />
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}><Calendar size={12} /> تاريخ الوردية</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData(p => ({...p, date: e.target.value}))} style={{ ...inputStyle, textAlign: 'right' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}><Clock size={12} /> الوردية الحالية</label>
            <select value={formData.shift} onChange={(e) => setFormData(p => ({...p, shift: e.target.value}))} style={inputStyle}>
              {shifts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* قسم المواد الخام المستهلكة */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <Zap size={20} color="#f59e0b" />
          <h3 style={{ margin: 0, color: '#475569', fontSize: '15px', fontWeight: '700' }}>كميات المواد الخام المستهلكة (للسحب)</h3>
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
                  onChange={(e) => handleInputChange(item.id, e.target.value, 'ingredients')} 
                  style={{ ...inputStyle, padding: '8px' }} 
                />
                <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: '600', color: (item.available_quantity || 0) > 0 ? '#10b981' : '#ef4444', textAlign: 'center' }}>
                  المتاح: {item.available_quantity || 0}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* قسم عرض قائمة المنتجات التامة */}
      <div style={{ ...cardStyle, backgroundColor: '#1e293b', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          <Box size={20} color="#3b82f6" />
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '15px', fontWeight: '700' }}>متابعة خط الإنتاج (الكميات المطلوبة والمنفذة)</h3>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '15px', color: '#3b82f6' }}>جاري تحميل الأصناف...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {readyProducts.map(product => (
              <div 
                key={product.id} 
                style={{ 
                  backgroundColor: '#2d3a4f', 
                  padding: '15px', 
                  borderRadius: '18px',
                  border: '1px solid #475569'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px dashed #475569', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>{product.name}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>الرصيد بالمخزن: {product.available_quantity || 0} وحدة</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textAlign: 'center' }}>🎯 الكمية المطلوبة</label>
                    <input 
                      type="number" 
                      value={targetInputs[product.id] || ''} 
                      placeholder="المستهدف" 
                      onChange={(e) => handleInputChange(product.id, e.target.value, 'targets')} 
                      style={{ 
                        ...inputStyle, 
                        background: '#1e293b', 
                        color: '#f59e0b', 
                        border: '1px solid #475569', 
                        padding: '8px'
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textAlign: 'center' }}>✅ الكمية المنتجة فعلياً</label>
                    <input 
                      type="number" 
                      value={productsInputs[product.id] || ''} 
                      placeholder="المنفذ الفعلي" 
                      onChange={(e) => handleInputChange(product.id, e.target.value, 'products')} 
                      style={{ 
                        ...inputStyle, 
                        background: '#1e293b', 
                        color: '#10b981', 
                        border: '1px solid #475569', 
                        padding: '8px'
                      }} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* الشاشة الإضافية بالأسفل */}
      <div style={{ ...cardStyle, border: '2px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <PackagePlus size={22} color="#4f46e5" />
          <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>شاشة تشغيل وإنتاج الوحدات المطلوبة</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '5px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}>اسم المنتج المطلوب إنتاجه</label>
            <input 
              type="text" 
              placeholder="مثال: معمول زاد الفاخر" 
              value={customProductName} 
              onChange={(e) => setCustomProductName(e.target.value)} 
              style={{ ...inputStyle, textAlign: 'right', fontWeight: 'normal' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}>عدد الوحدات المراد إنتاجها</label>
            <input 
              type="number" 
              placeholder="0" 
              value={unitsToProduce || ''} 
              onChange={(e) => setUnitsToProduce(e.target.value === '' ? 0 : parseInt(e.target.value))} 
              style={inputStyle} 
            />
          </div>
        </div>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', lineHeight: '1.5' }}>
          💡 ملحوظة: كتابة البيانات في هذا القسم وتفعيل زر الحفظ الرئيسي بالأعلى سيقوم تلقائياً بخصم الوحدات المستهدفة وإرجاع الكمية الفائضة المتبقية إلى مخزن الجرد.
        </p>
      </div>

      {/* زر الحفظ الموحد والذكي للعمليات المترابطة بالكامل */}
      <button 
        onClick={handleProcessProduction} 
        style={{ width: '100%', padding: '16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', marginBottom: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
      >
        <Save size={18} /> ترحيل وإنتاج العمليات المترابطة وتفعيل الـ Trigger
      </button>

      {/* زر العودة للشاشة السابقة */}
      <button onClick={onBack} style={{ width: '100%', background: '#fff', border: '1px solid #cbd5e1', padding: '14px', borderRadius: '15px', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ArrowLeft size={16} /> العودة للشاشة السابقة</button>
    </div>
  );
};

export default ProductionManager;
