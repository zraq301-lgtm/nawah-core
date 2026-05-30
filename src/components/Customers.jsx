import React, { useState } from 'react';
import { Users, UserPlus, Phone, Search, ArrowRight, MapPin, AlertCircle } from 'lucide-react';

const Customers = ({ onBack, customers = [], onAddCustomer }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '' });

  // تصفية العملاء بناءً على محرك البحث الذكي (الاسم أو رقم الهاتف)
  const filteredCustomers = customers.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone || '').includes(searchTerm)
  );

  const handleAdd = () => {
    if (!newCust.name.trim()) { 
      alert("يرجى إدخال اسم العميل"); 
      return; 
    }

    // توليد معرف فريد موحد للمحرك المحلي والسحابي
    const uniqueId = Date.now();

    // صياغة كائن العميل متضمناً contact_id لمنع أخطاء الفواتير المستقبليّة 🛡️
    const customerData = {
      id: uniqueId,
      contact_id: uniqueId, // الحقل السحري لربط الفواتير سحابياً بنجاح
      name: newCust.name.trim(),
      phone: newCust.phone.trim(),
      address: newCust.address.trim()
    };

    // إرسال البيانات إلى الأب (App.jsx) ليتولى الحفظ والمزامنة السحابية
    if (onAddCustomer) {
      onAddCustomer(customerData);
    }

    // إعادة تهيئة الحقول وإغلاق الواجهة الفرعية
    setNewCust({ name: '', phone: '', address: '' }); 
    setShowAdd(false); 
    alert("تم إضافة العميل بنجاح واقترانه بمحرك المزامنة.");
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh' }}>
      
      {/* رأس الصفحة الثابت */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <Users size={28} color="#27ae60" />
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>إدارة العملاء</h2>
      </div>

      {!showAdd ? (
        <>
          {/* شريط البحث المتقدم */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search style={{ position: 'absolute', right: '14px', top: '14px', color: '#94a3b8' }} size={20} />
            <input 
              className="glass-input" 
              placeholder="ابحث عن عميل بالاسم أو الرقم..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ paddingRight: '42px', width: '100%', boxSizing: 'border-box' }} 
            />
          </div>

          {/* زر فتح نافذة الإضافة */}
          <button 
            onClick={() => setShowAdd(true)} 
            className="btn-primary" 
            style={{ backgroundColor: '#27ae60', marginBottom: '15px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)' }}
          >
            <UserPlus size={20} /> إضافة عميل جديد
          </button>

          {/* عرض قائمة العملاء الفعالة */}
          {filteredCustomers.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              <AlertCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>لا يوجد عملاء مطبقين للبحث أو مسجلين حالياً</p>
            </div>
          ) : filteredCustomers.map(c => (
            <div key={c.id || c.contact_id} className="glass-card" style={{ marginBottom: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>{c.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={12} /> {c.phone || 'بدون رقم'}
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#27ae60', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} /> {c.address || '-'}
              </div>
            </div>
          ))}
        </>
      ) : (
        /* استمارة إضافة عميل جديد الزجاجية */
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#1e293b' }}>بيانات العميل الجديد</h3>
          
          <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>الاسم الكامل</label>
          <input 
            className="glass-input" 
            placeholder="اسم العميل" 
            value={newCust.name} 
            onChange={e => setNewCust({ ...newCust, name: e.target.value })} 
            style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }} 
          />
          
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500' }}>
            <Phone size={14} /> رقم الموبايل
          </label>
          <input 
            className="glass-input" 
            placeholder="01xxxxxxxxx" 
            value={newCust.phone} 
            onChange={e => setNewCust({ ...newCust, phone: e.target.value })} 
            style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }} 
          />
          
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500' }}>
            <MapPin size={14} /> العنوان / المنطقة
          </label>
          <input 
            className="glass-input" 
            placeholder="مثال: المعادي، القاهرة" 
            value={newCust.address} 
            onChange={e => setNewCust({ ...newCust, address: e.target.value })} 
            style={{ marginBottom: '20px', width: '100%', boxSizing: 'border-box' }} 
          />
          
          <button 
            onClick={handleAdd} 
            className="btn-primary" 
            style={{ backgroundColor: '#27ae60', marginBottom: '10px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={18} /> حفظ البيانات
          </button>
          
          <button onClick={() => setShowAdd(false)} className="btn-back" style={{ width: '100%' }}>إلغاء</button>
        </div>
      )}

      {/* زر العودة للوحة التحكم الرئيسية للتحكم بالهاتف */}
      <button 
        onClick={onBack} 
        className="btn-back" 
        style={{ marginTop: '15px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
      >
        <ArrowRight size={18} /> العودة للرئيسية
      </button>
    </div>
  );
};

export default Customers;
