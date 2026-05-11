import React, { useState, useMemo } from 'react';
import { Factory, ArrowLeft, RefreshCw, Save, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

const ProductionManager = ({ stock = [], onSaveProduction, onBack, setStock }) => {
  const [productionQty, setProductionQty] = useState('');
  const [unitsPerCarton, setUnitsPerCarton] = useState('12');
  const [showReport, setShowReport] = useState(false);
  const [finalReport, setFinalReport] = useState(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    selectedIngredients: []
  });

  // المكونات الافتراضية للطبخة (النسبة لكل كرتونة)
  const GOLDEN_RECIPE = {
    "دقيق": 0.950, "سكر": 0.100, "عجوة": 0.055, "سمنة": 0.150,
    "زبدة": 0.050, "لبن": 0.280, "كارتون": 1, "تغليف": 0.020
  };

  // تصفية المواد الخام فقط (التي لا تحتوي على معمول أو جاهز) كما في كود المخزن
  const rawMaterials = useMemo(() => 
    stock.filter(item => item.name && !item.name.includes("معمول") && !item.name.includes("جاهز")),
    [stock]
  );

  const addIngredient = (name) => {
    if (!name || formData.selectedIngredients.find(i => i.name === name)) return;
    setFormData(prev => ({
      ...prev,
      selectedIngredients: [...prev.selectedIngredients, { name }]
    }));
  };

  const calculateProduction = () => {
    const cartons = parseFloat(productionQty);
    if (!cartons || cartons <= 0) {
      Swal.fire('خطأ', 'أدخل عدد الكراتين المنتجة', 'error');
      return;
    }

    const totalUnits = cartons * (parseFloat(unitsPerCarton) || 12);
    const details = formData.selectedIngredients.map(ing => {
      const ratio = GOLDEN_RECIPE[ing.name.trim()] || 0;
      return { name: ing.name, consumed: (cartons * ratio).toFixed(3) };
    });

    setFinalReport({ cartons, totalUnits, details });
    setShowReport(true);
  };

  const handleFinalSave = () => {
    // اسم المنتج النهائي (يجب أن يحتوي على كلمة 'معمول' أو 'جاهز' ليظهر في تبويب المنتج النهائي)
    const PRODUCT_NAME = "معمول تمر فاخر (جاهز)";
    
    // إعداد نسخة التحديث للمخزن
    let totalCost = 0;
    const updatedStock = stock.map(item => {
      const reportItem = finalReport.details.find(d => d.name === item.name);
      if (reportItem) {
        const consumed = parseFloat(reportItem.consumed);
        totalCost += (consumed * (parseFloat(item.price) || 0));
        return { ...item, balance: (parseFloat(item.balance || 0) - consumed).toFixed(3) };
      }
      return item;
    });

    // تحديث أو إضافة المنتج النهائي
    const unitPrice = (totalCost / finalReport.totalUnits).toFixed(2);
    const productIndex = updatedStock.findIndex(item => item.name === PRODUCT_NAME);

    if (productIndex !== -1) {
      updatedStock[productIndex].balance = (parseFloat(updatedStock[productIndex].balance || 0) + finalReport.totalUnits).toString();
      updatedStock[productIndex].price = unitPrice;
    } else {
      updatedStock.push({
        id: `prod-${Date.now()}`,
        name: PRODUCT_NAME,
        date: formData.date,
        unit: 'وحدة',
        balance: finalReport.totalUnits.toString(),
        price: unitPrice,
        total: totalCost,
        isNew: false
      });
    }

    // إرسال التحديث النهائي للمخزن (setStock الممررة من App.jsx)
    setStock(updatedStock);

    // حفظ السجل في التقارير
    onSaveProduction({
      ...formData,
      productionName: PRODUCT_NAME,
      producedQty: finalReport.totalUnits,
      details: finalReport.details
    });

    Swal.fire('تم الترحيل', 'تم خصم المواد الخام وزيادة المنتج النهائي', 'success');
    onBack();
  };

  return (
    <div style={{ direction: 'rtl', padding: '15px', fontFamily: "'Tajawal', sans-serif" }}>
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtnStyle}><ArrowLeft /></button>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>تسجيل إنتاج "معمول"</h2>
      </div>

      <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', border: '2px solid #1e5631' }}>
        <label style={labelStyle}>عدد الكراتين المنتجة:</label>
        <input 
          type="number" 
          value={productionQty} 
          onChange={e => setProductionQty(e.target.value)} 
          style={bigInputStyle} 
          placeholder="0"
        />
        
        <div style={{ marginTop: '15px' }}>
          <label style={{ fontSize: '0.9rem', color: '#64748b' }}>قطع لكل كرتونة:</label>
          <input 
            type="number" 
            value={unitsPerCarton} 
            onChange={e => setUnitsPerCarton(e.target.value)} 
            style={smallInputStyle}
          />
        </div>
      </div>

      <div style={{ background: '#fff', padding: '15px', borderRadius: '15px' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>المواد المستهلكة في الطبخة:</p>
        <select 
          style={selectStyle}
          onChange={(e) => { addIngredient(e.target.value); e.target.value = ""; }}
        >
          <option value="">+ اختر مادة من المخزن</option>
          {rawMaterials.map(m => <option key={m.id} value={m.name}>{m.name} (متاح: {m.balance})</option>)}
        </select>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' }}>
          {formData.selectedIngredients.map(ing => (
            <div key={ing.name} style={tagStyle}>
              {ing.name}
              <Trash2 size={14} onClick={() => setFormData(prev => ({...prev, selectedIngredients: prev.selectedIngredients.filter(i => i.name !== ing.name)}))} />
            </div>
          ))}
        </div>
      </div>

      <button onClick={calculateProduction} style={mainBtnStyle}>
        <RefreshCw size={20} /> حساب الاستهلاك والترحيل
      </button>

      {showReport && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ textAlign: 'center' }}>تأكيد عملية الترحيل</h3>
            <div style={summaryBox}>
              <p>إضافة للمنتج النهائي: <b>{finalReport.totalUnits} وحدة</b></p>
              <hr />
              <p style={{ fontSize: '0.8rem' }}>سيتم خصم الخامات المحددة من "مخزن المواد الخام"</p>
            </div>
            <button onClick={handleFinalSave} style={confirmBtnStyle}>تأكيد وحفظ في المخزن</button>
            <button onClick={() => setShowReport(false)} style={cancelBtnStyle}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
};

// الستايلات المتوافقة مع Glassmorphism وتصميمك
const headerStyle = { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' };
const backBtnStyle = { border: 'none', background: '#fff', padding: '8px', borderRadius: '10px', cursor: 'pointer' };
const labelStyle = { display: 'block', fontWeight: 'bold', marginBottom: '10px', color: '#1e5631' };
const bigInputStyle = { width: '100%', padding: '15px', fontSize: '2rem', textAlign: 'center', borderRadius: '12px', border: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: '900', color: '#1e5631' };
const smallInputStyle = { width: '100px', padding: '8px', textAlign: 'center', borderRadius: '8px', border: '1px solid #e2e8f0', marginRight: '10px' };
const selectStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' };
const tagStyle = { background: '#1e5631', color: '#fff', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' };
const mainBtnStyle = { width: '100%', padding: '18px', background: '#1e5631', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '10px' };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalContent = { background: '#fff', padding: '25px', borderRadius: '20px', width: '100%', maxWidth: '400px' };
const summaryBox = { background: '#f0fdf4', padding: '15px', borderRadius: '10px', marginBottom: '20px', color: '#166534' };
const confirmBtnStyle = { width: '100%', padding: '12px', background: '#1e5631', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const cancelBtnStyle = { width: '100%', padding: '12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', marginTop: '10px', cursor: 'pointer' };

export default ProductionManager;
