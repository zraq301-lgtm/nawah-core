import React, { useState, useEffect } from 'react';
import { Factory, Save, ArrowLeft, Box, Calendar, Clock, RefreshCw, PackagePlus } from 'lucide-react';

// 🚀 إدارة الكاش والمزامنة الفورية لـ زاد الخير
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

const ProductionManager = ({ onBack }) => {
  const queryClient = useQueryClient();

  // 📥 جلب بيانات جدول الأصناف (items) من السكيما لمعرفة أرصدة المواد الخام الحالية
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

  // 🔄 تصفية المواد الخام الحقيقية بشكل صارم لعرضها فقط في شبكة المراقبة والأرصدة
  const rawMaterials = itemsList.filter(item => {
    if (!item) return false;
    const itemType = (item.item_type || '').toString().toLowerCase().trim();
    return (
      itemType === 'raw_material' || 
      itemType === 'خامة' || 
      itemType === 'مواد خام' || 
      itemType === 'خامات' ||
      item.name === 'سكر' || item.name === 'بلح'
    );
  });

  // 🛑 المتغيرات: اسم المنتج كحقل إدخال نصي حر
  const [productNameInput, setProductNameInput] = useState('');
  const [unitsToProduce, setUnitsToProduce] = useState('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'الأولى'
  });

  const shifts = ['الأولى', 'الثانية', 'السهرة', 'إضافي'];

  // 🚀 معالج احتساب الطبخة والترحيل التلقائي متصل مباشرة بقاعدة البيانات
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
    const enteredName = productNameInput.trim();

    if (!enteredName || autoQty <= 0) {
      alert("⚠️ يرجى كتابة اسم المنتج المراد إنتاجه (مثل: بسبوسة) وإدخال عدد الوحدات.");
      return;
    }

    try {
      // 🔍 البحث عن الـ BOM المرتبط بالمنتج عن طريق مطابقة الاسم المكتوب
      const productBom = bomsList.find(b => 
        b.product_name?.toString().toLowerCase().trim() === enteredName.toLowerCase() ||
        b.name?.toString().toLowerCase().trim() === enteredName.toLowerCase()
      );
      
      // نبحث إن كان المنتج معرفاً مسبقاً في الأصناف داخل المخزن
      let productItem = itemsList.find(s => s.name?.toString().toLowerCase().trim() === enteredName.toLowerCase());

      let finalProductId = null;

      // 🛑 خطوة ذكية ومعدلة: تصحيح postData إلى createData لإنشاء المنتج وجلب الـ ID
      if (!productItem) {
        const newProductRes = await apiService.createData('stock', {
          name: enteredName,
          item_type: 'product',
          available_quantity: 0,
          cost_price: 0
        });
        
        // استخراج الـ ID بدقة بحسب طريقة رد السيرفر الفكرية للـ API
        if (newProductRes?.id) {
          finalProductId = newProductRes.id;
        } else if (newProductRes?.data?.id) {
          finalProductId = newProductRes.data.id;
        } else if (Array.isArray(newProductRes) && newProductRes[0]?.id) {
          finalProductId = newProductRes[0].id;
        } else if (newProductRes?.insertedId) {
          finalProductId = newProductRes.insertedId;
        } else {
          // إذا لم نجد الـ ID في الاستجابة، نقوم بعمل استعلام سريع لضمان الحصول عليه
          const freshStock = await apiService.getData('stock');
          const freshList = Array.isArray(freshStock) ? freshStock : (freshStock?.data || freshStock?.items || []);
          const foundCreated = freshList.find(s => s.name?.toString().toLowerCase().trim() === enteredName.toLowerCase());
          if (foundCreated) {
            finalProductId = foundCreated.id;
          }
        }
      } else {
        finalProductId = productItem.id;
      }

      // قفل أمان: إذا فشل النظام تماماً في توفير معرف صنف حقيقي نوقف العملية
      if (!finalProductId) {
        alert("🚨 فشل النظام في تسجيل أو تحديد كود الصنف التام في قاعدة البيانات، يرجى إعادة المحاولة.");
        return;
      }

      if (productBom && productBom.ingredients && productBom.ingredients.length > 0) {
        targetDetailsText += `[${enteredName}: كمية ${autoQty}] `;

        producedItemsQueue.push({
          item_id: finalProductId,
          quantity: autoQty,
          unit_price: 0 
        });

        for (const ingredient of productBom.ingredients) {
          const baseQty = parseFloat(productBom.base_quantity || 1);
          const requiredIngredientQty = parseFloat(ingredient.required_quantity);
          
          // 🧮 معادلة التناسب التلقائي للطبخة
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
        // دعم الإنتاج الحر المباشر في حال لم تتوفر معادلة (يسجل التكلفة الافتراضية)
        producedItemsQueue.push({
          item_id: finalProductId,
          quantity: autoQty,
          unit_price: 10 
        });
        totalMaterialsCost = autoQty * 10;
      }

      // 🟩 أولاً: ترحيل فاتورة سحب المواد الخام التلقائية (sale)
      if (consumedItemsQueue.length > 0) {
        const saleInvoiceNumber = `RAW-AUTO-${timestamp}`;
        const saleInvoiceRes = await apiService.createData('invoices', {
          invoice_number: saleInvoiceNumber,
          invoice_type: 'sale',
          contact_id: 1, 
          gross_amount: totalMaterialsCost,
          net_amount: totalMaterialsCost,
          paid_amount: totalMaterialsCost,
          remaining_amount: 0,
          description: `خصم خامات آلي لخط الإنتاج لمنتج مكتوب يدوياً: ${enteredName} عدد ${autoQty}`
        });

        const saleInvoiceId = saleInvoiceRes?.id || saleInvoiceRes?.data?.id;
        for (const rawItem of consumedItemsQueue) {
          await apiService.createData('invoice_items', {
            invoice_id: saleInvoiceId,
            item_id: rawItem.item_id,
            quantity: rawItem.quantity,
            unit_price: rawItem.unit_price
          });
        }
      }

      // 🟦 ثانياً: ترحيل الإنتاج التام (purchase)
      if (producedItemsQueue.length > 0) {
        const purchaseInvoiceNumber = `PROD-AUTO-${timestamp}`;
        
        // 1. إدراج رأس الفاتورة في جدول الفواتير
        const purchaseInvoiceRes = await apiService.createData('invoices', {
          invoice_number: purchaseInvoiceNumber,
          invoice_type: 'purchase',
          contact_id: 1,
          gross_amount: totalMaterialsCost,
          net_amount: totalMaterialsCost,
          paid_amount: totalMaterialsCost,
          remaining_amount: 0,
          description: `إيداع وتصنيع فوري للمنتج: [ ${enteredName} ] وردية ${formData.shift} إلى مخزن زاد الخير التام.`
        });

        // 2. إدراج تفاصيل المنتج التام في جدول أصناف الفاتورة
        const purchaseInvoiceId = purchaseInvoiceRes?.id || purchaseInvoiceRes?.data?.id;
        for (const prodItem of producedItemsQueue) {
          await apiService.createData('invoice_items', {
            invoice_id: purchaseInvoiceId,
            item_id: prodItem.item_id,
            quantity: prodItem.quantity,
            unit_price: prodItem.unit_price
          });
        }
      }

      // تحديث البيانات في الكاش لإظهار الأرصدة المتغيرة فوراً على الشاشة
      await queryClient.invalidateQueries({ queryKey: ['stock'] });

      alert(`✅ [نظام زاد الخير]: تم ترحيل الإنتاج للمنتج (${enteredName}) بعدد وحدات (${autoQty}) بنجاح، وتحديث المخازن فوراً بروابط قاعدة البيانات.`);
      
      setProductNameInput('');
      setUnitsToProduce('');
      if (onBack) onBack();

    } catch (error) {
      console.error("❌ خطأ في ترحيل العمليات المترابطة بقاعدة البيانات:", error);
      alert(`🚨 فشل الترحيل إلى قاعدة البيانات: ${error.message || "يرجى مراجعة قيود الجداول"}`);
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
    <div style={{ direction: 'rtl', padding: '24px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: "sans-serif", maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* رأس الشاشة */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '24px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>شاشة إدارة خط الإنتاج والمخازن</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>سحب تلقائي للمواد الخام بناءً على المنتج المدخل يدوياً</p>
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
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}>تاريخ الوردية</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData(p => ({...p, date: e.target.value}))} style={{ ...inputStyle, textAlign: 'right' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#64748b', fontWeight: '600' }}>الوردية الحالية</label>
            <select value={formData.shift} onChange={(e) => setFormData(p => ({...p, shift: e.target.value}))} style={inputStyle}>
              {shifts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* أرصدة المواد الخام الحالية */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }}>
        <div style={{ ...cardStyle, backgroundColor: '#1e293b', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', borderBottom: '1px solid #475569', paddingBottom: '10px' }}>
            <Box size={20} color="#3b82f6" />
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: '700' }}>📦 أرصدة المواد الخام المتوفرة بالمخزن حالياً</h3>
          </div>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '15px', color: '#3b82f6' }}>جاري جلب كميات المخزن...</div>
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
            </div>
          )}
        </div>

        {/* مدخلات الإنتاج النصية الحرة */}
        <div style={{ ...cardStyle, border: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <PackagePlus size={22} color="#4f46e5" />
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>🎯 مدخلات الإنتاج (اكتب اسم الصنف بحرية ليقوم النظام الذكي بخصم خاماته)</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#475569', fontWeight: '700' }}>اسم المنتج المراد إنتهائه فعلياً</label>
              <input 
                type="text"
                placeholder="اكتب هنا (مثال: بسبوسة، معمول، فطير)"
                value={productNameInput}
                onChange={(e) => setProductNameInput(e.target.value)}
                style={{ ...inputStyle, border: '2px solid #4f46e5', backgroundColor: '#fff', textAlign: 'right' }}
              />
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

      {/* زر الترحيل النهائي وتفعيل الـ Triggers */}
      <button 
        onClick={handleProcessProduction} 
        style={{ width: '100%', padding: '16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', marginTop: '24px', marginBottom: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
      >
        ترحيل وإخراج العمليات وسحب المواد الخام تلقائياً
      </button>

      {/* زر العودة */}
      <button onClick={onBack} style={{ width: '100%', background: '#fff', border: '1px solid #cbd5e1', padding: '14px', borderRadius: '15px', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <ArrowLeft size={16} /> العودة للشاشة السابقة
      </button>
    </div>
  );
};

export default ProductionManager;
