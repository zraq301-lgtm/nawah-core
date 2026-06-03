import React, { useState } from 'react';
import { Save, Plus, Trash2, ArrowLeft, Layers, Scale } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

const BomSetupManager = ({ onBack }) => {
  const queryClient = useQueryClient();

  // 📥 1. جلب كافة الأصناف من المخزن لتصنيفها (منتجات نهائية أو خامات)
  const { data: stockResponse, isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: () => apiService.getData('items'),
    staleTime: 5 * 60 * 1000, 
  });

  const itemsList = Array.isArray(stockResponse)
    ? stockResponse
    : (stockResponse?.data || stockResponse?.items || []);

  // 🔄 تصفية الأصناف: المنتجات النهائية (التي نود صنع طبخة لها)
  const finalProducts = itemsList.filter(item => {
    if (!item) return false;
    const type = (item.item_type || '').toString().toLowerCase().trim();
    return type !== 'raw_material' && type !== 'خامة' && type !== 'مواد خام';
  });

  // 🔄 تصفية الأصناف: المواد الخام (التي ستدخل في مكونات الطبخة)
  const rawMaterials = itemsList.filter(item => {
    if (!item) return false;
    const type = (item.item_type || '').toString().toLowerCase().trim();
    const name = (item.name || '').toString().toLowerCase();
    return (
      type === 'raw_material' || type === 'خامة' || type === 'مواد خام' ||
      name.includes('دقيق') || name.includes('سمن') || name.includes('سكر') || 
      name.includes('بلح') || name.includes('زبد') || name.includes('زيت')
    );
  });

  // 🛑 حالات الواجهة المدخلة (State)
  const [selectedProductId, setSelectedProductId] = useState('');
  const [bomName, setBomName] = useState('');
  const [baseQuantity, setBaseQuantity] = useState('1.000');
  const [ingredients, setIngredients] = useState([]);

  // ➕ إضافة سطر مادة خام جديدة للشبكة
  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      { raw_material_id: '', required_quantity: '' }
    ]);
  };

  // ❌ حذف سطر مادة خام من الشبكة
  const handleRemoveIngredient = (index) => {
    const updated = [...ingredients];
    updated.splice(index, 1);
    setIngredients(updated);
  };

  // 🔄 تحديث بيانات الخامات المحددة داخل الشبكة
  const handleIngredientChange = (index, field, value) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  // 🚀 إرسال وحفظ المعادلة والطبخة كاملة لقاعدة البيانات
  const handleSaveBom = async () => {
    if (!selectedProductId || !bomName.trim() || parseFloat(baseQuantity) <= 0) {
      alert("⚠️ يرجى اختيار المنتج النهائي، كتابة اسم الطبخة، وتحديد الكمية المعيارية.");
      return;
    }

    if (ingredients.length === 0) {
      alert("⚠️ لا يمكن حفظ طبخة فارغة! يرجى إضافة مادة خام واحدة على الأقل.");
      return;
    }

    // فحص صحة المدخلات داخل مصفوفة الخامات
    for (let i = 0; i < ingredients.length; i++) {
      if (!ingredients[i].raw_material_id || !ingredients[i].required_quantity || parseFloat(ingredients[i].required_quantity) <= 0) {
        alert(`⚠️ يرجى إكمال بيانات الخامة وتحديد كمية صحيحة في السطر رقم (${i + 1}).`);
        return;
      }
    }

    try {
      // أ) حفظ الرأس في جدول الـ product_boms
      const bomHeaderRes = await apiService.createData('product_boms', {
        product_id: parseInt(selectedProductId),
        bom_name: bomName.trim(),
        base_quantity: parseFloat(baseQuantity)
      });

      const newBomId = bomHeaderRes?.id || bomHeaderRes?.data?.id;

      if (!newBomId) {
        throw new Error("لم يتم إرجاع معرف السجل الرئيسي للطبخة من السيرفر.");
      }

      // ب) حفظ تفاصيل المكونات في جدول الـ bom_ingredients
      for (const ing of ingredients) {
        await apiService.createData('bom_ingredients', {
          bom_id: newBomId,
          raw_material_id: parseInt(ing.raw_material_id),
          required_quantity: parseFloat(ing.required_quantity)
        });
      }

      // ج) تنظيف الواجهة وتحديث كاش النظام
      await queryClient.invalidateQueries({ queryKey: ['boms'] });
      alert("✅ [زاد الخير]: تم تسجيل وربط معيار الطبخة الجديدة بنجاح في قاعدة البيانات!");
      
      // تصفير الخانات
      setSelectedProductId('');
      setBomName('');
      setBaseQuantity('1.000');
      setIngredients([]);
      
      if (onBack) onBack();

    } catch (error) {
      console.error(error);
      alert(`🚨 فشل حفظ الطبخة: ${error.message || "يرجى التحقق من اتصال السيرفر"}`);
    }
  };

  const selectStyle = {
    width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #cbd5e1',
    fontSize: '14px', fontWeight: 'bold', outline: 'none', backgroundColor: '#fff', color: '#1e293b'
  };

  const inputStyle = {
    width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #cbd5e1',
    fontSize: '14px', fontWeight: 'bold', outline: 'none', color: '#1e293b', boxSizing: 'border-box'
  };

  return (
    <div style={{ direction: 'rtl', padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* رأس الشاشة */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '16px 24px', borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers color="#4f46e5" /> شاشة تهيئة وتركيب الطبخات (BOM)
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>لوحة التحكم: اربط منتجاتك الجاهزة بمكوناتها الخام ومعاييرها الثابتة</p>
        </div>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '600' }}>
          <ArrowLeft size={18} /> عودة
        </button>
      </div>

      {/* القسم الأول: البيانات الأساسية للطبخة */}
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#334155', fontWeight: '700', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>1. المعطيات الأساسية للصنف المستهدف</h3>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', color: '#4f46e5', fontWeight: '600' }}>جاري تحميل قائمة الأصناف...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#475569', fontWeight: '600', marginBottom: '6px' }}>اختر المنتج النهائي الصادر</label>
              <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} style={selectStyle}>
                <option value="">-- حدد صنف تام (مثل: معمول عجوة حبة) --</option>
                {finalProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#475569', fontWeight: '600', marginBottom: '6px' }}>اسم المعيار / الطبخة المميز</label>
              <input 
                type="text" 
                placeholder="مثال: طبخة المعمول الفاخر بالسمن البلدي" 
                value={bomName} 
                onChange={(e) => setBomName(e.target.value)} 
                style={{ ...inputStyle, textAlign: 'right' }} 
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#475569', fontWeight: '600', marginBottom: '6px' }}>الكمية القياسية المستهدفة من هذه الخلطة (كيلو / وحدة)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="number" 
                  step="0.001"
                  value={baseQuantity} 
                  onChange={(e) => setBaseQuantity(e.target.value)} 
                  style={{ ...inputStyle, paddingLeft: '45px', textAlign: 'center' }} 
                />
                <Scale size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px' }} />
              </div>
              <small style={{ color: '#64748b', display: 'block', marginTop: '4px', fontSize: '11px' }}>* الكمية الافتراضية هي 1.000، مما يعني أن المكونات بالأسفل تُحسب لإنتاج كيلو واحد صافي من المنتج.</small>
            </div>
          </div>
        )}
      </div>

      {/* القسم الثاني: جدول تركيب وبناء المواد الخام ديناميكياً */}
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#334155', fontWeight: '700' }}>2. الخامات الداخلة ونسب التراكيب المكونة</h3>
          <button 
            type="button" 
            onClick={handleAddIngredient} 
            style={{ backgroundColor: '#4f46e5', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={16} /> إضافة مادة خام للخلطة
          </button>
        </div>

        {ingredients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '14px' }}>
            اضغط على زر (إضافة مادة خام للخلطة) بالأعلى للبدء في تركيب وبناء معايير المقادير.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ingredients.map((ing, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                
                <div style={{ flex: '2' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>المادة الخام</label>
                  <select 
                    value={ing.raw_material_id} 
                    onChange={(e) => handleIngredientChange(index, 'raw_material_id', e.target.value)} 
                    style={selectStyle}
                  >
                    <option value="">-- اختر مادة خام من المستودع --</option>
                    {rawMaterials.map(mat => <option key={mat.id} value={mat.id}>{mat.name} (المتاح: {mat.available_quantity || 0})</option>)}
                  </select>
                </div>

                <div style={{ flex: '1' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>الوزن المطلوب بالخلطة</label>
                  <input 
                    type="number" 
                    step="0.001"
                    placeholder="مثال: 0.500" 
                    value={ing.required_quantity} 
                    onChange={(e) => handleIngredientChange(index, 'required_quantity', e.target.value)} 
                    style={inputStyle} 
                  />
                </div>

                <div style={{ paddingTop: '18px' }}>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveIngredient(index)} 
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
                    title="حذف المكون"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* زر الحفظ النهائي الموثق لقاعدة البيانات */}
      <button 
        type="button" 
        onClick={handleSaveBom} 
        style={{ width: '100%', padding: '16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '16px', marginTop: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)' }}
      >
        <Save size={20} /> اعتماد وحفظ معيار الطبخة في الإسكيما بشكل دائم
      </button>

    </div>
  );
};

export default BomSetupManager;
