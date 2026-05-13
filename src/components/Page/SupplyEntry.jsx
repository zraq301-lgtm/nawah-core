import React, { useState } from 'react';
import { Package, Hash, DollarSign, Save, Truck, Calendar } from 'lucide-react';
import Swal from 'sweetalert2';

const SupplyEntry = ({ onInventoryEntry, categories = [] }) => {
  const [formData, setFormData] = useState({
    item: '', 
    unit: 'كيلو', 
    quantity: '', 
    price: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submit Clicked!", formData); // للتأكد أن الدالة تعمل

    if (!formData.item || !formData.quantity || !formData.price) {
      Swal.fire('تنبيه', 'يرجى إكمال بيانات الصنف والكمية والسعر', 'warning');
      return;
    }

    const supplyWithBatch = {
      ...formData,
      item: formData.item.trim(),
      quantity: parseFloat(formData.quantity),
      price: parseFloat(formData.price),
      total: parseFloat(formData.quantity) * parseFloat(formData.price),
      id: Date.now(),
      paymentMethod: 'كاش',
      batchInfo: {
        batchId: `B-${Date.now().toString().slice(-6)}`,
        purchaseDate: formData.date,
        costPerUnit: parseFloat(formData.price),
        supplier: 'توريد مباشر من المخزن'
      }
    };

    // التحقق من وجود الدالة قبل استدعائها لمنع الـ Crash
    if (typeof onInventoryEntry === 'function') {
      onInventoryEntry(supplyWithBatch);
      
      setFormData({ item: '', unit: 'كيلو', quantity: '', price: '', date: new Date().toISOString().split('T')[0] });
      
      Swal.fire({
        icon: 'success',
        title: 'تمت الإضافة للمخزن',
        text: `رقم الشحنة: ${supplyWithBatch.batchInfo.batchId}`,
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      console.error("Error: onInventoryEntry is not a function!");
      Swal.fire('خطأ برمي', 'دالة الحفظ غير معرفة في العنصر الأب', 'error');
    }
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#1e5631' }}>
          <Truck size={24} />
          <h3 style={{ margin: 0 }}>توريد مباشر للمخزن</h3>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'block' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}><Package size={16} /> اسم الصنف</label>
            <input 
              className="glass-input" 
              style={inputStyle}
              placeholder="مثال: دقيق، سكر..." 
              value={formData.item}
              onChange={e => setFormData({...formData, item: e.target.value})}
              list="stock-items"
              required 
            />
            <datalist id="stock-items">
              {categories.map((c, i) => (
                <option key={i} value={c.name || c.item || c} />
              ))}
            </datalist>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}><Hash size={16} /> الكمية</label>
              <input 
                type="number" step="any" style={inputStyle}
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: e.target.value})}
                required 
              />
            </div>
            <div>
              <label style={labelStyle}><DollarSign size={16} /> السعر</label>
              <input 
                type="number" step="any" style={inputStyle}
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                required 
              />
            </div>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label style={labelStyle}><Calendar size={16} /> التاريخ</label>
            <input 
              type="date" style={inputStyle}
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            style={btnStyle}
            onMouseOver={(e) => e.target.style.background = '#143d22'}
            onMouseOut={(e) => e.target.style.background = '#1e5631'}
          >
            <Save size={20} /> حفظ الشحنة في المخزن
          </button>
        </form>
      </div>
    </div>
  );
};

// التنسيقات
const cardStyle = { background: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', maxWidth: '500px', margin: 'auto' };
const labelStyle = { display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', fontSize: '14px', color: '#1e5631', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '16px' };
const btnStyle = { width: '100%', padding: '15px', marginTop: '20px', background: '#1e5631', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.3s ease' };

export default SupplyEntry;
