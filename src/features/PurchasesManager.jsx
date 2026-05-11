import React, { useState } from 'react';
import { Package, Truck, Calendar, Hash, DollarSign, ArrowRight, Save, ShoppingCart, Clock, Bell, Table, PlusCircle } from 'lucide-react';
import DataGrid from './DataGrid';

const PurchasesManager = ({ onPurchaseComplete, onBack, stock = [], onOrderTrigger, inventory = [] }) => {
  const [activeView, setActiveView] = useState('menu');
  const [isNewItem, setIsNewItem] = useState(false); // حالة للتبديل بين اختيار صنف أو إضافة جديد
  
  const [formData, setFormData] = useState({
    item: '', unit: '', quantity: '', price: '',
    supplier: '', paymentMethod: 'كاش',
    date: new Date().toISOString().split('T')[0]
  });
  const [orderRequest, setOrderRequest] = useState({ item: '', currentStock: 0, daysLeft: 0, neededQty: 0 });

  // دالة التعامل مع اختيار صنف موجود مسبقاً
  const handleExistingItemSelect = (itemName) => {
    if (itemName === "NEW_ITEM") {
      setIsNewItem(true);
      setFormData({ ...formData, item: '', unit: '', price: '' });
      return;
    }
    
    const selected = stock.find(s => s.name === itemName);
    if (selected) {
      setFormData({
        ...formData,
        item: selected.name,
        unit: selected.unit || '',
        price: selected.price || '' // جلب آخر سعر مسجل تلقائياً
      });
      setIsNewItem(false);
    }
  };

  const handleItemSelect = (itemName) => {
    const itemInStock = stock.find(s => s.name === itemName);
    const balance = itemInStock ? itemInStock.balance : 0;
    setOrderRequest({
      ...orderRequest,
      item: itemName,
      currentStock: balance,
      daysLeft: Math.floor(balance / 2)
    });
  };

  const handleSendToSuppliers = (e) => {
    e.preventDefault();
    if (onOrderTrigger) {
      onOrderTrigger({
        ...orderRequest,
        id: Date.now(),
        status: 'في الانتظار',
        requestDate: new Date().toLocaleDateString(),
        type: 'ERP_ORDER'
      });
    }
    alert(`تم إرسال طلب (${orderRequest.item}) لقسم الموردين بنجاح`);
    setActiveView('menu');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.item || !formData.quantity || !formData.price) {
      alert("يرجى إكمال بيانات الفاتورة"); return;
    }
    const purchaseWithBatch = {
      ...formData,
      total: formData.quantity * formData.price,
      id: Date.now(),
      batchInfo: {
        batchId: `B-${Date.now().toString().slice(-6)}`,
        purchaseDate: formData.date,
        costPerUnit: parseFloat(formData.price),
        supplier: formData.supplier || 'مورد عام'
      }
    };
    onPurchaseComplete(purchaseWithBatch);
    alert(`تم الحفظ وإضافة شحنة جديدة للمخزن برقم ${purchaseWithBatch.batchInfo.batchId}`);
    setFormData({ item: '', unit: '', quantity: '', price: '', supplier: '', paymentMethod: 'كاش', date: new Date().toISOString().split('T')[0] });
    setIsNewItem(false);
    setActiveView('menu');
  };

  const purchaseColumns = [
    { key: 'date', header: 'التاريخ', editable: false },
    { key: 'item', header: 'الصنف', editable: false },
    { key: 'quantity', header: 'الكمية', editable: false, render: v => v?.toLocaleString() },
    { key: 'price', header: 'السعر', editable: false, render: v => v?.toLocaleString() },
    { key: 'total', header: 'الإجمالي', editable: false, render: v => v?.toLocaleString() },
    { key: 'supplier', header: 'المورد', editable: false },
    { key: 'paymentMethod', header: 'السداد', editable: false },
  ];

  if (activeView === 'menu') {
    return (
      <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh' }}>
        <div className="page-header">
          <ShoppingCart size={28} color="#1e5631" />
          <h2 style={{ margin: 0 }}>نظام المشتريات ERP</h2>
        </div>

        <div style={{ background: 'rgba(240, 253, 244, 0.8)', border: '1px solid rgba(30, 86, 49, 0.15)', padding: '12px', borderRadius: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={20} color="#1e5631" />
          <span style={{ fontSize: '0.8rem', color: '#065f46' }}>سيقوم النظام بتنبيهك عند نقص الخامات.</span>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          <div className="glass-card" onClick={() => setActiveView('entry')} style={{ cursor: 'pointer', textAlign: 'right', borderRight: '8px solid #1e5631', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: 'rgba(240, 253, 244, 0.8)', padding: '12px', borderRadius: '12px' }}><Save size={24} color="#1e5631" /></div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>فاتورة مشتريات</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>دخول خامات جديدة للمخزن</p>
            </div>
          </div>

          <div className="glass-card" onClick={() => setActiveView('orderRequest')} style={{ cursor: 'pointer', textAlign: 'right', borderRight: '8px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '12px' }}><Truck size={24} color="#f59e0b" /></div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>طلب احتياج</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>تنبيه الموردين بالنواقص</p>
            </div>
          </div>

          {inventory.length > 0 && (
            <div className="glass-card" onClick={() => setActiveView('grid')} style={{ cursor: 'pointer', textAlign: 'right', borderRight: '8px solid #3498db', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: 'rgba(239, 246, 255, 0.8)', padding: '12px', borderRadius: '12px' }}><Table size={24} color="#3498db" /></div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>سجل المشتريات</h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>عرض وتصدير جميع فواتير الشراء</p>
              </div>
            </div>
          )}
        </div>

        <button onClick={onBack} className="btn-back" style={{ marginTop: '20px' }}><ArrowRight size={18} /> العودة للوحة التحكم</button>
      </div>
    );
  }

  if (activeView === 'grid') {
    return (
      <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh' }}>
        <div className="page-header">
          <button onClick={() => setActiveView('menu')} style={{ border: 'none', background: 'rgba(240, 253, 244, 0.8)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><ArrowRight size={20} /></button>
          <h3 style={{ margin: 0 }}>سجل المشتريات</h3>
        </div>
        <div className="glass-card" style={{ padding: '12px' }}>
          <DataGrid columns={purchaseColumns} data={inventory} exportFileName="سجل_المشتريات" editable={false} />
        </div>
      </div>
    );
  }

  if (activeView === 'orderRequest') {
    return (
      <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh' }}>
        <div className="page-header">
          <button onClick={() => setActiveView('menu')} style={{ border: 'none', background: 'rgba(240, 253, 244, 0.8)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><ArrowRight size={20} /></button>
          <h3 style={{ margin: 0 }}>ERP - طلب احتياج</h3>
        </div>
        <div className="glass-card">
          <form onSubmit={handleSendToSuppliers}>
            <label className="form-label">الصنف المطلوب</label>
            <select className="glass-input" required onChange={e => handleItemSelect(e.target.value)} style={{ marginBottom: '12px' }}>
              <option value="">اختر صنف من المخزن...</option>
              {stock.map(s => <option key={s.id} value={s.name}>{s.name} (رصيد: {s.balance})</option>)}
            </select>

            {orderRequest.item && (
              <div style={{ background: orderRequest.currentStock < 5 ? 'rgba(254, 226, 226, 0.8)' : 'rgba(240, 253, 244, 0.8)', padding: '14px', borderRadius: '14px', marginBottom: '12px', border: `1px solid ${orderRequest.currentStock < 5 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(30, 86, 49, 0.15)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.8rem' }}>الرصيد المتاح:</span>
                  <strong style={{ color: orderRequest.currentStock < 5 ? '#ef4444' : '#1e293b' }}>{orderRequest.currentStock}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem' }}>الاستهلاك المتوقع:</span>
                  <strong>{orderRequest.daysLeft} أيام</strong>
                </div>
              </div>
            )}

            <label className="form-label">الكمية المطلوبة</label>
            <input type="number" className="glass-input" placeholder="الكمية المطلوبة من المورد" required inputMode="decimal" onChange={e => setOrderRequest({ ...orderRequest, neededQty: e.target.value })} style={{ marginBottom: '15px' }} />
            <button type="submit" className="btn-primary" style={{ backgroundColor: '#1e5631', boxShadow: '0 4px 15px rgba(30, 86, 49, 0.3)' }}><Truck size={20} /> إرسال للموردين</button>
          </form>
        </div>
      </div>
    );
  }

  if (activeView === 'entry') {
    return (
      <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh' }}>
        <div className="page-header">
          <button onClick={() => {setActiveView('menu'); setIsNewItem(false);}} style={{ border: 'none', background: 'rgba(240, 253, 244, 0.8)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><ArrowRight size={20} /></button>
          <h3 style={{ margin: 0 }}>تسجيل فاتورة شراء</h3>
        </div>
        <div className="glass-card">
          <form onSubmit={handleSave}>
            <label className="form-label"><Package size={16} color="#1e5631" /> اسم الصنف</label>
            
            {/* القائمة المنسدلة لاختيار صنف موجود */}
            {!isNewItem ? (
              <select 
                className="glass-input" 
                required 
                value={formData.item}
                onChange={e => handleExistingItemSelect(e.target.value)} 
                style={{ marginBottom: '10px' }}
              >
                <option value="">اختر من المخزن...</option>
                {stock.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                <option value="NEW_ITEM" style={{color: '#1e5631', fontWeight: 'bold'}}>+ إضافة صنف جديد غير مسجل</option>
              </select>
            ) : (
              <div style={{ position: 'relative' }}>
                <input 
                  className="glass-input" 
                  placeholder="اكتب اسم الصنف الجديد هنا" 
                  required 
                  value={formData.item} 
                  onChange={e => setFormData({ ...formData, item: e.target.value })} 
                  style={{ marginBottom: '10px', paddingLeft: '40px' }} 
                />
                <button 
                  type="button" 
                  onClick={() => setIsNewItem(false)} 
                  style={{ position: 'absolute', left: '10px', top: '10px', border: 'none', background: 'none', color: '#ef4444', fontSize: '0.7rem' }}
                >إلغاء</button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><label className="form-label">الوحدة</label><input className="glass-input" placeholder="كيلو/كرتونة" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} style={{ marginBottom: '10px' }} /></div>
              <div><label className="form-label"><Hash size={16} color="#1e5631" /> الكمية</label><input type="number" className="glass-input" required inputMode="decimal" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} style={{ marginBottom: '10px' }} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><label className="form-label"><DollarSign size={16} color="#1e5631" /> سعر الوحدة</label><input type="number" className="glass-input" required inputMode="decimal" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} style={{ marginBottom: '10px' }} /></div>
              <div><label className="form-label">طريقة السداد</label><select className="glass-input" value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} style={{ marginBottom: '10px' }}><option value="كاش">كاش</option><option value="آجل">آجل</option></select></div>
            </div>
            <label className="form-label"><Truck size={16} color="#1e5631" /> اسم المورد</label>
            <input className="glass-input" placeholder="اختياري" value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} style={{ marginBottom: '10px' }} />
            <label className="form-label"><Calendar size={16} color="#1e5631" /> التاريخ</label>
            <input type="date" className="glass-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ marginBottom: '15px' }} />
            {formData.quantity && formData.price && (
              <div style={{ background: 'rgba(240, 253, 244, 0.8)', padding: '14px', borderRadius: '14px', marginBottom: '15px', textAlign: 'center', border: '1px solid rgba(30, 86, 49, 0.15)' }}>
                <span style={{ fontSize: '0.9rem' }}>إجمالي الفاتورة: </span><strong style={{ fontSize: '1.2rem', color: '#1e5631' }}>{(parseFloat(formData.quantity) * parseFloat(formData.price)).toLocaleString()}</strong>
              </div>
            )}
            <button type="submit" className="btn-primary" style={{ backgroundColor: '#1e5631', boxShadow: '0 4px 15px rgba(30, 86, 49, 0.3)' }}><Save size={20} /> تسجيل وإضافة للمخزن</button>
          </form>
        </div>
      </div>
    );
  }
  return null;
};

export default PurchasesManager;
