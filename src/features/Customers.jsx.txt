import React, { useState } from 'react';
import { Users, UserPlus, Phone, Search, ArrowRight, MapPin, AlertCircle } from 'lucide-react';

const Customers = ({ onBack, customers = [], onAddCustomer }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '' });
  const filteredCustomers = customers.filter(c => (c.name || '').includes(searchTerm) || (c.phone || '').includes(searchTerm));

  const handleAdd = () => {
    if (!newCust.name) { alert("يرجى إدخال اسم العميل"); return; }
    onAddCustomer({ ...newCust, id: Date.now() }); setNewCust({ name: '', phone: '', address: '' }); setShowAdd(false); alert("تم إضافة العميل بنجاح");
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh' }}>
      <div className="page-header"><Users size={28} color="#27ae60" /><h2>إدارة العملاء</h2></div>
      {!showAdd ? (
        <>
          <div style={{ position: 'relative', marginBottom: '12px' }}><Search style={{ position: 'absolute', right: '14px', top: '14px', color: '#94a3b8' }} size={20} /><input className="glass-input" placeholder="ابحث عن عميل بالاسم أو الرقم..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingRight: '42px' }} /></div>
          <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ backgroundColor: '#27ae60', marginBottom: '15px', boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)' }}><UserPlus size={20} /> إضافة عميل جديد</button>
          {filteredCustomers.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}><AlertCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} /><p style={{ margin: 0 }}>لا يوجد عملاء مسجلين</p></div>
          ) : filteredCustomers.map(c => (
            <div key={c.id} className="glass-card" style={{ marginBottom: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontWeight: 'bold', color: '#1e293b' }}>{c.name}</div><div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {c.phone}</div></div>
              <div style={{ fontSize: '0.8rem', color: '#27ae60', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {c.address || '-'}</div>
            </div>
          ))}
        </>
      ) : (
        <div className="glass-card">
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>بيانات العميل الجديد</h3>
          <label className="form-label">الاسم الكامل</label><input className="glass-input" placeholder="اسم العميل" value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} style={{ marginBottom: '10px' }} />
          <label className="form-label"><Phone size={14} /> رقم الموبايل</label><input className="glass-input" placeholder="01xxxxxxxxx" value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} style={{ marginBottom: '10px' }} />
          <label className="form-label"><MapPin size={14} /> العنوان / المنطقة</label><input className="glass-input" placeholder="مثال: المعادي" value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} style={{ marginBottom: '15px' }} />
          <button onClick={handleAdd} className="btn-primary" style={{ backgroundColor: '#27ae60', marginBottom: '10px' }}><UserPlus size={18} /> حفظ البيانات</button>
          <button onClick={() => setShowAdd(false)} className="btn-back">إلغاء</button>
        </div>
      )}
      <button onClick={onBack} className="btn-back" style={{ marginTop: '15px' }}><ArrowRight size={18} /> العودة للرئيسية</button>
    </div>
  );
};

export default Customers;
