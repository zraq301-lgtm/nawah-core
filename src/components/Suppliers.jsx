// src/components/Suppliers.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { Truck, UserPlus, Phone, Save, ArrowRight, DollarSign, AlertCircle, Building, Mail, FileText, MapPin, Layers } from 'lucide-react';
import Swal from 'sweetalert2';

const Suppliers = ({ onBack, waitingList = [], onUpdateWaitingList }) => {
  const queryClient = useQueryClient();
  
  // 📝 تهيئة شاملة لكافة الحقول المتوافقة مع السكيما المركزية لنظام الـ ERP (دون شروط إجبارية عدا الاسم والهاتف)
  const [newSupplier, setNewSupplier] = useState({ 
    name: '', 
    phone: '', 
    debt: 0,
    address: '',
    company_name: '',
    email: '',
    tax_number: '',
    commercial_register: '',
    supplied_materials: '' // الحقل المخصص لنوع المواد أو البضائع التي يوردها
  });
  const [payAmount, setPayAmount] = useState({});
  const [showAdd, setShowAdd] = useState(false);

  // 1️⃣ 🚀 استدعاء دالة الخدمة السحابية لجلب جهات الاتصال (جدول contacts)
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => apiService.getData('contacts'),
  });

  // استخراج مصفوفة الموردين فقط من البيانات المفلترة بالباك إند التابع لـ apiService
  const suppliers = contactsData?.categorized?.suppliers || [];

  // 2️⃣ 🏗️ محرك الطفرة (Mutation) لحفظ مورد جديد مباشرة في السيرفر السحابي
  const addSupplierMutation = useMutation({
    mutationFn: (supplier) => apiService.createData('contacts', supplier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      Swal.fire('تم الحفظ', 'تم تسجيل المورد بنجاح في السيرفر السحابي', 'success');
      // إعادة تهيئة النموذج بالكامل
      setNewSupplier({ 
        name: '', 
        phone: '', 
        debt: 0, 
        address: '', 
        company_name: '', 
        email: '', 
        tax_number: '', 
        commercial_register: '', 
        supplied_materials: '' 
      });
      setShowAdd(false);
    },
    onError: (error) => {
      Swal.fire('فشل الحفظ', error.message || 'حدث خطأ أثناء الاتصال بالسيرفر', 'error');
    }
  });

  // 3️⃣ 💸 محرك الطفرة لتتويج وتحديث المديونية والسداد سحابياً
  const payDebtMutation = useMutation({
    mutationFn: (updatedRow) => apiService.createData('contacts', updatedRow),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error) => {
      Swal.fire('خطأ في السداد', error.message, 'error');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newSupplier.name || !newSupplier.phone) { 
      Swal.fire('تنبيه', 'يرجى إدخال اسم المورد ورقم الهاتف بالكامل', 'warning'); 
      return; 
    }

    // تجهيز البنية الدقيقة المتوافقة مع جدول contacts المركزي (تم عزل حذف الأدرس لأن السيرفر أصبح يدعمه بأمان)
    const supplierPayload = {
      table: 'contacts', // تأكيد اسم الجدول للباك إند
      contact_id: Date.now(), // معرف فريد أصيل للهاتف والباك إند
      name: newSupplier.name.trim(),
      phone: newSupplier.phone.trim(),
      type: 'supplier', // الـ Flag الرئيسي ليصنفه الباك إند كمورد
      address: newSupplier.address.trim(),
      current_balance: parseFloat(newSupplier.debt) || 0, // مواءمة الحقل ليتطابق مع سكيما نيون
      company_name: newSupplier.company_name.trim(),
      email: newSupplier.email.trim().toLowerCase(),
      tax_number: newSupplier.tax_number.trim(),
      commercial_register: newSupplier.commercial_register.trim(),
      supplied_materials: newSupplier.supplied_materials.trim()
    };

    addSupplierMutation.mutate(supplierPayload);
  };

  const handlePayDebt = (supplier) => {
    const targetId = supplier?.id || supplier?.contact_id;
    
    if (!targetId) {
      Swal.fire('خطأ برمي', 'لم يتم العثور على معرف صالح لهذا المورد', 'error');
      return;
    }

    const amount = parseFloat(payAmount[targetId]);
    if (!amount || amount <= 0) { 
      Swal.fire('تنبيه', 'يرجى إدخال مبلغ صحيح للسداد', 'warning'); 
      return; 
    }
    
    const currentDebt = parseFloat(supplier?.current_balance !== undefined ? supplier.current_balance : supplier?.debt) || 0;
    if (amount > currentDebt) {
      Swal.fire('تنبيه', 'المبلغ المدخل أكبر من مديونية المورد الحالية', 'warning');
      return;
    }

    // بناء كائن التحديث الآمن دون عزل أو حذف الحقول المتوافقة مع السكيما المركزية
    const updatedPayload = {
      table: 'contacts',
      ...supplier, // نمرر الكائن كاملاً بما فيه الحقول الضريبية والإضافية
      current_balance: currentDebt - amount
    };

    payDebtMutation.mutate(updatedPayload);
    setPayAmount(prev => ({ ...prev, [targetId]: '' }));
    Swal.fire('تم السداد', `تم خصم ${amount} ج.م من حساب المورد ${supplier?.name}`, 'success');
  };

  const handleRemoveOrder = (orderId) => { 
    if (onUpdateWaitingList) onUpdateWaitingList(waitingList.filter(o => o.id !== orderId)); 
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <Truck size={28} color="#4f46e5" />
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>إدارة الموردين السحابية</h2>
      </div>

      <button onClick={() => setShowAdd(!showAdd)} className="btn-primary" style={{ backgroundColor: '#4f46e5', marginBottom: '15px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>
        <UserPlus size={20} /> {showAdd ? 'إغلاق النموذج' : 'إضافة مورد جديد'}
      </button>

      {showAdd && (
        <div className="glass-card" style={{ marginBottom: '20px', padding: '20px' }}>
          <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '15px', color: '#1e293b' }}>بيانات المورد الجديد</h3>
          <form onSubmit={handleSubmit}>
            <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>اسم المورد / المسؤول *</label>
            <input className="glass-input" placeholder="مثال: أحمد محمد (مسؤول المبيعات)" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }} />
            
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500' }}>
              <Building size={14} /> اسم الشركة / المصنع
            </label>
            <input className="glass-input" placeholder="مثال: شركة الأمل للمطاحن والدقيق" value={newSupplier.company_name} onChange={(e) => setNewSupplier({ ...newSupplier, company_name: e.target.value })} style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }} />

            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500' }}>
              <Phone size={14} /> رقم التواصل *
            </label>
            <input className="glass-input" placeholder="01xxxxxxxxx" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }} />
            
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500' }}>
              <Mail size={14} /> البريد الإلكتروني
            </label>
            <input className="glass-input" type="email" placeholder="supplier@company.com" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }} />

            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500' }}>
              <MapPin size={14} /> عنوان المورد / المستودع
            </label>
            <input className="glass-input" placeholder="مثال: المنطقة الصناعية، القاهرة" value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }} />

            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500' }}>
              <Layers size={14} /> الخامات / المواد الموردة
            </label>
            <input className="glass-input" placeholder="مثال: دقيق، سكر، مواد تغليف" value={newSupplier.supplied_materials} onChange={(e) => setNewSupplier({ ...newSupplier, supplied_materials: e.target.value })} style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }} />

            {/* 💼 حقول السجل والبطاقة الضريبية والمالية منقسمة بشكل مريح للهواتف المحمولة */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500', fontSize: '0.85rem' }}>
                  <FileText size={14} /> الرقم الضريبي
                </label>
                <input className="glass-input" placeholder="xxx-xxx-xxx" value={newSupplier.tax_number} onChange={(e) => setNewSupplier({ ...newSupplier, tax_number: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500', fontSize: '0.85rem' }}>
                  <FileText size={14} /> السجل التجاري
                </label>
                <input className="glass-input" placeholder="رقم السجل" value={newSupplier.commercial_register} onChange={(e) => setNewSupplier({ ...newSupplier, commercial_register: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>

            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '500' }}>
              <DollarSign size={14} /> المديونية السابقة المستحقة للمورد
            </label>
            <input type="number" className="glass-input" placeholder="0.00" value={newSupplier.debt} onChange={(e) => setNewSupplier({ ...newSupplier, debt: e.target.value })} style={{ marginBottom: '20px', width: '100%', boxSizing: 'border-box' }} />
            
            <button type="submit" className="btn-primary" style={{ backgroundColor: '#4f46e5', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }} disabled={addSupplierMutation.isPending}>
              <Save size={18} /> {addSupplierMutation.isPending ? 'جاري الحفظ بالسحابة...' : 'حفظ المورد سحابياً'}
            </button>
          </form>
        </div>
      )}

      <h3 style={{ fontSize: '1rem', color: '#334155', marginBottom: '12px' }}>قائمة الموردين ({suppliers.length})</h3>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#4f46e5' }}>🔄 جاري تحميل الموردين من قاعدة البيانات الموحدة...</div>
      ) : suppliers.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
          <AlertCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>لا يوجد موردين مسجلين في بيئة عملك حالياً</p>
        </div>
      ) : suppliers.map(s => {
        const currentSupplierId = s?.id || s?.contact_id;
        if (!currentSupplierId) return null;

        const displayDebt = parseFloat(s?.current_balance !== undefined ? s.current_balance : s?.debt) || 0;
        
        return (
          <div key={currentSupplierId} className="glass-card" style={{ marginBottom: '10px', padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>
                  {s?.name || 'مورد غير معروف'} {s?.company_name ? `(${s?.company_name})` : ''}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '2px' }}>📞 {s?.phone || 'بدون هاتف'}</div>
                {s?.supplied_materials && (
                  <div style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: '500', marginBottom: '2px' }}>📦 الخامات: {s.supplied_materials}</div>
                )}
                {s?.address && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>📍 {s.address}</div>
                )}
              </div>
              {displayDebt > 0 && (
                <span className="status-badge" style={{ background: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  مستحق: {displayDebt.toLocaleString()} ج.م
                </span>
              )}
            </div>
            {displayDebt > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <input type="number" className="glass-input" placeholder="مبلغ السداد" value={payAmount[currentSupplierId] || ''} onChange={(e) => setPayAmount(prev => ({ ...prev, [currentSupplierId]: e.target.value }))} style={{ marginBottom: 0, flex: 1 }} />
                <button onClick={() => handlePayDebt(s)} style={{ padding: '12px 16px', borderRadius: '14px', border: 'none', backgroundColor: '#2ecc71', color: 'white', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }} disabled={payDebtMutation.isPending}>
                  سداد
                </button>
              </div>
            )}
          </div>
        );
      })}

      {waitingList && waitingList.length > 0 && (
        <>
          <h3 style={{ fontSize: '1rem', color: '#f59e0b', marginTop: '20px', marginBottom: '12px' }}>طلبات الشراء المعلقة ({waitingList.length})</h3>
          {waitingList.map(order => (
            <div key={order.id} className="glass-card" style={{ marginBottom: '8px', padding: '12px', borderRight: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{order.item}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>مطلوب: {order.neededQty} | الحالة: {order.status}</div>
                </div>
                <button onClick={() => handleRemoveOrder(order.id)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}>حذف</button>
              </div>
            </div>
          ))}
        </>
      )}

      <button onClick={onBack} className="btn-back" style={{ marginTop: '20px', width: '100%' }}>
        <ArrowRight size={18} /> العودة للوحة التحكم
      </button>
    </div>
  );
};

export default Suppliers;
