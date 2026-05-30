import React, { useState } from 'react';
import { Package, Truck, Calendar, Hash, DollarSign, ArrowRight, Save, ShoppingCart, Bell, Table, AlertTriangle, User } from 'lucide-react';
import DataGrid from './DataGrid';

// 🔥 استيراد ملف الخدمة المركزي الموحد بالروابط والمسارات الخاصة بك
import { apiService } from '../services/apiService';

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

  // 🛡️ ميكانيزم استخراج وتحويل اسم الشركة لحروف صغيرة إجبارياً لمنع ارتداد الكاش
  const getCleanTenantSchema = () => {
    const rawSchema = tenantSchema || 
                      localStorage.getItem('tenant_schema') || 
                      localStorage.getItem('tenantId') || 
                      localStorage.getItem('tenant_id');

    if (!rawSchema || rawSchema === 'public') {
      console.error("❌ خطأ حرج في الواجهة: لم يتم العثور على معرف شركة معزول!");
      return 'tenant_1780023145536'; 
    }

    // إجبار الحروف الصغيرة (Lowercase) لمنع تعارض الـ Postgres
    const clean = rawSchema.startsWith('tenant_') ? rawSchema : `tenant_${rawSchema}`;
    return clean.trim().toLowerCase();
  };

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

  // --- 🚀 دالة إرسال طلب الاحتياج المعيارية ---
  const handleSendToSuppliers = async (e) => {
    if (e) e.preventDefault();
    if (!orderRequest.item || !orderRequest.neededQty) {
      alert("يرجى ملء بيانات طلب الاحتياج أولاً");
      return;
    }

    setIsSubmitting(true);

    try {
      // 🚀 استدعاء رابط الحفظ والترحيل (POST) من خلال ملف الخدمة الموحد لـ api/erp/mutate
      const response = await apiService.createData('purchase_request', {
        invoice_number: `REQ-${Date.now().toString().slice(-6)}`,
        invoice_type: 'purchase_request',
        description: `طلب نواقص صنف: ${orderRequest.item} - المورد: ${orderRequest.supplier || 'عام'}`,
        gross_amount: 0,
        net_amount: 0,
        paid_amount: 0,
        items: [
          {
            item_id: Date.now().toString().slice(-4), 
            name: orderRequest.item,
            quantity: parseFloat(orderRequest.neededQty) || 0,
            unit_price: 0
          }
        ]
      });

      console.log('☁️ نتيجة مزامنة طلب الاحتياج عبر الخدمة الذكية:', response);
      
    } catch (err) {
      console.warn("☁️ خطأ في الشبكة السحابية للشركة:", err.message);
    }

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

    alert(`تم إرسال طلب (${orderRequest.item}) بنجاح داخل نظام المؤسسة`);
    setIsSubmitting(false);
    setActiveView('menu');
  };

  // --- 🟢 دالة حفظ الفاتورة بالهيكل القياسي لـ Supabase (المدخلات الموحدة) ---
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    
    const parsedQty = parseFloat(formData.quantity);
    const parsedPrice = parseFloat(formData.price);

    if (!formData.item || !parsedQty || !parsedPrice) {
      alert("يرجى إكمال كافة بيانات الفاتورة الأساسية"); 
      return;
    }

    setIsSubmitting(true);
    const batchId = `B-${Date.now().toString().slice(-6)}`;
    const totalAmount = parsedQty * parsedPrice;

    try {
      // 🚀 استدعاء رابط الحفظ والترحيل (POST) من خلال ملف الخدمة الموحد لـ api/erp/mutate لجدول المشتريات
      const response = await apiService.createData('purchase', {
        invoice_number: batchId,
        invoice_type: 'purchase',
        contact_id: 1, 
        account_id: 1, 
        contact_name: formData.supplier || 'مورد عام افتراضي',
        gross_amount: totalAmount,
        discount: 0,
        tax_amount: 0,
        net_amount: totalAmount,
        paid_amount: formData.paymentMethod === 'كاش' ? totalAmount : 0,
        description: `فاتورة مشتريات خامات صنف [${formData.item}] بالوحدة [${formData.unit || 'قطعة'}]`,
        items: [
          {
            item_id: isNewItem ? Math.floor(1000 + Math.random() * 9000) : 1, 
            name: formData.item,
            barcode: `BAR-${batchId}`,
            quantity: parsedQty,
            unit_price: parsedPrice
          }
        ]
      });

      console.log('☁️ نتيجة التسكين وبناء العلاقات عبر الخدمة الذكية:', response);

      alert(`تم التسكين بنجاح في مخزن الشركة برقم شحنة ${batchId}`);
      
      // 🔄 إرسال وتوزيع البيانات إلى كود المكون الأب الرئيسي App.jsx لتحديث الواجهة فورياً
      if (typeof onPurchaseComplete === 'function') {
        onPurchaseComplete({
          ...formData,
          name: formData.item, // توحيد الحقل مع الهيكل البرمجي للأصناف
          balance: parsedQty,
          quantity: parsedQty,
          price: parsedPrice,
          total: totalAmount,
          id: Date.now()
        });
      }

      // تصفير الواجهة بعد النجاح
      setFormData({ item: '', unit: '', quantity: '', price: '', supplier: '', paymentMethod: 'كاش', date: new Date().toISOString().split('T')[0] });
      setIsNewItem(false);
      setActiveView('menu');

    } catch (error) {
      console.error("❌ فشل التسكين المباشر للفاتورة:", error);
      alert(`عفواً، فشل حفظ الفاتورة سحابياً: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
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
      
      {lowStockItems.length > 0 && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', padding: '10px', borderRadius: '10px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle color="#ef4444" size={20} />
          <marquee style={{ color: '#991b1b', fontSize: '0.85rem', fontWeight: 'bold' }}>
            تنبيه: الأصناف التالية وصلت لحد إعادة الطلب: {lowStockItems.map(i => `${i.name} (${i.balance})`).join(' - ')}
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
            <span style={{ fontSize: '0.8rem', color: '#065f46' }}>نظام معزول ومخصص لمعرف الشركة الحالي: {getCleanTenantSchema()}</span>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <div className="glass-card" onClick={() => setActiveView('entry')} style={{ cursor: 'pointer', borderRight: '8px solid #1e5631', display: 'flex', alignItems: 'center', gap: '15px', background: '#fff', padding: '15px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ background: 'rgba(240, 253, 244, 0.8)', padding: '12px', borderRadius: '12px' }}><Save size={24} color="#1e5631" /></div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>فاتورة مشتريات</h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>دخول خامات جديدة للمخزن المعزول</p>
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
              <Truck size={20} /> {isSubmitting ? 'جاري معالجة المدخلات السحابية...' : 'إرسال الطلب عبر السحابة الموحدة'}
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
              <Save size={20} /> {isSubmitting ? 'جاري ترحيل وحفر الفاتورة بـ Vercel...' : 'حفظ ومزامنة الفاتورة سحابياً'}
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
