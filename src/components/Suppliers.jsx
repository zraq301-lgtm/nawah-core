// src/components/Suppliers.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { Truck, UserPlus, Phone, Save, ArrowRight, DollarSign, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const Suppliers = ({ onBack, waitingList = [], onUpdateWaitingList }) => {
  const queryClient = useQueryClient();
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', address: '', material: 'دقيق', debt: 0 });
  const [payAmount, setPayAmount] = useState({});
  const [showAdd, setShowAdd] = useState(false);

  // 1️⃣ 🚀 استدعاء دالة الخدمة السحابية لجلب جهات الاتصال (جدول contacts)
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => apiService.getData('contacts'),
  });

  // استخراج مصفوفة الموردين فقط من البيانات المفلترة بالباك إند التابع للـ apiService
  const suppliers = contactsData?.categorized?.suppliers || [];

  // 2️⃣ 🏗️ محرك الطفرة (Mutation) لحفظ مورد جديد مباشرة في السيرفر السحابي
  const addSupplierMutation = useMutation({
    mutationFn: (supplier) => apiService.createData('contacts', supplier),
    onSuccess: () => {
      // تحديث فوري لذاكرة التخزين المؤقت لـ React Query لإظهار المورد دون الحاجة لإعادة تحميل التطبيق
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      Swal.fire('تم الحفظ', 'تم تسجيل المورد بنجاح في السيرفر السحابي', 'success');
      setNewSupplier({ name: '', phone: '', address: '', material: 'دقيق', debt: 0 });
      setShowAdd(false);
    },
    onError: (error) => {
      Swal.fire('فشل الحفظ', error.message || 'حدث خطأ أثناء الاتصال بالسيرفر', 'error');
    }
  });

  // 3️⃣ 💸 محرك الطفرة لتحديث المديونية والسداد سحابياً
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

    // تجهيز البنية الدقيقة المتوافقة مع جدول contacts الخاص بقاعدة البيانات
    const supplierPayload = {
      contact_id: Date.now(), // معرف فريد للهاتف والباك إند
      name: newSupplier.name.trim(),
      phone: newSupplier.phone.trim(),
      address: newSupplier.material, // تخزين نوع المادة في حقل العنوان أو تهيئته للباك إند
      type: 'supplier', // الـ Flag الرئيسي ليصنفه الباك إند كمورد
      debt: parseFloat(newSupplier.debt) || 0
    };

    addSupplierMutation.mutate(supplierPayload);
  };

  const handlePayDebt = (supplier) => {
    const amount = parseFloat(payAmount[supplier.id]);
    if (!amount || amount <= 0) { 
      Swal.fire('تنبيه', 'يرجى إدخال مبلغ صحيح للسداد', 'warning'); 
      return; 
    }
    
    const currentDebt = parseFloat(supplier.debt) || 0;
    if (amount > currentDebt) {
      Swal.fire('تنبيه', 'المبلغ المدخل أكبر من مديونية المورد الحالية', 'warning');
      return;
    }

    // احتساب المديونية الجديدة لإرسال تحديث الحفظ (Mutate) للسيرفر
    const updatedPayload = {
      ...supplier,
      debt: currentDebt - amount
    };

    payDebtMutation.mutate(updatedPayload);
    setPayAmount(prev => ({ ...prev, [supplier.id]: '' }));
    Swal.fire('تم السداد', `تم خصم ${amount} ج.م من حساب المورد ${supplier.name}`, 'success');
  };

  const handleRemoveOrder = (orderId) => { 
    if (onUpdateWaitingList) onUpdateWaitingList(waitingList.filter(o => o.id !== orderId)); 
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh' }}>
      <div className="page-header">
        <Truck size={28} color="#4f46e5" />
        <h2>إدارة الموردين السحابية</h2>
      </div>

      <button onClick={() => setShowAdd(!showAdd)} className="btn-primary" style={{ backgroundColor: '#4f46e5', marginBottom: '15px', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>
        <UserPlus size={20} /> {showAdd ? 'إغلاق النموذج' : 'إضافة مورد جديد'}
      </button>

      {showAdd && (
        <div className="glass-card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, fontSize: '1rem', marginBottom: '15px' }}>بيانات المورد الجديد</h3>
          <form onSubmit={handleSubmit}>
            <label className="form-label">اسم المورد / الشركة</label>
            <input className="glass-input" placeholder="مثال: شركة الأمل للدقيق" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} style={{ marginBottom: '10px' }} />
            
            <label className="form-label"><Phone size={14} /> رقم التواصل</label>
            <input className="glass-input" placeholder="01xxxxxxxxx" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} style={{ marginBottom: '10px' }} />
            
            <label className="form-label">المادة الموردة</label>
            <select className="glass-input" value={newSupplier.material} onChange={(e) => setNewSupplier({ ...newSupplier, material: e.target.value })} style={{ marginBottom: '10px' }}>
              <option value="دقيق">دقيق</option>
              <option value="سمن">سمن</option>
              <option value="عجوة">عجوة</option>
              <option value="تغليف">كراتين وتغليف</option>
              <option value="سكر">سكر</option>
              <option value="أخرى">أخرى</option>
            </select>
            
            <label className="form-label"><DollarSign size={14} /> المديونية السابقة</label>
            <input type="number" className="glass-input" placeholder="0" value={newSupplier.debt} onChange={(e) => setNewSupplier({ ...newSupplier, debt: e.target.value })} style={{ marginBottom: '15px' }} />
            
            <button type="submit" className="btn-primary" style={{ backgroundColor: '#4f46e5' }} disabled={addSupplierMutation.isPending}>
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
      ) : suppliers.map(s => (
        <div key={s.id || s.contact_id} className="glass-card" style={{ marginBottom: '10px', padding: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>{s.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.address || 'مورد عام'} | {s.phone}</div>
            </div>
            {(parseFloat(s.debt) || 0) > 0 && (
              <span className="status-badge" style={{ background: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '8px', fontSize: '0.8rem' }}>
                مدين: {(parseFloat(s.debt) || 0).toLocaleString()} ج.م
              </span>
            )}
          </div>
          {(parseFloat(s.debt) || 0) > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input type="number" className="glass-input" placeholder="مبلغ السداد" value={payAmount[s.id] || ''} onChange={(e) => setPayAmount(prev => ({ ...prev, [s.id]: e.target.value }))} style={{ marginBottom: 0, flex: 1 }} />
              <button onClick={() => handlePayDebt(s)} style={{ padding: '12px 16px', borderRadius: '14px', border: 'none', backgroundColor: '#2ecc71', color: 'white', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }} disabled={payDebtMutation.isPending}>
                سداد
              </button>
            </div>
          )}
        </div>
      ))}

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

      <button onClick={onBack} className="btn-back" style={{ marginTop: '20px' }}>
        <ArrowRight size={18} /> العودة للوحة التحكم
      </button>
    </div>
  );
};

export default Suppliers;
