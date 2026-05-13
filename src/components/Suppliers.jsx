import React, { useState } from 'react';
import { Truck, UserPlus, Phone, Save, ArrowRight, DollarSign, AlertCircle } from 'lucide-react';

const Suppliers = ({ onBack, onAddSupplier, suppliers = [], waitingList = [], onPayDebt, onUpdateWaitingList }) => {
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', address: '', material: 'دقيق', debt: 0 });
  const [payAmount, setPayAmount] = useState({});
  const [showAdd, setShowAdd] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newSupplier.name || !newSupplier.phone) { alert("يرجى إدخال اسم المورد ورقم الهاتف"); return; }
    onAddSupplier({ ...newSupplier, id: Date.now(), debt: parseFloat(newSupplier.debt) || 0 });
    setNewSupplier({ name: '', phone: '', address: '', material: 'دقيق', debt: 0 });
    alert("تم إضافة المورد بنجاح");
  };

  const handlePayDebt = (supplierName) => {
    const amount = parseFloat(payAmount[supplierName]);
    if (!amount || amount <= 0) { alert("يرجى إدخال مبلغ صحيح"); return; }
    onPayDebt(supplierName, amount);
    setPayAmount(prev => ({ ...prev, [supplierName]: '' }));
    alert(`تم سداد ${amount} ج.م من حساب ${supplierName}`);
  };

  const handleRemoveOrder = (orderId) => { if (onUpdateWaitingList) onUpdateWaitingList(waitingList.filter(o => o.id !== orderId)); };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh' }}>
      <div className="page-header"><Truck size={28} color="#34495e" /><h2>إدارة الموردين</h2></div>
      <button onClick={() => setShowAdd(!showAdd)} className="btn-primary" style={{ backgroundColor: '#34495e', marginBottom: '15px', boxShadow: '0 4px 15px rgba(52, 73, 94, 0.3)' }}><UserPlus size={20} /> {showAdd ? 'إغلاق النموذج' : 'إضافة مورد جديد'}</button>
      {showAdd && (
        <div className="glass-card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, fontSize: '1rem', marginBottom: '15px' }}>بيانات المورد الجديد</h3>
          <form onSubmit={handleSubmit}>
            <label className="form-label">اسم المورد / الشركة</label><input className="glass-input" placeholder="مثال: شركة الأمل للدقيق" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} style={{ marginBottom: '10px' }} />
            <label className="form-label"><Phone size={14} /> رقم التواصل</label><input className="glass-input" placeholder="01xxxxxxxxx" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} style={{ marginBottom: '10px' }} />
            <label className="form-label">المادة الموردة</label><select className="glass-input" value={newSupplier.material} onChange={(e) => setNewSupplier({ ...newSupplier, material: e.target.value })} style={{ marginBottom: '10px' }}><option value="دقيق">دقيق</option><option value="سمن">سمن</option><option value="عجوة">عجوة</option><option value="تغليف">كراتين وتغليف</option><option value="سكر">سكر</option><option value="أخرى">أخرى</option></select>
            <label className="form-label"><DollarSign size={14} /> المديونية السابقة</label><input type="number" className="glass-input" placeholder="0" value={newSupplier.debt} onChange={(e) => setNewSupplier({ ...newSupplier, debt: e.target.value })} style={{ marginBottom: '15px' }} />
            <button type="submit" className="btn-primary" style={{ backgroundColor: '#34495e' }}><Save size={18} /> حفظ المورد</button>
          </form>
        </div>
      )}
      <h3 style={{ fontSize: '1rem', color: '#334155', marginBottom: '12px' }}>قائمة الموردين ({suppliers.length})</h3>
      {suppliers.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}><AlertCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} /><p style={{ margin: 0 }}>لا يوجد موردين مسجلين</p></div>
      ) : suppliers.map(s => (
        <div key={s.id} className="glass-card" style={{ marginBottom: '10px', padding: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
            <div><div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>{s.name}</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.material} | {s.phone}</div></div>
            {(s.debt || 0) > 0 && <span className="status-badge" style={{ background: '#fee2e2', color: '#ef4444' }}>مدين: {(parseFloat(s.debt) || 0).toLocaleString()} ج.م</span>}
          </div>
          {(s.debt || 0) > 0 && onPayDebt && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input type="number" className="glass-input" placeholder="مبلغ السداد" value={payAmount[s.name] || ''} onChange={(e) => setPayAmount(prev => ({ ...prev, [s.name]: e.target.value }))} style={{ marginBottom: 0, flex: 1 }} />
              <button onClick={() => handlePayDebt(s.name)} style={{ padding: '12px 16px', borderRadius: '14px', border: 'none', backgroundColor: '#2ecc71', color: 'white', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>سداد</button>
            </div>
          )}
        </div>
      ))}
      {waitingList && waitingList.length > 0 && (<><h3 style={{ fontSize: '1rem', color: '#f59e0b', marginTop: '20px', marginBottom: '12px' }}>طلبات الشراء المعلقة ({waitingList.length})</h3>{waitingList.map(order => (<div key={order.id} className="glass-card" style={{ marginBottom: '8px', padding: '12px', borderRight: '4px solid #f59e0b' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div style={{ fontWeight: 'bold' }}>{order.item}</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>مطلوب: {order.neededQty} | الحالة: {order.status}</div></div><button onClick={() => handleRemoveOrder(order.id)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}>حذف</button></div></div>))}</>)}
      <button onClick={onBack} className="btn-back" style={{ marginTop: '20px' }}><ArrowRight size={18} /> العودة للوحة التحكم</button>
    </div>
  );
};

export default Suppliers;
