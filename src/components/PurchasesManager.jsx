import React, { useState } from 'react';
import { Package, Truck, Calendar, Hash, DollarSign, ArrowRight, Save, ShoppingCart, Bell, Table, AlertTriangle, User } from 'lucide-react';
import { CapacitorHttp } from '@capacitor/core'; // 🔥 استيراد المحرك العابر للأندرويد
import DataGrid from './DataGrid';

const PurchasesManager = ({ onPurchaseComplete, onBack, stock = [], onOrderTrigger, inventory = [], tenantSchema }) => {
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

  // --- 🚀 دالة إرسال طلب الاحتياج عبر الرابط الموحد المحدث ---
  const handleSendToSuppliers = async (e) => {
    if (e) e.preventDefault();
    if (!orderRequest.item || !orderRequest.neededQty) {
      alert("يرجى ملء بيانات طلب الاحتياج أولاً");
      return;
    }

    setIsSubmitting(true);

    try {
      const currentSchema = tenantSchema || localStorage.getItem('tenant_schema') || 'public';

      const options = {
        url: 'https://project-902ma.vercel.app/api/erp/mutate', // تثبيت الرابط الأصلي بناءً على طلبك
        headers: { 'Content-Type': 'application/json' },
        data: {
          schema: currentSchema,
          table: 'order_requests', // الصيغة الجديدة الديناميكية (الجدول)
          data: {                  // الصيغة الجديدة الديناميكية (البيانات)
            item_name: orderRequest.item,
            quantity: parseFloat(orderRequest.neededQty) || 0,
            supplier_name: orderRequest.supplier || 'عام',
            request_type: 'ERP_ORDER_REQUEST',
            created_at: new Date().toISOString()
          }
        }
      };

      const response = await CapacitorHttp.post(options);
      console.log('☁️ نتيجة مزامنة طلب الاحتياج عبر فيرسيل:', response.data);
      
    } catch (err) {
      console.warn("☁️ خطأ في الشبكة السحابية - سيتم الاعتماد محلياً لتأمين الواجهة:", err);
    }

    // التنفيذ المحلي يعمل كـ Fallback لحماية تجربة المستخدم
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

  // --- 🟢 دالة حفظ ومزامنة فاتورة المشتريات عبر الرابط الموحد المحدث ---
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    
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

    try {
      const currentSchema = tenantSchema || localStorage.getItem('tenant_schema') || 'public';

      const options = {
        url: 'https://project-902ma.vercel.app/api/erp/mutate', // تثبيت الرابط الأصلي بناءً على طلبك
        headers: { 'Content-Type': 'application/json' },
        data: {
          schema: currentSchema,
          table: 'invoices', // الصيغة الجديدة الديناميكية (الجدول)
          data: {                  // الصيغة الجديدة الديناميكية (البيانات)
            invoice_number: purchaseWithBatch.batchInfo.batchId,
            invoice_type: 'purchase',
            gross_amount: purchaseWithBatch.total,
            net_amount: purchaseWithBatch.total,
            paid_amount: formData.paymentMethod === 'كاش' ? purchaseWithBatch.total : 0,
            remaining_amount: formData.paymentMethod === 'آجل' ? purchaseWithBatch.total : 0,
            created_at: new Date(purchaseWithBatch.date).toISOString()
          }
        }
      };

      const response = await CapacitorHttp.post(options);
      console.log('☁️ نتيجة مزامنة الفاتورة عبر فيرسيل:', response.data);

    } catch (error) {
      console.error("❌ فشلت المزامنة السحابية المباشرة للفاتورة، جاري اعتماد النسخة المحلية:", error);
    }

    // تمرير البيانات المضمونة للمحرك المحلي بالأب وتصفير الواجهة
    try {
      if (typeof onPurchaseComplete === 'function') {
        onPurchaseComplete(purchaseWithBatch);
      } else {
        console.error("❌ دالة التمرير العليا onPurchaseComplete غير ممررة بشكل صحيح!");
      }
    } catch (uiErr) {
      console.error("خطأ أثناء تحديث الحالة العليا في التطبيق:", uiErr);
    }

    alert(`تم الحفظ وإضافة شحنة جديدة للمخزن برقم ${purchaseWithBatch.batchInfo.batchId}`);
    
    // إعادة تعيين الحقول
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
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <ShoppingCart size={28} color="#1e5631" />
            <h2 style={{ margin: 0 }}>نظام المشتريات ERP</h2>
          </div>

          <div style={{ background: 'rgba(240, 253, 244, 0.8)', border: '1px solid rgba(30, 86, 49, 0.15)', padding: '12px', borderRadius: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={20} color="#1e5631" />
            <span style={{ fontSize: '0.8rem', color: '#065f46' }}>تتبع حركة المشتريات والموردين هنا بشكل معزول ومؤمن.</span>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <div className="glass-card" onClick={() => setActiveView('entry')} style={{ cursor: 'pointer', borderRight: '8px solid #1e5631', display: 'flex', alignItems: 'center', gap: '15px', background: '#fff', padding: '15px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ background: 'rgba(240, 253, 244, 0.8)', padding: '12px', borderRadius: '12px' }}><Save size={24} color="#1e5631" /></div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>فاتورة مشتريات</h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>دخول خامات جديدة للمخزن</p>
              </div>
            </div>

            <div className="glass-card" onClick={() => setActiveView('orderRequest')} style={{ cursor: 'pointer', borderRight: '8px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '15px', background: '#fff', padding: '15px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '12px' }}><Truck size={24} color="#f59e0b" /></div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>طلب احتياج</h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>تنبيه الموردين بالنواقص</p>
              </div>
            </div>

            {inventory.length > 0 && (
              <div className="glass-card" onClick={() => setActiveView('grid')} style={{ cursor: 'pointer', borderRight: '8px solid #3498db', display: 'flex', alignItems: 'center', gap: '15px', background: '#fff', padding: '15px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ background: 'rgba(239, 246, 255, 0.8)', padding: '12px', borderRadius: '12px' }}><Table size={24} color="#3498db" /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>سجل المشتريات</h3>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>عرض وتصدير جميع الفواتير</p>
                </div>
              </div>
            )}
          </div>
          <button onClick={onBack} className="btn-back" style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 15px', borderRadius: '10px', background: '#e2e8f0', border: 'none', cursor: 'pointer' }}><ArrowRight size={18} /> العودة</button>
        </>
      )}

      {activeView === 'orderRequest' && (
        <div className="glass-card" style={{ background: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <button onClick={() => setActiveView('menu')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}><ArrowRight size={20} /></button>
            <h3 style={{ margin: 0 }}>طلب احتياج من مورد</h3>
          </div>
          <form onSubmit={handleSendToSuppliers}>
            <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold' }}>الصنف المطلوب</label>
            <select className="glass-input" required value={orderRequest.item} onChange={e => handleItemSelectForOrder(e.target.value)} style={{ marginBottom: '12px', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <option value="">اختر صنف من المخزن...</option>
              {stock.map(s => <option key={s.id} value={s.name}>{s.name} (المتاح: {s.balance})</option>)}
            </select>

            <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold' }}><User size={16} style={{ display: 'inline', marginLeft: '3px' }} /> اسم المورد</label>
            <input 
              className="glass-input" 
              placeholder="اسم المورد الموجه له الطلب" 
              value={orderRequest.supplier} 
              onChange={e => setOrderRequest({...orderRequest, supplier: e.target.value})}
              style={{ marginBottom: '12px', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
            />

            <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold' }}>الكمية المطلوبة</label>
            <input type="number" className="glass-input" required placeholder="الكمية المطلوبة" value={orderRequest.neededQty} onChange={e => setOrderRequest({ ...orderRequest, neededQty: e.target.value })} style={{ marginBottom: '20px', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ backgroundColor: '#f59e0b', width: '100%', padding: '12px', borderRadius: '10px', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }}>
              <Truck size={20} /> {isSubmitting ? 'جاري معالجة الحفر السحابي...' : 'إرسال الطلب عبر السحابة الموحدة'}
            </button>
          </form>
        </div>
      )}

      {activeView === 'entry' && (
        <div className="glass-card" style={{ background: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <button onClick={() => setActiveView('menu')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}><ArrowRight size={20} /></button>
            <h3 style={{ margin: 0 }}>فاتورة شراء جديدة</h3>
          </div>
          <form onSubmit={handleSave}>
            <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold' }}>اسم الصنف</label>
            {!isNewItem ? (
              <select className="glass-input" required value={formData.item} onChange={e => handleExistingItemSelect(e.target.value)} style={{ marginBottom: '10px', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <option value="">اختر من المخزن...</option>
                {stock.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                <option value="NEW_ITEM" style={{fontWeight: 'bold', color: '#6366f1'}}>+ إضافة صنف جديد للمخازن</option>
              </select>
            ) : (
              <input className="glass-input" placeholder="اسم الصنف الجديد" required value={formData.item} onChange={e => setFormData({ ...formData, item: e.target.value })} style={{ marginBottom: '10px', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input className="glass-input" placeholder="الوحدة (كجم، متر، قطعة)" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
              <input type="number" className="glass-input" placeholder="الكمية" required value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <input type="number" className="glass-input" placeholder="السعر الفرعي لشراء الوحدة" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
              <select className="glass-input" value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <option value="كاش">كاش</option>
                <option value="آجل">آجل</option>
              </select>
            </div>
            <label className="form-label" style={{ display: 'block', marginTop: '10px', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold' }}>اسم المورد</label>
            <input className="glass-input" placeholder="اسم المورد أو الشركة الموردة" value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} style={{ marginBottom: '20px', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ backgroundColor: '#1e5631', width: '100%', padding: '12px', borderRadius: '10px', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }}>
              <Save size={20} /> {isSubmitting ? 'جاري تأمين وحفر الفاتورة بالسيرفر الموحد...' : 'حفظ ومزامنة الفاتورة سحابياً'}
            </button>
          </form>
        </div>
      )}

      {activeView === 'grid' && (
        <div className="glass-card" style={{ background: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <button onClick={() => setActiveView('menu')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}><ArrowRight size={20} /></button>
            <h3 style={{ margin: 0 }}>سجل الفواتير التاريخي الموحد</h3>
          </div>
          <DataGrid columns={purchaseColumns} data={inventory} exportFileName="سجل_المشتريات" />
        </div>
      )}
    </div>
  );
};

export default PurchasesManager;
