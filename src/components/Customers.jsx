// Customers.jsx
import React, { useState } from 'react';
import { Users, UserPlus, Phone, Search, ArrowRight, MapPin, AlertCircle, DollarSign, Building, FileText, ShieldAlert, Mail } from 'lucide-react';

// 🚀 استيراد أدوات إدارة الكاش والمزامنة السحابية الفورية
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

const Customers = ({ onBack, customers = [], onAddCustomer }) => {
  const queryClient = useQueryClient(); // محرك إنعاش البيانات الحية لقاعدة البيانات
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [issaving, setIsSaving] = useState(false); // مؤشر حماية لمنع نقرات الحفظ المتكررة
  
  // 📝 تهيئة شاملة لكافة الحقول المتوافقة مع السكيما المركزية لنظام الـ ERP
  const [newCust, setNewCust] = useState({ 
    name: '', 
    phone: '', 
    address: '', 
    current_balance: '',
    company_name: '',
    email: '',
    tax_number: '',
    commercial_register: '',
    credit_limit: ''
  });

  // 📥 تشغيل محرك المزامنة الذكي لجلب قائمة الجهات وتصفية العملاء منها سحابياً تلقائياً
  const { data: cloudContacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => apiService.getData('contacts'),
    staleTime: 1000 * 60 * 2, // البيانات تظل طازجة في الكاش لمدة دقيقتين
  });

  // 🔄 دمج البيانات الحية القادمة من السيرفر مع البيانات المحلية لضمان استقرار العرض (Fallback)
  const activeCustomersList = cloudContacts.length > 0 
    ? cloudContacts.filter(c => c.type === 'customer' || c.type === 'general')
    : customers;

  // تصفية العملاء بناءً على محرك البحث الذكي (الاسم، اسم الشركة، أو رقم الهاتف)
  const filteredCustomers = activeCustomersList.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone || '').includes(searchTerm)
  );

  const handleAdd = async () => {
    if (!newCust.name.trim()) { 
      alert("يرجى إدخال اسم العميل"); 
      return; 
    }

    try {
      setIsSaving(true);

      // توليد معرف فريد موحد للمحرك المحلي والسحابي (BigInt متوافق مع mutate.js)
      const uniqueId = Date.now();

      // 🛡️ صياغة كائن العميل الكامل متضمناً كل مدخلات السكيما المركزية لنيون
      const customerData = {
        id: uniqueId,
        contact_id: uniqueId, // المعرف الفريد الزمني الذي يحمي الـ Integer من الـ out of range
        name: newCust.name.trim(),
        phone: newCust.phone.trim(),
        address: newCust.address.trim(),
        type: 'customer', // تحديد الهوية كعميل بشكل صارم
        current_balance: Number(newCust.current_balance || 0), // المديونية السابقة الافتتاحية للعميل
        company_name: newCust.company_name.trim(),
        email: newCust.email.trim().toLowerCase(),
        tax_number: newCust.tax_number.trim(),
        commercial_register: newCust.commercial_register.trim(),
        credit_limit: Number(newCust.credit_limit || 0)
      };

      // 1️⃣ إرسال البيانات إلى الأب (App.jsx) ليتولى الحفظ بالـ API المحدث ومزامنة نيون
      if (onAddCustomer) {
        await onAddCustomer(customerData);
      }

      // 2️⃣ [الحل الحاسم]: إجبار React Query على كسر الكاش القديم وجلب القائمة المحدثة فوراً من السيرفر
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });

      // 3️⃣ إعادة تهيئة الحقول وإغلاق واجهة الإدخال والعودة الفورية لواجهة الجدول
      setNewCust({ 
        name: '', 
        phone: '', 
        address: '', 
        current_balance: '',
        company_name: '',
        email: '',
        tax_number: '',
        commercial_register: '',
        credit_limit: ''
      }); 
      setShowAdd(false); 
      alert("تم إضافة العميل بنجاح وتحديث مساحة العمل السحابية.");
      
    } catch (error) {
      console.error("خطأ أثناء حفظ العميل:", error);
      alert("حدث خطأ أثناء المزامنة، برجاء المحاولة مرة أخرى");
    } finally {
      setIsSaving(false);
    }
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
          {/* show list view */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search style={{ position: 'absolute', right: '14px', top: '14px', color: '#94a3b8' }} size={20} />
            <input 
              className="glass-input" 
              placeholder="ابحث عن اسم، شركة، أو رقم..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ paddingRight: '42px', width: '100%', boxSizing: 'border-box' }} 
            />
          </div>

          <button 
            onClick={() => setShowAdd(true)} 
            className="btn-primary" 
            style={{ backgroundColor: '#27ae60', marginBottom: '15px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)' }}
          >
            <UserPlus size={20} /> إضافة عميل جديد
          </button>

          {filteredCustomers.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              <AlertCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>لا يوجد عملاء مطبقين للبحث أو مسجلين حالياً</p>
            </div>
          ) : filteredCustomers.map(c => (
            <div key={c.contact_id || c.id} className="glass-card" style={{ marginBottom: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>
                  {c.name} {c.company_name ? `(${c.company_name})` : ''}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <Phone size={12} /> {c.phone || 'بدون رقم'}
                </div>
                {c.email && (
                  <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <Mail size={12} /> {c.email}
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} /> {c.address || 'العنوان غير محدد'}
                </div>
              </div>
              
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>المديونية الحالية</span>
                <span style={{ fontWeight: 'bold', color: Number(c.current_balance) > 0 ? '#e74c3c' : '#27ae60', fontSize: '0.95rem' }}>
                  {c.current_balance || 0} ج.م
                </span>
                {Number(c.credit_limit) > 0 && (
                  <span style={{ fontSize: '0.7rem', color: '#7f8c8d', display: 'block', marginTop: '2px' }}>
                    حد ائتمان: {c.credit_limit}
                  </span>
                )}
              </div>
            </div>
          ))}
        </>
      ) : (
        /* Form View */
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#1e293b' }}>بيانات العميل الجديد</h3>
          
          <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>الاسم الكامل للعميل *</label>
          <input 
            className="glass-input" 
            placeholder="مثال: أحمد محمد علي" 
            value={newCust.name} 
            onChange={e => setNewCust({ ...newCust, name: e.target.value })} 
            style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }} 
          />

          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500' }}>
            <Building size={14} /> اسم الشركة / المؤسسة
          </label>
          <input 
            className="glass-input" 
            placeholder="مثال: شركة النور والمستقبل" 
            value={newCust.company_name} 
            onChange={e => setNewCust({ ...newCust, company_name: e.target.value })} 
            style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }} 
          />
          
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500' }}>
            <Phone size={14} /> رقم التواصل المعتمَد
          </label>
          <input 
            className="glass-input" 
            placeholder="01xxxxxxxxx" 
            value={newCust.phone} 
            onChange={e => setNewCust({ ...newCust, phone: e.target.value })} 
            style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }} 
          />

          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500' }}>
            <Mail size={14} /> البريد الإلكتروني
          </label>
          <input 
            className="glass-input" 
            type="email"
            placeholder="customer@example.com" 
            value={newCust.email} 
            onChange={e => setNewCust({ ...newCust, email: e.target.value })} 
            style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }} 
          />
          
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500' }}>
            <MapPin size={14} /> العنوان بالتفصيل
          </label>
          <input 
            className="glass-input" 
            placeholder="مثال: مدينة نصر، القاهرة" 
            value={newCust.address} 
            onChange={e => setNewCust({ ...newCust, address: e.target.value })} 
            style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }} 
          />

          {/* 💼 صف من الحقول المالية والضريبية المتقدمة لـ ERP */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500', fontSize: '0.85rem' }}>
                <FileText size={14} /> الرقم الضريبي
              </label>
              <input 
                className="glass-input" 
                placeholder="xxx-xxx-xxx" 
                value={newCust.tax_number} 
                onChange={e => setNewCust({ ...newCust, tax_number: e.target.value })} 
                style={{ width: '100%', boxSizing: 'border-box' }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500', fontSize: '0.85rem' }}>
                <FileText size={14} /> السجل التجاري
              </label>
              <input 
                className="glass-input" 
                placeholder="رقم السجل" 
                value={newCust.commercial_register} 
                onChange={e => setNewCust({ ...newCust, commercial_register: e.target.value })} 
                style={{ width: '100%', boxSizing: 'border-box' }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500', fontSize: '0.85rem' }}>
                <DollarSign size={14} /> مديونية سابقة
              </label>
              <input 
                className="glass-input" 
                type="number"
                placeholder="0.00" 
                value={newCust.current_balance} 
                onChange={e => setNewCust({ ...newCust, current_balance: e.target.value })} 
                style={{ width: '100%', boxSizing: 'border-box' }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500', fontSize: '0.85rem' }}>
                <ShieldAlert size={14} /> الحد الائتماني
              </label>
              <input 
                className="glass-input" 
                type="number"
                placeholder="أقصى مديونية" 
                value={newCust.credit_limit} 
                onChange={e => setNewCust({ ...newCust, credit_limit: e.target.value })} 
                style={{ width: '100%', boxSizing: 'border-box' }} 
              />
            </div>
          </div>
          
          <button 
            onClick={handleAdd} 
            disabled={issaving}
            className="btn-primary" 
            style={{ 
              backgroundColor: issaving ? '#94a3b8' : '#27ae60', 
              marginBottom: '10px', 
              width: '100%', 
              display: 'flex', 
              justify: 'center', 
              alignItems: 'center', 
              gap: '6px',
              cursor: issaving ? 'not-allowed' : 'pointer'
            }}
          >
            <UserPlus size={18} /> {issaving ? 'جاري الحفظ والمزامنة...' : 'حفظ العميل سحابياً'}
          </button>
          
          <button onClick={() => setShowAdd(false)} disabled={issaving} className="btn-back" style={{ width: '100%' }}>إلغاء</button>
        </div>
      )}

      {/* زر العودة للوحة التحكم الرئيسية */}
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
