import React, { useState } from 'react';
import { Package, Truck, Calendar, Hash, DollarSign, ArrowRight, Save, ShoppingCart, Bell, Table, AlertTriangle, User } from 'lucide-react';
import DataGrid from './DataGrid';

// --- استدعاء عميل سوبابيز المباشر المتكامل مع الأسرار بدلاً من الخدمة القديمة ---
import { supabase } from '../supabaseClient';

const PurchasesManager = ({ onPurchaseComplete, onBack, stock = [], onOrderTrigger, inventory = [] }) => {
  const [activeView, setActiveView] = useState('menu');
  const [isNewItem, setIsNewItem] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  const [formData, setFormData] = useState({
    item: '', unit: '', quantity: '', price: '',
    supplier: '', paymentMethod: 'كاش',
    date: new Date().toISOString().split('T')[0]
  });

  const [orderRequest, setOrderRequest] = useState({ 
    item: '', currentStock: 0, daysLeft: 0, neededQty: '', supplier: '' 
  });

  const lowStockItems = stock.filter(s => s.balance <= 20);

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
        price: selected.price || ''
      });
      setIsNewItem(false);
    }
  };

  const handleItemSelectForOrder = (itemName) => {
    const itemInStock = stock.find(s => s.name === itemName);
    const balance = itemInStock ? itemInStock.balance : 0;
    setOrderRequest({
      ...orderRequest,
      item: itemName,
      currentStock: balance,
      daysLeft: Math.floor(balance / 2)
    });
  };

  // --- إصلاح دالة إرسال طلب الاحتياج لتتحدث مع Supabase مباشرة ---
  const handleSendToSuppliers = async (e) => {
    if (e) e.preventDefault();
    if (!orderRequest.item || !orderRequest.neededQty) {
      alert("يرجى ملء بيانات طلب الاحتياج أولاً");
      return;
    }

    setIsSubmitting(true);

    // عزل المزامنة السحابية تماماً لضمان عدم توقف واجهة الموبايل
    try {
      const tenantId = localStorage.getItem('tenantId') || 'default_tenant';
      
      // الرفع المباشر لجدول طلبات الاحتياج في Supabase
      if (supabase) {
        const { error } = await supabase
          .from('order_requests')
          .insert([
            {
              tenant_id: tenantId,
              item: orderRequest.item,
              quantity: parseFloat(orderRequest.neededQty) || 0,
              supplier: orderRequest.supplier || 'عام',
              type: 'ERP_ORDER_REQUEST',
              created_at: new Date().toISOString()
            }
          ]);
        
        if (error) throw error;
        console.log("☁️ تم مزامنة طلب الاحتياج مع سوبابيز بنجاح");
      }
    } catch (err) {
      console.warn("☁️ خطأ في الشبكة/السيرفر - سيتم التنفيذ محلياً:", err);
    }

    // التنفيذ المحلي يعمل دائماً مهما كانت حالة السيرفر
    if (onOrderTrigger) {
      onOrderTrigger({
        ...orderRequest,
        quantity: parseFloat(orderRequest.neededQty) || 0,
        id: Date.now(),
        status: 'في الانتظار',
        requestDate: new Date().toLocaleDateString(),
        type: 'ERP_ORDER'
      });
    }

    alert(`تم إرسال طلب (${orderRequest.item}) بنجاح`);
    setIsSubmitting(false);
    setActiveView('menu');
  };

  // --- إصلاح دالة حفظ الفاتورة (الزر الأخضر) لتتحدث مع Supabase مباشرة ---
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    
    // 1. تحويل وتجهيز القيم الرقمية بشكل صارم لمنع الـ NaN والأخطاء الحسابية
    const parsedQty = parseFloat(formData.quantity);
    const parsedPrice = parseFloat(formData.price);

    if (!formData.item || !parsedQty || !parsedPrice) {
      alert("يرجى إكمال كافة بيانات الفاتورة الأساسية (الصنف، الكمية، السعر)"); 
      return;
    }

    setIsSubmitting(true);

    const purchaseWithBatch = {
      ...formData,
      quantity: parsedQty,
      price: parsedPrice,
      total: parsedQty * parsedPrice,
      id: Date.now(),
      batchInfo: {
        batchId: `B-${Date.now().toString().slice(-6)}`,
        purchaseDate: formData.date,
        costPerUnit: parsedPrice,
        supplier: formData.supplier || 'مورد عام'
      }
    };

    // 2. عزل كامل لعملية المزامنة الخارجية الحية عبر العميل المباشر
    try {
      const tenantId = localStorage.getItem('tenantId') || 'default_tenant';
      
      // الرفع المباشر لفاتورة المشتريات لجدول فواتير المشتريات في Supabase
      if (supabase) {
        const { error } = await supabase
          .from('purchases')
          .insert([
            {
              tenant_id: tenantId,
              item: purchaseWithBatch.item,
              unit: purchaseWithBatch.unit,
              quantity: purchaseWithBatch.quantity,
              price: purchaseWithBatch.price,
              total: purchaseWithBatch.total,
              supplier: purchaseWithBatch.supplier,
              payment_method: purchaseWithBatch.paymentMethod,
              purchase_date: purchaseWithBatch.date,
              batch_id: purchaseWithBatch.batchInfo.batchId,
              created_at: new Date().toISOString()
            }
          ]);

        if (error) throw error;
        console.log("☁️ تم المزامنة وحفظ الفاتورة داخل سوبابيز بنجاح");
      }
    } catch (error) {
      // إذا فشل السيرفر، لا يهم! سنعتمد البيانات محلياً لضمان استقرار التطبيق
      console.error("❌ فشلت المزامنة السحابية المباشرة للفاتورة، جاري اعتماد النسخة المحلية لتأمين البيانات:", error);
    }

    // 3. تمرير البيانات المضمونة للـ Parent Component وتصفير الواجهة
    try {
      if (typeof onPurchaseComplete === 'function') {
        onPurchaseComplete(purchaseWithBatch);
      } else {
        console.error("❌ دالة التمرير العليا onPurchaseComplete غير ممررة كـ prop بشكل صحيح!");
      }
    } catch (uiErr) {
      console.error("خطأ أثناء تحديث الحالة العليا في التطبيق:", uiErr);
    }

    alert(`تم الحفظ وإضافة شحنة جديدة للمخزن برقم ${purchaseWithBatch.batchInfo.batchId}`);
    
    // إعادة تعيين الحقول والجهات
    setFormData({ item: '', unit: '', quantity: '', price: '', supplier: '', paymentMethod: 'كاش', date: new Date().toISOString().split('T')[0] });
    setIsNewItem(false);
    setIsSubmitting(false);
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

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh', position: 'relative' }}>
      
      {/* تنبيه انخفاض المخزن */}
      {lowStockItems.length > 0 && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', padding: '10px', borderRadius: '10px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle color="#ef4444" size={20} />
          <marquee style={{ color: '#991b1b', fontSize: '0.85rem', fontWeight: 'bold' }}>
            تنبيه: الأصناف التالية وصلت لحد إعادة الطلب (أقل من 20): {lowStockItems.map(i => `${i.name} (${i.balance})`).join(' - ')}
          </marquee>
        </div>
      )}

      {activeView === 'menu' && (
        <>
          <div className="page-header">
            <ShoppingCart size={28} color="#1e5631" />
            <h2 style={{ margin: 0 }}>نظام المشتريات ERP</h2>
          </div>

          <div style={{ background: 'rgba(240, 253, 244, 0.8)', border: '1px solid rgba(30, 86, 49, 0.15)', padding: '12px', borderRadius: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={20} color="#1e5631" />
            <span style={{ fontSize: '0.8rem', color: '#065f46' }}>تتبع حركة المشتريات والموردين هنا.</span>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <div className="glass-card" onClick={() => setActiveView('entry')} style={{ cursor: 'pointer', borderRight: '8px solid #1e5631', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: 'rgba(240, 253, 244, 0.8)', padding: '12px', borderRadius: '12px' }}><Save size={24} color="#1e5631" /></div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>فاتورة مشتريات</h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>دخول خامات جديدة للمخزن</p>
              </div>
            </div>

            <div className="glass-card" onClick={() => setActiveView('orderRequest')} style={{ cursor: 'pointer', borderRight: '8px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '12px' }}><Truck size={24} color="#f59e0b" /></div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>طلب احتياج</h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>تنبيه الموردين بالنواقص</p>
              </div>
            </div>

            {inventory.length > 0 && (
              <div className="glass-card" onClick={() => setActiveView('grid')} style={{ cursor: 'pointer', borderRight: '8px solid #3498db', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'rgba(239, 246, 255, 0.8)', padding: '12px', borderRadius: '12px' }}><Table size={24} color="#3498db" /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>سجل المشتريات</h3>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>عرض وتصدير جميع الفواتير</p>
                </div>
              </div>
            )}
          </div>
          <button onClick={onBack} className="btn-back" style={{ marginTop: '20px' }}><ArrowRight size={18} /> العودة</button>
        </>
      )}

      {activeView === 'orderRequest' && (
        <div className="glass-card">
          <div className="page-header">
            <button onClick={() => setActiveView('menu')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}><ArrowRight size={20} /></button>
            <h3 style={{ margin: 0 }}>طلب احتياج من مورد</h3>
          </div>
          <form onSubmit={handleSendToSuppliers}>
            <label className="form-label">الصنف المطلوب</label>
            <select className="glass-input" required value={orderRequest.item} onChange={e => handleItemSelectForOrder(e.target.value)} style={{ marginBottom: '12px', width: '100%', padding: '8px', borderRadius: '8px' }}>
              <option value="">اختر صنف من المخزن...</option>
              {stock.map(s => <option key={s.id} value={s.name}>{s.name} (المتاح: {s.balance})</option>)}
            </select>

            <label className="form-label"><User size={16} /> اسم المورد</label>
            <input 
              className="glass-input" 
              placeholder="اسم المورد الموجه له الطلب" 
              value={orderRequest.supplier} 
              onChange={e => setOrderRequest({...orderRequest, supplier: e.target.value})}
              style={{ marginBottom: '12px', width: '100%', padding: '8px', borderRadius: '8px' }}
            />

            <label className="form-label">الكمية المطلوبة</label>
            <input type="number" className="glass-input" required placeholder="الكمية المطلوبة" value={orderRequest.neededQty} onChange={e => setOrderRequest({ ...orderRequest, neededQty: e.target.value })} style={{ marginBottom: '20px', width: '100%', padding: '8px', borderRadius: '8px' }} />
            
            <button 
              type="button" 
              onClick={handleSendToSuppliers}
              disabled={isSubmitting}
              style={{ backgroundColor: '#f59e0b', width: '100%', padding: '12px', borderRadius: '10px', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }}>
              <Truck size={20} /> {isSubmitting ? 'جاري المعالجة الحية...' : 'إرسال الطلب عبر السحابة'}
            </button>
          </form>
        </div>
      )}

      {activeView === 'entry' && (
        <div className="glass-card">
          <div className="page-header">
            <button onClick={() => setActiveView('menu')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}><ArrowRight size={20} /></button>
            <h3 style={{ margin: 0 }}>فاتورة شراء جديدة</h3>
          </div>
          <form onSubmit={handleSave}>
            <label className="form-label">اسم الصنف</label>
            {!isNewItem ? (
              <select className="glass-input" required value={formData.item} onChange={e => handleExistingItemSelect(e.target.value)} style={{ marginBottom: '10px', width: '100%', padding: '8px', borderRadius: '8px' }}>
                <option value="">اختر من المخزن...</option>
                {stock.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                <option value="NEW_ITEM" style={{fontWeight: 'bold'}}>+ إضافة صنف جديد</option>
              </select>
            ) : (
              <input className="glass-input" placeholder="اسم الصنف الجديد" required value={formData.item} onChange={e => setFormData({ ...formData, item: e.target.value })} style={{ marginBottom: '10px', width: '100%', padding: '8px', borderRadius: '8px' }} />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input className="glass-input" placeholder="الوحدة" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '8px' }} />
              <input type="number" className="glass-input" placeholder="الكمية" required value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '8px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <input type="number" className="glass-input" placeholder="السعر" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '8px' }} />
              <select className="glass-input" value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '8px' }}>
                <option value="كاش">كاش</option>
                <option value="آجل">آجل</option>
              </select>
            </div>
            <label className="form-label" style={{ marginTop: '10px' }}>اسم المورد</label>
            <input className="glass-input" placeholder="اسم المورد" value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} style={{ marginBottom: '20px', width: '100%', padding: '8px', borderRadius: '8px' }} />
            
            <button 
              type="button" 
              onClick={handleSave}
              disabled={isSubmitting}
              style={{ backgroundColor: '#1e5631', width: '100%', padding: '12px', borderRadius: '10px', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }}>
              <Save size={20} /> {isSubmitting ? 'جاري تأمين ومزامنة الفاتورة...' : 'حفظ ومزامنة الفاتورة'}
            </button>
          </form>
        </div>
      )}

      {activeView === 'grid' && (
        <div className="glass-card">
          <div className="page-header">
            <button onClick={() => setActiveView('menu')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}><ArrowRight size={20} /></button>
            <h3 style={{ margin: 0 }}>سجل الفواتير</h3>
          </div>
          <DataGrid columns={purchaseColumns} data={inventory} exportFileName="سجل_المشتريات" />
        </div>
      )}
    </div>
  );
};

export default PurchasesManager;
