import React, { useState } from 'react';
import { Trash2, ArrowRight, Save, AlertTriangle, Package, Layers } from 'lucide-react';

const Waste = ({ onBack, onSaveWaste, inventory = [] }) => {
  const [wasteEntry, setWasteEntry] = useState({ type: 'raw_material', itemName: '', quantity: '', unit: 'كيلو', reason: '', date: new Date().toISOString().split('T')[0] });

  const handleItemSelect = (name) => {
    const item = inventory.find(s => s.name === name);
    setWasteEntry({ ...wasteEntry, itemName: name, unit: item ? (item.unit || 'وحدة') : 'كيلو' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!wasteEntry.itemName || !wasteEntry.quantity) { alert("يرجى تحديد الصنف والكمية الهالكة"); return; }
    onSaveWaste({ ...wasteEntry, id: Date.now(), timestamp: new Date().toLocaleString() });
    alert("تم تسجيل الهالك وتحديث المخزن"); onBack();
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh' }}>
      <div className="page-header"><Trash2 size={28} color="#e74c3c" /><h2>تسجيل الهالك / التالف</h2></div>
      <div className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => setWasteEntry({ ...wasteEntry, type: 'raw_material', unit: 'كيلو' })} className="btn-primary" style={{ backgroundColor: wasteEntry.type === 'raw_material' ? '#e74c3c' : 'rgba(241, 245, 249, 0.8)', color: wasteEntry.type === 'raw_material' ? 'white' : '#475569', boxShadow: 'none', fontSize: '0.9rem', padding: '12px' }}>مواد خام</button>
          <button onClick={() => setWasteEntry({ ...wasteEntry, type: 'product', unit: 'كرتونة' })} className="btn-primary" style={{ backgroundColor: wasteEntry.type === 'product' ? '#e74c3c' : 'rgba(241, 245, 249, 0.8)', color: wasteEntry.type === 'product' ? 'white' : '#475569', boxShadow: 'none', fontSize: '0.9rem', padding: '12px' }}>منتج نهائي</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="form-label"><Package size={16} color="#e74c3c" /> اسم الصنف</label>
          <select className="glass-input" value={wasteEntry.itemName} onChange={(e) => handleItemSelect(e.target.value)} style={{ marginBottom: '12px' }}><option value="">اختر صنف من المخزن...</option>{inventory.map(s => <option key={s.id} value={s.name}>{s.name} (رصيد: {s.balance})</option>)}</select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div><label className="form-label"><Layers size={16} color="#e74c3c" /> الكمية</label><input type="number" className="glass-input" placeholder="0.00" value={wasteEntry.quantity} onChange={(e) => setWasteEntry({ ...wasteEntry, quantity: e.target.value })} /></div>
            <div><label className="form-label">الوحدة</label><input className="glass-input" value={wasteEntry.unit} readOnly style={{ background: 'rgba(248, 250, 252, 0.8)' }} /></div>
          </div>
          <label className="form-label"><AlertTriangle size={16} color="#e74c3c" /> سبب الهالك</label>
          <select className="glass-input" value={wasteEntry.reason} onChange={(e) => setWasteEntry({ ...wasteEntry, reason: e.target.value })} style={{ marginBottom: '15px' }}><option value="">اختر السبب...</option><option value="سوء تخزين">سوء تخزين</option><option value="انتهاء صلاحية">انتهاء صلاحية</option><option value="خطأ تصنيع">خطأ تصنيع</option><option value="أخرى">أخرى</option></select>
          <button type="submit" className="btn-primary" style={{ backgroundColor: '#e74c3c', boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)' }}><Save size={20} /> تأكيد وخصم من المخزن</button>
        </form>
      </div>
      <button onClick={onBack} className="btn-back" style={{ marginTop: '15px' }}><ArrowRight size={18} /> العودة للوحة التحكم</button>
    </div>
  );
};

export default Waste;
