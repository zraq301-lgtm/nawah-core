// src/components/ProductionManager.jsx
import React, { useState, useEffect } from 'react';
import { Factory, Save, ArrowLeft, Box, Calendar, Clock, Zap, RefreshCw, PackagePlus } from 'lucide-react';

// 🚀 إدارة الكاش والمزامنة الفورية لـ زاد الخير
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

const ProductionManager = ({ onBack }) => {
  const queryClient = useQueryClient();

  // 🎛️ وضع التصنيع القياسي الصارم مفعل دائماً لمنع أي إدخال يدوي عشوائي بالخامات
  const [isStrictBOMMode] = useState(true);

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

  // 🔄 تصفية المواد الخام بشكل صارم بناءً على الـ item_type الصحيح فقط من السيرفر
  const rawMaterials = itemsList.filter(item => {
    if (!item) return false;
    const itemType = (item.item_type || '').toString().toLowerCase().trim();
    return (
      itemType === 'raw_material' || 
      itemType === 'خامة' || 
      itemType === 'مواد خام' || 
      itemType === 'خامات'
    );
  });

  //  doughnut تصفية المنتجات النهائية الجاهزة التي تمتلك معادلة تصنيع من السيرفر
  const readyProducts = itemsList.filter(item => {
    if (!item) return false;
    const itemType = (item.item_type || '').toString().toLowerCase().trim();
    return (
      itemType === 'product' || 
      itemType === 'منتج' || 
      itemType === 'منتج جاهز' || 
      itemType === 'منتج نهائي'
    );
  });

  // حالات تخزين مدخلات شاشة التشغيل التلقائي
  const [selectedProductId, setSelectedProductId] = useState('');
  const [unitsToProduce, setUnitsToProduce] = useState('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'الأولى'
  });

  const shifts = ['الأولى', 'الثانية', 'السهرة', 'إضافي'];

  // تعيين المنتج الأول تلقائياً عند تحميل البيانات لربط شاشة الإنتاج فوراً
  useEffect(() => {
    if (readyProducts.length > 0 && !selectedProductId) {
      setSelectedProductId(readyProducts[0].id.toString());
    }
  }, [stockResponse, readyProducts, selectedProductId]);

  // 🚀 معالج احتساب الطبخة والترحيل التلقائي دون أي تدخل أو إدخال يدوي في الخامات
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

    const autoQty = unitsToProduce === '' ? 0 : parseFloat(unitsToProduce);
    if (!selectedProductId || autoQty <= 0) {
      alert("⚠️ يرجى تحديد المنتج وإدخال عدد وحدات الإنتاج المطلوبة أولاً.");
      return;
    }

    try {
      const productItem = itemsList.find(s => s.id.toString() === selectedProductId.toString());
      if (!productItem) {
        alert("⚠️ المنتج المحدد غير موجود بسجلات النظام.");
        return;
      }

      // البحث عن الـ BOM المرتبط بالمنتج
      const productBom = bomsList.find(b => b.product_id.toString() === selectedProductId.toString());
      
      if (productBom && productBom.ingredients && productBom.ingredients.length > 0) {
        targetDetailsText += `[${productItem.name}: كمية ${autoQty}] `;

        producedItemsQueue.push({
          item_id: productItem.id,
          quantity: autoQty,
          unit_price: 0 
        });

        for (const ingredient of productBom.ingredients) {
          const baseQty = parseFloat(productBom.base_quantity || 1);
          const requiredIngredientQty = parseFloat(ingredient.required_quantity);
          
          // 🧮 معادلة التناسب الآلي الذكي للطبخة بناءً على المدخل السفلية فقط
          const calculatedRequiredQty = (autoQty / baseQty) * requiredIngredientQty;
          
          const rawItem = itemsList.find(s => s.id.toString() === ingredient.raw_material_id.toString());
          if (!rawItem) continue;

          const availableQty = parseFloat(rawItem.available_quantity || 0);
          const costPrice = parseFloat(rawItem.cost_price || 0);

          // التحقق من كفاية أرصدة الخامات بالمخزن قبل الخصم
          if (availableQty < calculatedRequiredQty) {
            alert(`⚠️ عجز في مخزن الخامات: المادة الخام (${rawItem.name})\nالمطلوب آلياً للتشغيل: ${calculatedRequiredQty.toFixed(2)} | المتوفر فعلياً: ${availableQty}`);
            return;
          }

          totalMaterialsCost += (calculatedRequiredQty * costPrice);
          consumedItemsQueue.push({
            item_id: rawItem.id,
            quantity: calculatedRequiredQty,
            unit_price: costPrice
          });
        }

        // حساب تكلفة الوحدة الواحدة بالتناسب مع المواد المستهلكة
        const costPerUnit = autoQty > 0 ? (totalMaterialsCost / autoQty) : 0;
        producedItemsQueue.forEach(p => {
          p.unit_price = parseFloat(costPerUnit.toFixed(2));
        });

      } else {
        alert(`⚠️ النظام القياسي يمنع الإنتاج! المنتج (${productItem.name}) لا يمتلك معادلة تصنيع (BOM) معتمدة بالسيرفر، يرجى مراجعة الإعدادات.`);
        return;
      }

      // 🟩 أولاً: ترحيل فاتورة سحب المواد الخام التلقائية (sale)
      if (consumedItemsQueue.length > 0) {
        const saleInvoiceNumber = `RAW-AUTO-${timestamp}`;
        const saleInvoiceRes = await apiService.postData('invoices', {
          invoice_number: saleInvoiceNumber,
          invoice_type: 'sale',
          contact_id: 1, 
          gross_amount: totalMaterialsCost,
          net_amount: totalMaterialsCost,
          paid_amount: totalMaterialsCost,
          remaining_amount: 0,
          description: `خصم خامات آلي لخط الإنتاج بدون مدخلات يدوية لمعيار الطبخة لإنتاج: ${targetDetailsText}`
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

      // 🟦 ثانياً: ترحيل فاتورة توريد وإيداع المنتج النهائي التام (purchase)
      if (producedItemsQueue.length > 0) {
        const purchaseInvoiceNumber = `PROD-AUTO-${timestamp}`;
        
        const purchaseInvoiceRes = await apiService.postData('invoices', {
          invoice_number: purchaseInvoiceNumber,
          invoice_type: 'purchase',
          contact_id: 1,
          gross_amount: totalMaterialsCost,
          net_amount: totalMaterialsCost,
          paid_amount: totalMaterialsCost,
          remaining_amount: 0,
          description: `إيداع آلي وربط مباشر للمنتج التام لوردية ${formData.shift} بناءً على تشغيلة الـ BOM بسحابة زاد الخير.`
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

      // تحديث البيانات في الكاش لإظهار الأرصدة الجديدة فوراً
      await queryClient.invalidateQueries({ queryKey: ['stock'] });

      alert(`✅ [نظام زاد الخير القياسي]: تم الإنتاج والربط الآلي بنجاح! تم احتساب وبث نسب المواد الخام وتحديث المنتج التام فوراً.`);
      
      setUnitsToProduce('');
      if (onBack) onBack();

    } catch (error) {
      console.error("❌ خطأ عملية الترحيل الموحدة لمصنع الأغذية:", error);
      alert("🚨 فشل الترحيل السحابي، يرجى مراجعة اتصال السيرفر مع سحابة زاد الخير.");
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0',
    fontSize: '15px', fontWeight: 'bold', textAlign: 'center', outline: 'none', color: '#1e293b', boxSizing: 'border-box'
  };

  const cardStyle = {
    backgroundColor: '#fff', borderRadius: '24px', padding: '20px', marginBottom: '20px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', boxSizing: 'border-box'
  };

  return (
    <div style={{ direction: 'rtl', padding: '24px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: "'Tajawal', sans-serif", maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* رأس الشاشة */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '24px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>شاشة إدارة خط الإنتاج الآلي</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>الربط القياسي المباشر لجدول الكميات والمعادلات (BOM)</p>
        </div>
        <span style={{ fontSize: '12px', fontWeight: '900', padding: '6px 12px', borderRadius: '8px', backgroundColor: '#d1fae5', color: '#065f46' }}>
          ⚙️ نظام زاد الخير الذكي نشط
        </span>
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

      {/* عرض شبكة المواد الخام فقط (بدون أي مدخلات يدوية أو حقول للمنتجات النهائية) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }}>
        
        <div style={{ ...cardStyle, backgroundColor: '#1e293b', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', borderBottom: '1px solid #475569', paddingBottom: '10px' }}>
            <Box size={20} color="#3b82f6" />
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: '700' }}>📦 أرصدة المواد الخام الحالية بالمخزن (للاطلاع والمراقبة)</h3>
          </div>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '15px', color: '#3b82f6' }}>جاري جلب كميات المخزن الحالية...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {rawMaterials.map(material => (
                <div key={material.id} style={{ backgroundColor: '#2d3a4f', padding: '12px 16px', borderRadius: '14px', border: '1px solid #475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{material.name}</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#10b981', backgroundColor: '#1e293b', padding: '4px 10px', borderRadius: '8px' }}>
                    {material.available_quantity || 0} وحدة
                  </span>
                </div>
              ))}
              {rawMaterials.length === 0 && (
                <div style={{ color: '#94a3b8', fontSize: '13px', padding: '10px' }}>لا توجد مواد خام معرفة بنوع (raw_material) حالياً.</div>
              )}
            </div>
          )}
        </div>

        {/* لافتة توجيهية لتوضيح المعالجة الآلية */}
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '2px dashed #a7f3d0', textAlign: 'center', padding: '20px' }}>
          <h4 style={{ margin: '0 0 4px 0', color: '#064e3b', fontSize: '15px', fontWeight: '700' }}>مبدأ السحب والاحتساب التلقائي ذو المعيار الصارم</h4>
          <p style={{ margin: 0, fontSize: '12px', color: '#047857', lineHeight: '1.6' }}>
            يتم احتساب كميات السكر، البلح، وباقي الخامات آلياً بالجرام والوحدة فور كتابة الإنتاج المطلوب بالأسفل، دون أي تدخل بشري لضمان مطابقة الجرد الفعلي للمخازن.
          </p>
        </div>

        {/* شاشة تشغيل وإنتاج الوحدات المطلوبة (المدخل الرئيسي الوحيد للعملية) */}
        <div style={{ ...cardStyle, border: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <PackagePlus size={22} color="#4f46e5" />
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>🎯 شاشة تشغيل وإنتاج الوحدات المطلوبة (الربط المباشر للطبخة)</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#475569', fontWeight: '700' }}>اسم المنتج المراد إنتاجه بالمعادلة</label>
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
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#475569', fontWeight: '700' }}>عدد الوحدات المراد إنتاجها</label>
              <input 
                type="number" 
                placeholder="أدخل عدد الوحدات (مثال: 5)" 
                value={unitsToProduce} 
                onChange={(e) => setUnitsToProduce(e.target.value)} 
                style={{ ...inputStyle, border: '2px solid #4f46e5', backgroundColor: '#fff' }} 
              />
            </div>
          </div>
        </div>

      </div>

      {/* زر الحفظ والترحيل النهائي وتفعيل الـ Trigger */}
      <button 
        onClick={handleProcessProduction} 
        style={{ width: '100%', padding: '16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', marginTop: '24px', marginBottom: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
      >
        <Save size={18} /> ترحيل وإخراج العمليات المترابطة وتفعيل الـ Trigger
      </button>

      {/* زر العودة */}
      <button onClick={onBack} style={{ width: '100%', background: '#fff', border: '1px solid #cbd5e1', padding: '14px', borderRadius: '15px', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <ArrowLeft size={16} /> العودة للشاشة السابقة
      </button>
    </div>
  );
};

export default ProductionManager;
