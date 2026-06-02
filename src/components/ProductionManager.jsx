// src/components/ProductionManager.jsx
import React, { useState, useEffect } from 'react';
import { Factory, Save, ArrowLeft, Box, Calendar, Clock, Zap, RefreshCw, PackagePlus } from 'lucide-react';

// 🚀 إدارة الكاش والمزامنة الفورية لـ زاد الخير
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

const ProductionManager = ({ onBack }) => {
  const queryClient = useQueryClient();

  // 🎛️ وضع التصنيع الافتراضي: تفعيله افتراضياً لتطبيق المعيار العالمي الصارم للطبخة
  const [isStrictBOMMode, setIsStrictBOMMode] = useState(true);

  // 📥 جلب بيانات جدول الأصناف (items) من السكيما
  const { data: stockResponse, isLoading, refetch } = useQuery({
    queryKey: ['stock'],
    queryFn: () => apiService.getData('stock'),
    staleTime: 0, 
  });

  // 📥 جلب معادلات الإنتاج (BOM) من قاعدة البيانات
  const { data: bomsResponse } = useQuery({
    queryKey: ['boms'],
    queryFn: () => apiService.getData('product_boms'),
    staleTime: 0,
  });

  const itemsList = Array.isArray(stockResponse)
    ? stockResponse
    : (stockResponse?.data || stockResponse?.items || []);

  const bomsList = Array.isArray(bomsResponse)
    ? bomsResponse
    : (bomsResponse?.data || bomsResponse?.items || []);

  // 🔄 تصفية الخامات بناءً على سكيما items المحدثة
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

  // حالات تخزين مدخلات الكميات
  const [ingredientsInputs, setIngredientsInputs] = useState({});
  const [productsInputs, setProductsInputs] = useState({});
  const [targetInputs, setTargetInputs] = useState({}); // 🎯 كميات الإنتاج المطلوبة/المستهدفة
  
  // 🆕 حالات شاشة إنتاج الوحدات المطلوبة بالأسفل (ربط تلقائي ذكي)
  const [selectedProductId, setSelectedProductId] = useState('');
  const [unitsToProduce, setUnitsToProduce] = useState('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'الأولى'
  });

  const shifts = ['الأولى', 'الثانية', 'السهرة', 'إضافي'];

  // تهيئة قيم المدخلات فور جلب البيانات من السيرفر
  useEffect(() => {
    if (itemsList.length > 0) {
      setIngredientsInputs(prev => {
        const updated = { ...prev };
        rawMaterials.forEach(item => {
          if (item.id && updated[item.id] === undefined) updated[item.id] = '';
        });
        return updated;
      });

      setProductsInputs(prev => {
        const updated = { ...prev };
        readyProducts.forEach(item => {
          if (item.id && updated[item.id] === undefined) updated[item.id] = '';
        });
        return updated;
      });

      setTargetInputs(prev => {
        const updated = { ...prev };
        readyProducts.forEach(item => {
          if (item.id && updated[item.id] === undefined) updated[item.id] = '';
        });
        return updated;
      });

      // تعيين أول منتج كخيار افتراضي في القائمة المنسدلة لشاشة التشغيل التلقائي بالأسفل
      if (readyProducts.length > 0 && !selectedProductId) {
        setSelectedProductId(readyProducts[0].id.toString());
      }
    }
  }, [stockResponse]);

  const handleInputChange = (itemId, value, type) => {
    const key = itemId.toString();
    if (type === 'ingredients') {
      setIngredientsInputs(prev => ({ ...prev, [key]: value }));
    } else if (type === 'products') {
      setProductsInputs(prev => ({ ...prev, [key]: value }));
    } else if (type === 'targets') {
      setTargetInputs(prev => ({ ...prev, [key]: value }));
    }
  };

  // 🚀 الدالة الكبرى المدمجة للترحيل الذكي والربط التلقائي المباشر بجدول الـ BOM
  const handleProcessProduction = async () => {
    const timestamp = Date.now();
    let consumedItemsQueue = [];
    let producedItemsQueue = [];
    let totalMaterialsCost = 0;
    let targetDetailsText = "";

    if (!itemsList || itemsList.length === 0) {
      alert("⚠️ لا توجد بيانات مخزون متاحة حالياً، يرجى تحديث الصفحة.");
      return;
    }

    // 🏗️ تجميع المنتجات المراد إنتاجها: سواء من الشبكة العلوية أو من شاشة الإنتاج الآلية بالأسفل
    let productionOrders = {};

    // 1. قراءة الكميات من حقول الشبكة العلوية (إن وجدت)
    for (const [productId, rawValue] of Object.entries(productsInputs || {})) {
      const qty = rawValue === '' ? 0 : parseFloat(rawValue);
      if (qty > 0) {
        productionOrders[productId] = (productionOrders[productId] || 0) + qty;
      }
    }

    // 2. دمج الكمية المدخلة تلقائياً من الشاشة السفلية وإلحاقها بأوامر التشغيل فوراً
    const autoQty = unitsToProduce === '' ? 0 : parseFloat(unitsToProduce);
    if (selectedProductId && autoQty > 0) {
      productionOrders[selectedProductId] = (productionOrders[selectedProductId] || 0) + autoQty;
    }

    try {
      // ----------------------------------------------------
      // 🛡️ المسار الأول: نظام التصنيع القياسي الصارم المستند إلى BOM والطبخة آلياً
      // ----------------------------------------------------
      if (isStrictBOMMode) {
        
        if (Object.keys(productionOrders).length === 0) {
          alert("⚠️ يرجى تحديد كمية للمنتج المراد إنتاجه (سواء في حقل المنفذ الفعلي أو شاشة التشغيل بالأسفل) لبدء السحب التلقائي.");
          return;
        }

        for (const [productId, produceQty] of Object.entries(productionOrders)) {
          const productItem = itemsList.find(s => s.id.toString() === productId.toString());
          if (!productItem) continue;

          // التحقق الأمني المعياري
          const itemType = (productItem.item_type || '').toString().toLowerCase().trim();
          if (itemType === 'raw_material' || itemType === 'خامة' || itemType === 'مواد خام') {
            alert(`⚠️ خرق معايير الأمان: الصنف (${productItem.name}) معرف كمادة خام ولا يمكن إصدار أمر إنتاج له!`);
            return;
          }

          // البحث عن الـ BOM المرتبط بالمنتج
          const productBom = bomsList.find(b => b.product_id.toString() === productId.toString());
          
          if (productBom && productBom.ingredients && productBom.ingredients.length > 0) {
            targetDetailsText += `[${productItem.name}: كمية ${produceQty}] `;

            producedItemsQueue.push({
              item_id: productItem.id,
              quantity: produceQty,
              unit_price: 0 
            });

            for (const ingredient of productBom.ingredients) {
              const baseQty = parseFloat(productBom.base_quantity || 1);
              const requiredIngredientQty = parseFloat(ingredient.required_quantity);
              
              // 🧮 معادلة التناسب الآلي للطبخة بدون تدخل يدوي
              const calculatedRequiredQty = (produceQty / baseQty) * requiredIngredientQty;
              
              const rawItem = itemsList.find(s => s.id.toString() === ingredient.raw_material_id.toString());
              if (!rawItem) continue;

              const availableQty = parseFloat(rawItem.available_quantity || 0);
              const costPrice = parseFloat(rawItem.cost_price || 0);

              // التحقق من كفاية الرصيد في المخزن
              if (availableQty < calculatedRequiredQty) {
                alert(`⚠️ عجز في مخزن الخامات للطبخة: المادة الخام (${rawItem.name})\nالمطلوب آلياً للتشغيل: ${calculatedRequiredQty.toFixed(2)} | المتوفر فعلياً: ${availableQty}`);
                return;
              }

              totalMaterialsCost += (calculatedRequiredQty * costPrice);
              consumedItemsQueue.push({
                item_id: rawItem.id,
                quantity: calculatedRequiredQty,
                unit_price: costPrice
              });
            }
          } else {
            alert(`⚠️ النظام القياسي يمنع الإنتاج التلقائي بدون معادلة! المنتج (${productItem.name}) ليس له معادلة تصنيع (BOM) معتمدة بالسيرفر.`);
            return;
          }
        }

        // توزيع التكلفة بالتناسب على الوحدات المنتجة
        const totalUnits = producedItemsQueue.reduce((acc, curr) => acc + curr.quantity, 0);
        const costPerUnit = totalUnits > 0 ? (totalMaterialsCost / totalUnits) : 0;
        producedItemsQueue.forEach(p => {
          p.unit_price = parseFloat(costPerUnit.toFixed(2));
        });

      } 
      // ----------------------------------------------------
      // 🔄 المسار الثاني: النظام المرن التقليدي (يدوي وحر)
      // ----------------------------------------------------
      else {
        for (const [itemId, rawValue] of Object.entries(ingredientsInputs || {})) {
          const requiredQty = rawValue === '' ? 0 : parseFloat(rawValue);
          if (requiredQty <= 0) continue;
          
          const stockItem = itemsList.find(s => s.id.toString() === itemId.toString());
          if (!stockItem) continue;

          const availableQty = parseFloat(stockItem.available_quantity || 0);
          const costPrice = parseFloat(stockItem.cost_price || 0);

          if (availableQty < requiredQty) {
            alert(`⚠️ عجز في المادة الخام: ${stockItem.name}\nالمطلوب: ${requiredQty} | المتوفر: ${availableQty}`);
            return;
          }

          totalMaterialsCost += (requiredQty * costPrice);
          consumedItemsQueue.push({ item_id: stockItem.id, quantity: requiredQty, unit_price: costPrice });
        }

        let totalEnteredQuantity = 0;
        // دمج الكميات اليدوية والآلية السفلية في الوضع المرن أيضاً
        for (const [itemId, qty] of Object.entries(productionOrders)) {
          const stockItem = itemsList.find(s => s.id.toString() === itemId.toString());
          if (!stockItem) continue;

          const targetValue = targetInputs[itemId] || 0;
          const targetQty = targetValue === '' ? 0 : parseFloat(targetValue);
          targetDetailsText += `[${stockItem.name}: مطلوب ${targetQty} -> تم ${qty}] `;

          totalEnteredQuantity += qty;
          producedItemsQueue.push({ item_id: stockItem.id, quantity: qty, unit_price: 0 });
        }

        if (consumedItemsQueue.length === 0 && producedItemsQueue.length === 0) {
          alert("⚠️ يرجى إدخال كميات يدوية لإتمام عملية الترحيل في الوضع المرن.");
          return;
        }

        const costPerUnit = totalEnteredQuantity > 0 ? (totalMaterialsCost / totalEnteredQuantity) : 0;
        producedItemsQueue.forEach(p => {
          const stockItem = itemsList.find(s => s.id.toString() === p.item_id.toString());
          p.unit_price = costPerUnit > 0 ? parseFloat(costPerUnit.toFixed(2)) : parseFloat(stockItem?.cost_price || 0);
        });
      }

      // ----------------------------------------------------
      // 🟩 ترحيل الفواتير السحابية الموحدة (Transactions)
      // ----------------------------------------------------
      if (consumedItemsQueue.length > 0) {
        const saleInvoiceNumber = isStrictBOMMode ? `RAW-AUTO-${timestamp}` : `RAW-OUT-${timestamp}`;
        const saleInvoiceRes = await apiService.postData('invoices', {
          invoice_number: saleInvoiceNumber,
          invoice_type: 'sale',
          contact_id: 1, 
          gross_amount: totalMaterialsCost,
          net_amount: totalMaterialsCost,
          paid_amount: totalMaterialsCost,
          remaining_amount: 0,
          description: isStrictBOMMode 
            ? `خصم خامات تلقائي وبدون مدخلات يدوية لمعيار الطبخة (BOM) لإنتاج: ${targetDetailsText}`
            : `سحب خامات تشغيل إنتاج يدوي - وردية ${formData.shift} بتاريخ ${formData.date}`
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
      }

      if (producedItemsQueue.length > 0) {
        const purchaseInvoiceNumber = isStrictBOMMode ? `PROD-AUTO-${timestamp}` : `PROD-IN-${timestamp}`;
        const finalAmount = totalMaterialsCost > 0 ? totalMaterialsCost : producedItemsQueue.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
        
        const purchaseInvoiceRes = await apiService.postData('invoices', {
          invoice_number: purchaseInvoiceNumber,
          invoice_type: 'purchase',
          contact_id: 1,
          gross_amount: finalAmount,
          net_amount: finalAmount,
          paid_amount: finalAmount,
          remaining_amount: 0,
          description: isStrictBOMMode
            ? `إيداع آلي وربط مباشر للمنتج التام بناءً على حسابات تشغيلة الطبخة القياسية المعالجة بسحابة زاد الخير.`
            : `إيداع خط الإنتاج التام اليدوي - وردية ${formData.shift} بتاريخ ${formData.date}`
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
      }

      await queryClient.invalidateQueries({ queryKey: ['stock'] });

      alert(isStrictBOMMode 
        ? `✅ [نظام زاد الخير القياسي]: تم الربط الآلي بجميع المواد مباشرة! تم سحب الخامات بدقة وتحديث المخزن والمنتج التام سحابياً فوراً.`
        : `✅ [النظام المرن]: تم ترحيل كميات خط الإنتاج بنجاح!`
      );
      
      setIngredientsInputs({});
      setProductsInputs({});
      setUnitsToProduce('');
      if (onBack) onBack();

    } catch (error) {
      console.error("❌ خطأ عملية الترحيل الموحدة لمصنع الأغذية:", error);
      alert("🚨 فشل الترحيل السحابي، يرجى مراجعة اتصال السيرفر مع سحابة زاد الخير.");
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '12px', border: '2px solid #e2e8f0',
    fontSize: '15px', fontWeight: 'bold', textAlign: 'center', outline: 'none', color: '#1e293b', boxSizing: 'border-box'
  };

  const cardStyle = {
    backgroundColor: '#fff', borderRadius: '24px', padding: '20px', marginBottom: '20px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', boxSizing: 'border-box'
  };

  const toggleContainerStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff',
    padding: '15px 20px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    marginBottom: '24px', gap: '16px', flexWrap: 'wrap', boxSizing: 'border-box'
  };

  return (
    <div style={{ direction: 'rtl', padding: '24px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: "'Tajawal', sans-serif", maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* 🎛️ لوحة التبديل السريع */}
      <div style={toggleContainerStyle}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>إدارة خط الإنتاج والوردية</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>اختر وضع معالجة العمليات والربط بين المخزن والتشغيل</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f8fafc', padding: '8px 16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>نمط الاحتساب:</span>
          <button
            type="button"
            onClick={() => setIsStrictBOMMode(!isStrictBOMMode)}
            style={{
              position: 'relative', display: 'inline-flex', height: '24px', width: '48px', alignItems: 'center',
              borderRadius: '9999px', transition: 'background-color 0.3s', border: 'none', cursor: 'pointer', outline: 'none',
              backgroundColor: isStrictBOMMode ? '#059669' : '#f59e0b'
            }}
          >
            <span
              style={{
                display: 'inline-block', height: '16px', width: '16px', borderRadius: '50%', backgroundColor: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'transform 0.3s',
                transform: isStrictBOMMode ? 'translateX(-28px)' : 'translateX(-4px)'
              }}
            />
          </button>
          <span style={{
            fontSize: '12px', fontWeight: '900', padding: '4px 10px', borderRadius: '8px',
            backgroundColor: isStrictBOMMode ? '#d1fae5' : '#fef3c7',
            color: isStrictBOMMode ? '#065f46' : '#92400e'
          }}>
            {isStrictBOMMode ? '⚙️ معادلات الطبخة القياسية BOM' : '📝 إدخال مرن يدوي'}
          </span>
        </div>
      </div>

      {/* قسم معلومات الوردية */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Factory size={24} color="#4f46e5" />
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>بيانات الوردية والتشغيل الحالية</h3>
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

      {/* عرض شبكة الجداول */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* 1) جدول رصد الإنتاج التام العلوي للشبكة */}
        <div style={{ ...cardStyle, backgroundColor: '#1e293b', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', borderBottom: '1px solid #475569', paddingBottom: '10px' }}>
            <Box size={20} color="#3b82f6" />
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: '700' }}>📋 الكميات والمنتجات المنفذة فعلياً (شبكة تحكم اختيارية)</h3>
          </div>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '15px', color: '#3b82f6' }}>جاري تحميل الأصناف...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {readyProducts.map(product => (
                <div key={product.id} style={{ backgroundColor: '#2d3a4f', padding: '15px', borderRadius: '18px', border: '1px solid #475569' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px dashed #475569', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>{product.name}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>الرصيد بالمخزن: {product.available_quantity || 0} وحدة</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textAlign: 'center' }}>🎯 الكمية المطلوبة</label>
                      <input 
                        type="number" 
                        value={targetInputs[product.id] !== undefined ? targetInputs[product.id] : ''} 
                        placeholder="المستهدف" 
                        onChange={(e) => handleInputChange(product.id, e.target.value, 'targets')} 
                        style={{ ...inputStyle, background: '#1e293b', color: '#f59e0b', border: '1px solid #475569', padding: '8px' }} 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textAlign: 'center' }}>✅ الكمية المنتجة فعلياً</label>
                      <input 
                        type="number" 
                        value={productsInputs[product.id] !== undefined ? productsInputs[product.id] : ''} 
                        placeholder="المنفذ الفعلي" 
                        onChange={(e) => handleInputChange(product.id, e.target.value, 'products')} 
                        style={{ ...inputStyle, background: '#1e293b', color: '#10b981', border: '1px solid #475569', padding: '8px' }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2) شق المواد الخام يدوياً في الوضع المرن */}
        {!isStrictBOMMode ? (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <Zap size={20} color="#f59e0b" />
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>🪵 المواد الخام المستهلكة يدوياً</h3>
            </div>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '15px', color: '#4f46e5', fontWeight: 'bold' }}>🔄 جاري فحص أرصدة المخزن...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {rawMaterials.map(item => (
                  <div key={item.id} style={{ background: '#f8fafc', padding: '10px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <input 
                      type="number" 
                      value={ingredientsInputs[item.id] !== undefined ? ingredientsInputs[item.id] : ''} 
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
        ) : (
          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '2px dashed #a7f3d0', textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#d1fae5', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px auto' }}>⚙️</div>
            <h4 style={{ margin: '0 0 6px 0', color: '#064e3b', fontSize: '16px', fontWeight: '700' }}>معيار الطبخة والربط الآلي نشط حالياً</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#047857', lineHeight: '1.6', maxWidth: '520px', margin: '0 auto' }}>
              تطبيق <span style={{ fontWeight: '700' }}>زاد الخير</span> مربوط بجدول الـ BOM سحابياً. بمجرد كتابة عدد الوحدات بالأسفل، يقوم المعالج برصد وتوزيع المكونات ونسب الهدر تلقائياً دون أي حاجة لمدخلات الخامات اليدوية.
            </p>
          </div>
        )}

        {/* 3) شاشة تشغيل وإنتاج الوحدات المطلوبة (تم تعديلها لقائمة منسدلة من أصناف السيرفر للربط الآلي) */}
        <div style={{ ...cardStyle, border: '2px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <PackagePlus size={22} color="#4f46e5" />
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>🎯 شاشة تشغيل وإنتاج الوحدات المطلوبة (الربط المباشر للطبخة)</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}>اسم المنتج المراد إنتاجه بالمعادلة</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                style={inputStyle}
              >
                {readyProducts.map(prod => (
                  <option key={prod.id} value={prod.id}>{prod.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}>عدد الوحدات المراد إنتاجها</label>
              <input 
                type="number" 
                placeholder="أدخل الكمية ليتم السحب فوراً" 
                value={unitsToProduce} 
                onChange={(e) => setUnitsToProduce(e.target.value)} 
                style={inputStyle} 
              />
            </div>
          </div>
        </div>

      </div>

      {/* زر الحفظ والترحيل النهائي */}
      <button 
        onClick={handleProcessProduction} 
        style={{ width: '100%', padding: '16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', marginTop: '24px', marginBottom: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
      >
        <Save size={18} /> ترحيل وإنتاج العمليات المترابطة وتفعيل الـ Trigger
      </button>

      {/* زر العودة */}
      <button onClick={onBack} style={{ width: '100%', background: '#fff', border: '1px solid #cbd5e1', padding: '14px', borderRadius: '15px', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ArrowLeft size={16} /> العودة للشاشة السابقة</button>
    </div>
  );
};

export default ProductionManager;
