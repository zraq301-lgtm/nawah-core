import React, { useState } from 'react';
import { Factory, ArrowLeft, Box, RefreshCw, PackagePlus, AlertTriangle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

const ProductionManager = ({ onBack }) => {
  const queryClient = useQueryClient();

  // 📥 جلب بيانات المواد الخام والأصناف الحالية من المخزن
  const { data: stockResponse, isLoading, refetch } = useQuery({
    queryKey: ['stock'],
    queryFn: () => apiService.getData('items'), 
    staleTime: 0, 
  });

  // 📥 جلب معادلات وبنيات التركيب الإنتاجية (BOM) لربط المنتجات بخاماتها (بلح، سكر...)
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

  // 🔄 تصفية وعرض المواد الخام المتوفرة في المخزن (مثل: سكر، بلح) لرقابة المستخدم
  const rawMaterials = itemsList.filter(item => {
    if (!item) return false;
    const itemType = (item.item_type || '').toString().toLowerCase().trim();
    return (
      itemType === 'raw_material' || 
      itemType === 'خامة' || 
      itemType === 'مواد خام' || 
      itemType === 'خامات' ||
      item.name?.includes('سكر') || item.name?.includes('بلح') || item.name?.includes('دقيق')
    );
  });

  // 🛑 مدخلات واجهة المستخدم
  const [productNameInput, setProductNameInput] = useState('');
  const [unitsToProduce, setUnitsToProduce] = useState('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'الأولى'
  });

  const shifts = ['الأولى', 'الثانية', 'السهرة', 'إضافي'];

  // 🚀 المحرك الذكي لاحتساب ودمج عناصر التصنيع
  const handleProcessProduction = async () => {
    const timestamp = Date.now();
    let consumedIngredients = [];
    let totalBomCost = 0;

    if (!itemsList || itemsList.length === 0) {
      alert("⚠️ خطأ: لا توجد مواد مخزنية مسجلة حالياً بالسيستم.");
      return;
    }

    const qtyToBuild = unitsToProduce === '' ? 0 : parseFloat(unitsToProduce);
    const enteredProductName = productNameInput.trim();

    if (!enteredProductName || qtyToBuild <= 0) {
      alert("⚠️ يرجى تحديد اسم المنتج المراد تشغيله وتحديد كمية الإنتاج المطلوبة.");
      return;
    }

    // 🔍 1️⃣ التحقق الصارم من وجود معادلة تركيب (BOM) تربط هذا المنتج بالخامات
    const cleanEnteredName = enteredProductName.toLowerCase().replace(/\s+/g, '');
    const matchedBom = bomsList.find(b => {
      const bName = (b.product_name || b.name || '').toString().toLowerCase().replace(/\s+/g, '');
      return bName === cleanEnteredName || bName.includes(cleanEnteredName);
    });

    if (!matchedBom) {
      alert(`❌ خطأ في منطق التصنيع:\nالمنتج "${enteredProductName}" ليس له معادلة إنتاج (BOM) مسجلة تربطه بالخامات (بلح، سكر...) في قاعدة البيانات، لا يمكن تصنيع منتج من لا شيء!`);
      return;
    }

    try {
      // 🔍 2️⃣ التحقق من وجود الصنف التام في جدول الأصناف الرئيسي
      let targetProduct = itemsList.find(s => 
        s.name?.toString().toLowerCase().trim() === (matchedBom.product_name || matchedBom.name).toLowerCase().trim()
      );

      if (!targetProduct) {
        alert(`🚨 الصنف النهائي الخاص بهذه المعادلة غير مدرج في جدول الأصناف، يرجى تهيئته أولاً بجدول الأصناف لربط الحركات آلياً.`);
        return;
      }

      // 🧮 3️⃣ تفكيك وحساب كميات وتكاليف المواد الخام المطلوبة للدمج والتصنيع
      if (!matchedBom.ingredients || matchedBom.ingredients.length === 0) {
        alert("🚨 خطأ: معادلة الإنتاج المسجلة لهذا المنتج فارغة ولا تحتوي على خامات مستهلكة!");
        return;
      }

      for (const ingredient of matchedBom.ingredients) {
        const baseQuantity = parseFloat(matchedBom.base_quantity || 1);
        const requiredQtyInBom = parseFloat(ingredient.required_quantity);
        
        // معادلة التناسب للإنتاج: (الكمية المراد إنتاجها / الكمية القياسية بالمعادلة) * الكمية المطلوبة من الخامة
        const finalRequiredRawQty = (qtyToBuild / baseQuantity) * requiredQtyInBom;
        
        // البحث عن الخامة بالمخزن (بلح، سكر...) لمطابقة الرصيد والتكلفة
        const currentRawStockItem = itemsList.find(s => s.id.toString() === ingredient.raw_material_id.toString());
        
        if (!currentRawStockItem) {
          alert(`🚨 خطأ: المادة الخام ذات الكود (${ingredient.raw_material_id}) المطلوبة في المعادلة غير موجودة بالمخازن!`);
          return;
        }

        const currentAvailable = parseFloat(currentRawStockItem.available_quantity || 0);
        const rawUnitCost = parseFloat(currentRawStockItem.cost_price || 0);

        // مراقبة النقص والعجز في الخامات لمنع الحسابات السالبة بالمستودع
        if (currentAvailable < finalRequiredRawQty) {
          alert(`⚠️ عجز يمنع التصنيع في خامة: (${currentRawStockItem.name})\nالكمية المطلوبة للخلطة: ${finalRequiredRawQty.toFixed(2)} | المتوفر فعلياً بالمخزن: ${currentAvailable}`);
          return;
        }

        totalBomCost += (finalRequiredRawQty * rawUnitCost);
        consumedIngredients.push({
          id: currentRawStockItem.id,
          name: currentRawStockItem.name,
          quantity: parseFloat(finalRequiredRawQty.toFixed(2)),
          unit_price: rawUnitCost
        });
      }

      // حساب تكلفة إنتاج الوحدة الواحدة من الصنف التام الناتجة من الدمج
      const calculatedUnitCost = qtyToBuild > 0 ? parseFloat((totalBomCost / qtyToBuild).toFixed(2)) : 0;

      // 🔄 4️⃣ ترحيل مستند دمج وتصنيع رسمي (Manufacturing / Assembly Voucher) لضبط الأرصدة والتكاليف
      // يتم تسجيلها كحركة إنتاج موحدة لكي يفهمها السيستم على أنها استهلاك خامات وتوليد منتج تام
      const productionLogRes = await apiService.createData('invoices', {
        invoice_number: `PROD-JOB-${timestamp}`,
        invoice_type: 'manufacturing', // تعديل نوع الفاتورة إلى نمط "تصنيع وإنتاج" بدلاً من مبيعات وشراء
        contact_id: 1, 
        gross_amount: totalBomCost,
        net_amount: totalBomCost,
        paid_amount: totalBomCost,
        remaining_amount: 0,
        description: `عملية دمج وتصنيع إنتاجي لـ [ ${targetProduct.name} ] بعدد (${qtyToBuild}) وحدات - وردية: ${formData.shift}`
      });

      const voucherId = productionLogRes?.id || productionLogRes?.data?.id;

      // أ) إدراج المواد الخام المستهلكة (البلح والسكر) في تفاصيل الحركة كعناصر مسحوبة بالماينس أو الاستهلاك
      for (const rawItem of consumedIngredients) {
        await apiService.createData('invoice_items', {
          invoice_id: voucherId,
          item_id: rawItem.id,
          quantity: rawItem.quantity,
          unit_price: rawItem.unit_price,
          total_price: parseFloat((rawItem.quantity * rawItem.unit_price).toFixed(2)),
          notes: 'مادة خام مستهلكة بالدمج'
        });
      }

      // ب) إدراج المنتج التام الجديد الناتج عن عملية الدمج والتصنيع لزيادة رصيده وتعديل تكلفته
      await apiService.createData('invoice_items', {
        invoice_id: voucherId,
        item_id: targetProduct.id,
        quantity: qtyToBuild,
        unit_price: calculatedUnitCost,
        total_price: totalBomCost,
        notes: 'منتج تام ناتج عن التصنيع'
      });

      // 🔄 5️⃣ تنظيف وتحديث فوري لكاش البيانات المتواجد على واجهة المستخدم
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      await refetch();

      alert(`✅ [زاد الخير - تم الترحيل]:\nتم تسجيل عملية دمج وتصنيع صنف (${targetProduct.name}) بنجاح.\nالكمية المنتجة: ${qtyToBuild} وحدة.\n📦 تم سحب الخامات وحساب تكلفة المنتج الجديد تلقائياً عبر النظام.`);
      
      setProductNameInput('');
      setUnitsToProduce('');
      if (onBack) onBack();

    } catch (error) {
      console.error("❌ خطأ بالإنتاج:", error);
      alert(`🚨 لم تكتمل العملية: ${error.message || "يرجى التحقق من الخامات المتوفرة"}`);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0',
    fontSize: '15px', fontWeight: 'bold', textAlign: 'center', outline: 'none', color: '#1e293b', boxSizing: 'border-box'
  };

  return (
    <div style={{ direction: 'rtl', padding: '24px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: "sans-serif", maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* الرأس */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '24px', boxSizing: 'border-box' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '19px', fontWeight: '700', color: '#1e293b' }}>⚙️ نظام مراقبة ودمج خطوط الإنتاج</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>زاد الخير: استهلاك الخامات الفعلية لتوليد السلع الجاهزة</p>
        </div>
      </div>

      {/* الأرصدة الحقيقية الحالية للخامات (بلح - سكر) */}
      <div style={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '24px', padding: '20px', marginBottom: '20px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', borderBottom: '1px solid #475569', paddingBottom: '10px' }}>
          <Box size={20} color="#3b82f6" />
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '15px', fontWeight: '700' }}>المواد الخام المتوفرة فعلياً بالمستودع لعملية الدمج</h3>
        </div>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '10px', color: '#3b82f6' }}>جاري قراءة الأرصدة الحالية...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {rawMaterials.map(mat => (
              <div key={mat.id} style={{ backgroundColor: '#2d3a4f', padding: '12px', borderRadius: '14px', border: '1px solid #475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{mat.name}</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '8px' }}>
                  {mat.available_quantity || 0} وحدة
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* مدخلات أمر التشغيل والتصنيع */}
      <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '2px solid #e2e8f0', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <PackagePlus size={22} color="#4f46e5" />
          <h3 style={{ margin: 0, color: '#1e293b', fontSize: '15px', fontWeight: '700' }}>إصدار أمر تصنيع ودمج خامات جديد</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#475569', fontWeight: '700' }}>اسم المنتج المراد إنتاجه (مطابق للـ BOM)</label>
            <input 
              type="text"
              placeholder="مثال: معمول جاهز"
              value={productNameInput}
              onChange={(e) => setProductNameInput(e.target.value)}
              style={{ ...inputStyle, border: '2px solid #4f46e5', textAlign: 'right' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#475569', fontWeight: '700' }}>كمية الوحدات المطلوبة</label>
            <input 
              type="number" 
              placeholder="مثال: 5" 
              value={unitsToProduce} 
              onChange={(e) => setUnitsToProduce(e.target.value)} 
              style={{ ...inputStyle, border: '2px solid #4f46e5' }} 
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: '#64748b' }}>التاريخ</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData(p => ({...p, date: e.target.value}))} style={{ ...inputStyle, padding: '8px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: '#64748b' }}>الوردية</label>
            <select value={formData.shift} onChange={(e) => setFormData(p => ({...p, shift: e.target.value}))} style={{ ...inputStyle, padding: '8px' }}>
              {shifts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* زر التفعيل والتصنيع */}
      <button 
        onClick={handleProcessProduction} 
        style={{ width: '100%', padding: '16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '15px', marginTop: '20px', marginBottom: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}
      >
        بدء عملية دمج العناصر وتحديث أرصدة التصنيع آلياً
      </button>

      <button onClick={onBack} style={{ width: '100%', background: '#fff', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '15px', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <ArrowLeft size={16} /> العودة للشاشة السابقة
      </button>
    </div>
  );
};

export default ProductionManager;
