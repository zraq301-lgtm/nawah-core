import React, { useState, useMemo } from 'react';
import { Factory, ArrowLeft, RefreshCw, Save, Trash2, Package, Database } from 'lucide-react';
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

  // المكونات الافتراضية
  const GOLDEN_RECIPE = {
    "دقيق": 0.950, "سكر": 0.100, "عجوة": 0.055, "سمنة": 0.150,
    "زبدة": 0.050, "لبن": 0.280, "كارتون": 1, "تغليف": 0.020
  };

  // حماية الفلتر: التأكد من أن stock مصفوفة دائماً
  const rawMaterials = useMemo(() => {
    if (!Array.isArray(stock)) return [];
    return stock.filter(item => 
      item?.name && 
      !item.name.includes("معمول") && 
      !item.name.includes("جاهز")
    );
  }, [stock]);

  const addIngredient = (name) => {
    if (!name || formData.selectedIngredients.some(i => i.name === name)) return;
    setFormData(prev => ({
      ...prev,
      selectedIngredients: [...prev.selectedIngredients, { name }]
    }));
  };

  const calculateProduction = () => {
    const cartons = parseFloat(productionQty);
    if (isNaN(cartons) || cartons <= 0) {
      Swal.fire('تنبيه', 'يرجى إدخال عدد الكراتين بشكل صحيح', 'warning');
      return;
    }

    if (formData.selectedIngredients.length === 0) {
      Swal.fire('تنبيه', 'يجب اختيار مادة خام واحدة على الأقل من القائمة', 'info');
      return;
    }

    const totalUnits = cartons * (parseFloat(unitsPerCarton) || 12);
    
    // حساب التفاصيل مع حماية الأسماء
    const details = formData.selectedIngredients.map(ing => {
      const ratio = GOLDEN_RECIPE[ing.name?.trim()] || 0;
      return { 
        name: ing.name, 
        consumed: (cartons * ratio).toFixed(3) 
      };
    });

    setFinalReport({ cartons, totalUnits, details });
    setShowReport(true);
  };

  const handleFinalSave = () => {
    // التأكد من وجود بيانات التقرير قبل الحفظ لمنع كراش التطبيق
    if (!finalReport || !finalReport.details) return;

    const PRODUCT_NAME = "معمول تمر فاخر (جاهز)";
    let totalCost = 0;
    
    const updatedStock = stock.map(item => {
      const reportItem = finalReport.details.find(d => d.name === item.name);
      if (reportItem) {
        const consumed = parseFloat(reportItem.consumed) || 0;
        totalCost += (consumed * (parseFloat(item.price) || 0));
        const currentBalance = parseFloat(item.balance) || 0;
        return { ...item, balance: Math.max(0, currentBalance - consumed).toFixed(3) };
      }
      return item;
    });

    const unitPrice = finalReport.totalUnits > 0 ? (totalCost / finalReport.totalUnits).toFixed(2) : 0;
    const productIndex = updatedStock.findIndex(item => item.name === PRODUCT_NAME);

    if (productIndex !== -1) {
      const currentBal = parseFloat(updatedStock[productIndex].balance) || 0;
      updatedStock[productIndex].balance = (currentBal + finalReport.totalUnits).toFixed(0);
      updatedStock[productIndex].price = unitPrice;
    } else {
      updatedStock.push({
        id: `prod-${Date.now()}`,
        name: PRODUCT_NAME,
        date: formData.date,
        unit: 'وحدة',
        balance: finalReport.totalUnits.toString(),
        price: unitPrice,
        isNew: false
      });
    }

    // التنفيذ النهائي
    if (typeof setStock === 'function') setStock(updatedStock);
    if (typeof onSaveProduction === 'function') {
      onSaveProduction({
        ...formData,
        productionName: PRODUCT_NAME,
        producedQty: finalReport.totalUnits,
        details: finalReport.details
      });
    }

    Swal.fire('نجاح', 'تم تحديث المخزن وخصم المواد الخام', 'success');
    onBack();
  };

  return (
    <div style={{ direction: 'rtl', padding: '15px', fontFamily: "'Tajawal', sans-serif", backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtnStyle}><ArrowLeft size={20} /></button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e5631' }}>تسجيل الإنتاج</h2>
      </div>

      <div style={mainGrid}>
        {/* أدوات الإدخال */}
        <div style={cardStyle}>
          <h3 style={cardTitle}><Factory size={18} /> مدخلات الطبخة</h3>
          
          <div style={{ marginBottom: '15px' }}>
             <label style={labelStyle}>عدد الكراتين:</label>
             <input 
               type="number" 
               value={productionQty} 
               onChange={e => setProductionQty(e.target.value)} 
               style={bigInputStyle} 
               placeholder="0"
             />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.85rem' }}>قطع/كرتونة:</span>
            <input 
              type="number" 
              value={unitsPerCarton} 
              onChange={e => setUnitsPerCarton(e.target.value)} 
              style={smallInputStyle}
            />
          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
            <label style={labelStyle}>اختيار المكونات:</label>
            <select 
              style={selectStyle}
              onChange={(e) => { addIngredient(e.target.value); e.target.value = ""; }}
            >
              <option value="">+ إضافة مادة خام</option>
              {rawMaterials.map(m => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.balance})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' }}>
            {formData.selectedIngredients.map(ing => (
              <div key={ing.name} style={tagStyle}>
                {ing.name}
                <Trash2 
                  size={14} 
                  style={{ cursor: 'pointer', marginRight: '5px' }} 
                  onClick={() => setFormData(prev => ({
                    ...prev, 
                    selectedIngredients: prev.selectedIngredients.filter(i => i.name !== ing.name)
                  }))} 
                />
              </div>
            ))}
          </div>

          <button onClick={calculateProduction} style={mainBtnStyle}>
            <RefreshCw size={20} /> معالجة الترحيل
          </button>
        </div>

        {/* عرض الشبكة للمخزن */}
        <div style={cardStyle}>
          <h3 style={cardTitle}><Database size={18} /> حالة المخزن</h3>
          <div style={inventoryGrid}>
            {Array.isArray(stock) && stock.length > 0 ? stock.map(item => (
              <div key={item?.id || Math.random()} style={gridItemStyle(item?.name || '')}>
                <div style={itemNameStyle}>{item?.name || 'صنف غير معروف'}</div>
                <div style={itemQtyStyle}>{item?.balance || 0}</div>
              </div>
            )) : <p>لا توجد بيانات بالمخزن</p>}
          </div>
        </div>
      </div>

      {/* تقرير التأكيد */}
      {showReport && finalReport && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ textAlign: 'center' }}>مراجعة الحركة</h3>
            <div style={summaryBox}>
              <p>المنتج: <b>{finalReport.totalUnits} قطعة</b></p>
              <div style={{ fontSize: '0.8rem', textAlign: 'right' }}>
                {finalReport.details.map(d => (
                  <div key={d.name}>- {d.name}: {d.consumed}</div>
                ))}
              </div>
            </div>
            <button onClick={handleFinalSave} style={confirmBtnStyle}>تأكيد وترحيل</button>
            <button onClick={() => setShowReport(false)} style={cancelBtnStyle}>رجوع</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- تحسين الستايلات لتكون أكثر استجابة ---
const mainGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '15px'
};

const inventoryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
  gap: '10px',
  maxHeight: '400px',
  overflowY: 'auto'
};

const gridItemStyle = (name) => ({
  background: name.includes('جاهز') ? '#e8f5e9' : '#fff',
  border: '1px solid #ddd',
  borderRadius: '8px',
  padding: '10px',
  textAlign: 'center'
});

const itemNameStyle = { fontSize: '0.75rem', color: '#666', marginBottom: '5px' };
const itemQtyStyle = { fontSize: '1rem', fontWeight: 'bold', color: '#1e5631' };

const headerStyle = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' };
const backBtnStyle = { border: 'none', background: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer' };
const cardStyle = { background: '#fff', padding: '15px', borderRadius: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const cardTitle = { fontSize: '1rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' };
const labelStyle = { display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 'bold' };
const bigInputStyle = { width: '100%', padding: '10px', fontSize: '1.5rem', textAlign: 'center', borderRadius: '10px', border: '2px solid #ddd' };
const smallInputStyle = { width: '60px', padding: '5px', textAlign: 'center', borderRadius: '5px', border: '1px solid #ccc' };
const selectStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' };
const tagStyle = { background: '#1e5631', color: '#fff', padding: '5px 10px', borderRadius: '15px', fontSize: '0.8rem', display: 'flex', alignItems: 'center' };
const mainBtnStyle = { width: '100%', padding: '15px', background: '#1e5631', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', marginTop: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalContent = { background: '#fff', padding: '20px', borderRadius: '15px', width: '100%', maxWidth: '350px' };
const summaryBox = { background: '#f9f9f9', padding: '10px', borderRadius: '8px', margin: '15px 0' };
const confirmBtnStyle = { width: '100%', padding: '12px', background: '#1e5631', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
const cancelBtnStyle = { width: '100%', padding: '10px', background: '#eee', color: '#333', border: 'none', borderRadius: '8px', marginTop: '8px' };

export default ProductionManager;
