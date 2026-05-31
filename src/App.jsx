import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { App as AppLauncher } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications'; // 🔔 محرك إشعارات الأندرويد الفولاذي
import Swal from 'sweetalert2';

// 🚀 استيراد أدوات مكتبة React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 🔥 استيراد ملف الخدمة المركزي الموحد بالروابط الخاصة بك
import { apiService } from './services/apiService';

// 🚀 استيراد كود ملف خدمة التنقل وإدارة أزرار الهاتف
import { navigationService } from './services/navigationService';

// --- استيراد كافة المكونات الحقيقية للنظام من مجلد components ---
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import ProductionManager from './components/ProductionManager';
import PurchasesManager from './components/PurchasesManager';
import Sales from './components/Sales';
import Waste from './components/Waste';
import Expenses from './components/Expenses';
import Suppliers from './components/Suppliers';
import Financials from './components/Financials';
import Reports from './components/Reports';
import Customers from './components/Customers';
import StaffManagement from './components/StaffManagement';
import Settings from './components/Settings';

// ⚙️ إنشاء كائن الـ Query Client المركزي وإعداده لبيئة الهاتف
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // البيانات تعتبر طازجة لمدة 5 دقائق داخل الكاش
      refetchOnWindowFocus: false, // منع إعادة الجلب عند فتح وغلق الشاشات في الأندرويد لثبات الأداء
    },
  },
});

const AppContent = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [stock, setStock] = useState([]);
  const [productionHistory, setProductionHistory] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // ⚙️ إضافة الحالات البرمجية لإدارة وتخزين العملاء والموردين المزامنة سحابياً
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // 🔥 إضافة المتغير السحري الخاص برقم الشركة (السكيما) المتصل بالـ API
  const [tenantSchema, setTenantSchema] = useState('public');

  // 🛡️ حالات التحكم بالمرور والبقاء داخل التطبيق لضمان عدم الخروج التلقائي
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // --- المحرك المحلي الفولاذي والأكثر استقراراً (Offline-First Engine) ---
  const storage = {
    save: async (key, data) => {
      try {
        const stringifiedData = JSON.stringify(data);
        // التخزين الأصلي والأكثر أماناً داخل SharedPreferences للأندرويد
        await Preferences.set({ key, value: stringifiedData });
        // نسخة احتياطية إضافية للويب والمتصفح لحماية مزدوجة
        localStorage.setItem(key, stringifiedData); 
      } catch (error) {
        console.error(`خطأ أثناء الحفظ المحلي للمفتاح ${key}:`, error);
      }
    },
    load: async (key) => {
      try {
        // المحاولة الأولى: جلب البيانات المستقرة من Preferences
        const { value } = await Preferences.get({ key });
        if (value) return JSON.parse(value);
        
        // المحاولة الثانية (Fallback): إذا لم توجد، نجلبها من localStorage
        const localValue = localStorage.getItem(key);
        return localValue ? JSON.parse(localValue) : null;
      } catch (e) {
        console.error(`خطأ أثناء قراءة البيانات للمفتاح ${key}:`, e);
        return null;
      }
    }
  };

  // 🔔 محرك طلب تصريح وتشغيل إشعارات الأندرويد
  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
      } catch (err) {
        console.error('خطأ أثناء طلب تصريح الإشعارات:', err);
      }
    };
    requestNotificationPermission();
  }, []);

  // دالة إرسال إشعار أندرويد سريع ونظيف
  const triggerAndroidNotification = async (title, body) => {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: Math.floor(Math.random() * 100000),
            schedule: { at: new Date(Date.now() + 1000) }, // يظهر بعد ثانية واحدة فوراً
            sound: 'default',
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } catch (err) {
      console.warn('فشل إرسال الإشعار للنظام:', err);
    }
  };

  // --- ميزة تفعيل أزرار الهاتف للرجوع مدمجة مع ملف الخدمة المخصص ---
  useEffect(() => {
    navigationService.initBackButton(activePage, setActivePage);
    
    return () => { 
      navigationService.destroy(); 
    };
  }, [activePage]);

  // --- دالة تجميع الأصناف ومنع التكرار ---
  const groupItems = (items) => {
    const grouped = new Map();
    items.forEach(item => {
      const name = (item.name || item.item_name || item.item || "صنف غير مسمى").trim();
      const balance = parseFloat(item.balance || item.quantity || 0);
      const price = parseFloat(item.price || 0);

      if (grouped.has(name)) {
        const existing = grouped.get(name);
        existing.balance += balance;
        if (price > 0) existing.price = price; 
      } else {
        groupNode(grouped, name, item, balance, price);
      }
    });
    return Array.from(grouped.values());
  };

  // دالة مساعدة معزولة لمنع تكرار الهياكل البرمجية
  const groupNode = (map, name, item, balance, price) => {
    map.set(name, {
      ...item,
      id: item.id || item._id || Date.now() + Math.random(),
      name: name,
      balance: balance,
      price: price
    });
  };

  // --- دالة المزامنة السحابية الذكية المحدثة (سحب المخزن والجهات وتحديث الواجهة) ---
  const syncCloudData = async () => {
    try {
      // 🚀 1. سحب البيانات السحابية الحية لجدول الـ stock باستخدام الرابط المخصص الموحد
      const cloudResult = await apiService.getData('stock');
      if (cloudResult && cloudResult.success && cloudResult.data) {
        const cloudStock = cloudResult.data.map(item => ({
          ...item,
          name: item.item_name || item.name,
          balance: parseFloat(item.quantity || item.balance || 0),
          price: parseFloat(item.price || 0)
        }));
        const finalizedStock = groupItems(cloudStock);
        setStock(finalizedStock);
        await storage.save('stock', finalizedStock);
      }

      // 📥 2. جلب بيانات جدول الجهات (contacts) الموحد وتوزيعها على العملاء والموردين
      const contactsResult = await apiService.getData('contacts');
      if (contactsResult && contactsResult.success && contactsResult.data) {
        const allContacts = contactsResult.data;
        
        // فرز العملاء والموردين بناءً على حقل النوع (type) المحاسبي القياسي لقواعد ERP
        const fetchedCustomers = allContacts.filter(c => c.type === 'customer' || c.type === 'general');
        const fetchedSuppliers = allContacts.filter(s => s.type === 'supplier');
        
        setCustomers(fetchedCustomers);
        setSuppliers(fetchedSuppliers);
        
        await storage.save('customers', fetchedCustomers);
        await storage.save('suppliers', fetchedSuppliers);
        
        triggerAndroidNotification('تحديث النظام', '📥 تم مزامنة بيانات المخازن والعملاء السحابية بنجاح.');
      }
    } catch (apiErr) {
      console.warn("⚠️ لم يتم تحديث السيرفر السحابي، جاري استخدام القاعدة المحلية الاحتياطية:", apiErr.message);
    }
  };

  // --- دالة حفظ وإضافة العملاء سحابياً وتحديث الحالة الفورية لقائمة الاختيار ---
  const handleSaveCustomer = async (newCustomer) => {
    // تحديث الواجهة محلياً فوراً لمنع بطء التجاوب على الهاتف
    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);
    await storage.save('customers', updatedCustomers);

    try {
      // ترحيل العميل لجدول الحسابات الموحد بقاعدة البيانات السحابية بنوع customer
      await apiService.createData('contacts', {
        id: newCustomer.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        address: newCustomer.address,
        type: 'customer'
      });
      triggerAndroidNotification('إدارة العملاء', `👥 تم حفظ العميل [${newCustomer.name}] ومزامنته بالسيرفر.`);
      await syncCloudData(); // إعادة جلب للتأكد التام من مطابقة الواجهات
    } catch (err) {
      console.error("تم حفظ العميل محلياً وتأخر الرفع للسيرفر:", err.message);
    }
  };

  // --- مزامنة وإدارة البيانات السريعة وسحب رقم الشركة ---
  const fetchLocalData = useCallback(async () => {
    setIsSyncing(true);
    
    // 🛡️ فحص ذكي مسبق لحالة تسجيل الدخول للحفاظ على بقاء المستخدم دائماً داخلياً
    const savedAuth = await storage.load('is_logged_in');
    if (savedAuth === true) {
      setIsLoggedIn(true);
    }

    // 🔥 جلب رقم السكيما المخزن محلياً باسم 'tenant_schema' وتحديث الـ State
    const savedSchema = await storage.load('tenant_schema');
    if (savedSchema) {
      setTenantSchema(savedSchema);
    }

    const localStock = await storage.load('stock');
    const localHistory = await storage.load('productionHistory');
    const localCustomers = await storage.load('customers');
    const localSuppliers = await storage.load('suppliers');
    
    if (localStock) setStock(localStock);
    if (localHistory) setProductionHistory(localHistory);
    if (localCustomers) setCustomers(localCustomers);
    if (localSuppliers) setSuppliers(localSuppliers);

    // 🚀 بدء المزامنة الخلفية للسيرفر لضمان جلب آخر تعديلات
    if (savedSchema && savedAuth === true) {
      await syncCloudData();
    }

    setCheckingAuth(false);
    setIsSyncing(false);
  }, []);

  // --- دالة مصاحبة لاستكمال وحفظ تسجيل الدخول لربطها بصفحة التسجيل لديك ---
  const handleLoginSuccess = async (schema) => {
    setTenantSchema(schema);
    setIsLoggedIn(true);
    await storage.save('is_logged_in', true);
    await storage.save('tenant_schema', schema);
    await syncCloudData();
    triggerAndroidNotification('أهلاً بك', '🔐 تم تسجيل الدخول واستعادة السكيما المعزولة.');
    setActivePage('dashboard');
  };

  // --- دالة حفظ الإنتاج وتحديث المخزن التلقائي ---
  const handleSaveProduction = async (newProduction) => {
    const updatedHistory = [newProduction, ...productionHistory];
    setProductionHistory(updatedHistory);
    await storage.save('productionHistory', updatedHistory);
    await storage.save('stock', stock);

    try {
      // 🚀 ترحيل سجل الإنتاج آلياً لسيرفر الفيرسل المركزي بجدول المزامنة الموحد
      await apiService.createData('production_history', {
        production_id: newProduction.id,
        total_actual_cost: parseFloat(newProduction.totalActualCost || 0),
        details: JSON.stringify(newProduction)
      });
      triggerAndroidNotification('إدارة الإنتاج', '🏭 تم ترحيل حركة التشغيل والإنتاج الحالية بنجاح.');
    } catch (err) {
      console.error("فشل المزامنة اللحظية لعملية الإنتاج:", err.message);
    }

    Swal.fire('تم الحفظ', 'تم تسجيل الإنتاج وتحديث المخزن بنجاح', 'success');
  };

  // --- دالة حفظ مدخلات المخزن الجديدة وترحيلها للقاعدة السحابية ---
  const handleSaveInventory = async (newItem) => {
    const formattedItem = {
      ...newItem,
      name: newItem.name || newItem.item_name || newItem.item,
      balance: parseFloat(newItem.balance || newItem.quantity || 0),
      price: parseFloat(newItem.price || 0)
    };

    const updatedStock = groupItems([...stock, formattedItem]);
    setStock(updatedStock);
    await storage.save('stock', updatedStock);

    try {
      // 🚀 ترحيل وحفظ الصنف الجديد مباشرة في جدول stock بقاعدة بيانات نيون السحابية
      await apiService.createData('stock', {
        item_name: formattedItem.name,
        quantity: formattedItem.balance,
        price: formattedItem.price,
        barcode: newItem.barcode || ''
      });
      
      triggerAndroidNotification('المخازن', `📦 تم إضافة وتحديث الصنف [${formattedItem.name}] سحابياً.`);
      // إعادة تحديث الواجهة للتأكد من المزامنة
      await syncCloudData();
    } catch (err) {
      console.error("تم الحفظ محلياً وتأخر ترحيل السيرفر:", err.message);
    }
  };

  // --- دالة الحذف اللحظية الموحدة ---
  const handleDelete = async (id, type) => {
    if (type === 'stock') {
      const updatedStock = stock.filter(item => (item.id !== id && item._id !== id));
      setStock(updatedStock);
      await storage.save('stock', updatedStock);
    } else {
      const updatedHistory = productionHistory.filter(item => (item.id !== id && item._id !== id));
      setProductionHistory(updatedHistory);
      await storage.save('productionHistory', updatedHistory);
    }
    triggerAndroidNotification('تعديل السجلات', '🗑️ تم إزالة العنصر المحدّد من القواعد المحلية.');
    Swal.fire('تم الحذف', 'تم إزالة العنصر من السجلات المحلية الموحدة', 'success');
  };

  useEffect(() => {
    fetchLocalData();
  }, [fetchLocalData]);

  // --- الحسابات المالية الموحدة للداشبورد والتقارير ---
  const stats = useMemo(() => {
    const totalProduction = productionHistory.reduce((s, p) => s + (parseFloat(p.totalActualCost) || 0), 0);
    const totalIncome = productionHistory.length * 1500; 
    const totalExpenses = totalProduction + 500;
    return {
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      netProfit: totalIncome - totalExpenses,
      stockValue: stock.reduce((s, i) => s + ((parseFloat(i.balance) || 0) * (parseFloat(i.price) || 0)), 0),
      totalItems: stock.length,
      lowStock: stock.filter(i => (parseFloat(i.balance) || 0) < 5).length
    };
  }, [stock, productionHistory]);

  // --- محرك التوجيه الموحد لإرسال واستلام البيانات من وإلى جميع الأقسام بنسبة 100% ---
  const renderPage = () => {
    const backToDashboard = () => setActivePage('dashboard');

    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard 
            setActivePage={setActivePage} 
            productionData={productionHistory} 
            stock={stock} 
            stats={stats}
            onDeleteItem={handleDelete}
            tenantSchema={tenantSchema}
            onRefresh={syncCloudData}
          />
        );
      case 'inventory':
        return (
          <Inventory 
            onBack={backToDashboard} 
            stock={stock} 
            setStock={setStock} 
            onDeleteItem={handleDelete}
            onInventoryEntry={handleSaveInventory} 
            tenantSchema={tenantSchema}
            stockData={stock} 
            loading={isSyncing} 
            onRefresh={syncCloudData} 
          />
        );
      case 'production':
        return (
          <ProductionManager 
            onBack={backToDashboard} 
            stock={stock} 
            setStock={setStock} 
            onSaveProduction={handleSaveProduction} 
            tenantSchema={tenantSchema}
            productionHistory={productionHistory}
            stats={stats}
            onRefresh={syncCloudData}
          />
        );
      case 'purchases':
        return (
          <PurchasesManager 
            onBack={backToDashboard} 
            stock={stock} 
            setStock={setStock} 
            tenantSchema={tenantSchema} 
            stats={stats}
            suppliers={suppliers} // تمرير الموردين المزامنين سحابياً لشاشة المشتريات
            onPurchaseComplete={syncCloudData} 
          />
        );
      case 'sales':
        return (
          <Sales 
            onBack={backToDashboard} 
            stock={stock} 
            setStock={setStock} 
            stats={stats} 
            tenantSchema={tenantSchema} 
            customers={customers} // تمرير العملاء المزامنين سحابياً لشاشة فواتير المبيعات
            onSalesComplete={syncCloudData}
          />
        );
      case 'waste':
        return (
          <Waste 
            onBack={backToDashboard} 
            stock={stock} 
            setStock={setStock} 
            onDeleteItem={handleDelete} 
            tenantSchema={tenantSchema}
            stats={stats}
          />
        );
      case 'expenses':
        return (
          <Expenses 
            onBack={backToDashboard} 
            stats={stats} 
            tenantSchema={tenantSchema} 
            onRefresh={syncCloudData}
          />
        );
      case 'suppliers':
        return (
          <Suppliers 
            onBack={backToDashboard} 
            tenantSchema={tenantSchema} 
            stats={stats}
            stock={stock}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
          />
        );
      case 'financials':
        return (
          <Financials 
            onBack={backToDashboard} 
            stats={stats} 
            productionHistory={productionHistory} 
            tenantSchema={tenantSchema} 
            stock={stock}
          />
        );
      case 'reports':
        return (
          <Reports 
            onBack={backToDashboard} 
            productionHistory={productionHistory} 
            stock={stock} 
            stats={stats} 
            tenantSchema={tenantSchema} 
          />
        );
      case 'customers':
        return (
          <Customers 
            onBack={backToDashboard} 
            tenantSchema={tenantSchema} 
            stats={stats}
            customers={customers} // جلب وعرض بيانات العملاء من قاعدة البيانات السحابية الحية
            onAddCustomer={handleSaveCustomer} // تمرير دالة الحفظ السحابي وتحديث الـ State
          />
        );
      case 'staff':
        return (
          <StaffManagement 
            onBack={backToDashboard} 
            tenantSchema={tenantSchema} 
            stats={stats}
          />
        );
      case 'settings':
        return (
          <Settings 
            onBack={backToDashboard} 
            fetchLocalData={fetchLocalData} 
            stock={stock} 
            productionHistory={productionHistory} 
            tenantSchema={tenantSchema} 
            setTenantSchema={setTenantSchema} 
            storage={storage} 
            setIsLoggedIn={setIsLoggedIn} 
            stats={stats}
          />
        );
      default:
        return (
          <Dashboard 
            setActivePage={setActivePage} 
            productionData={productionHistory} 
            stock={stock} 
            stats={stats}
            onDeleteItem={handleDelete}
            tenantSchema={tenantSchema}
          />
        );
    }
  };

  // 🛡️ جدار حماية لمنع وميض الشاشة وضمان جلب حالة الجلسة المحفوظة أولاً قبل البناء
  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Tajawal, sans-serif', backgroundColor: '#f4f7fe', color: '#6366f1', fontWeight: 'bold' }}>
        🔄 جاري تهيئة محرك التوجيه الفولاذي الموحد...
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', backgroundColor: '#f4f7fe', fontFamily: 'Tajawal, sans-serif' }}>
      {isSyncing && (
        <div style={{ position: 'fixed', top: 10, left: 10, zIndex: 1000, fontSize: '10px', color: '#2563eb', background: '#fff', padding: '2px 8px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          🔄 جاري مزامنة المحرك...
        </div>
      )}

      <main style={{ padding: '16px', paddingBottom: '100px' }}>
        {renderPage()}
      </main>

      {/* شريط التحكم السفلي الثابت الزجاجي */}
      <nav style={{
        position: 'fixed', bottom: '15px', left: '15px', right: '15px',
        height: '70px', backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(15px)', borderRadius: '25px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)', border: '1px solid rgba(255,255,255,0.4)',
        zIndex: 1000
      }}>
        <NavButton active={activePage === 'dashboard'} icon="📊" label="الرئيسية" onClick={() => setActivePage('dashboard')} />
        <NavButton active={activePage === 'production'} icon="🏭" label="الإنتاج" onClick={() => setActivePage('production')} />
        <NavButton active={activePage === 'inventory'} icon="📦" label="المخزن" onClick={() => setActivePage('inventory')} />
      </nav>
    </div>
  );
};

const NavButton = ({ active, icon, label, onClick, color }) => (
  <button onClick={onClick} style={{
    border: 'none', background: 'none', display: 'flex', flexDirection: 'column',
    alignItems: 'center', color: color || (active ? '#6366f1' : '#94a3b8'), transition: '0.3s', cursor: 'pointer'
  }}>
    <span style={{ fontSize: '20px', marginBottom: '2px' }}>{icon}</span>
    <span style={{ fontSize: '11px', fontWeight: active ? 'bold' : '500' }}>{label}</span>
  </button>
);

// 📦 المكون المصدّر الرئيسي المحمي بمزود تيار البيانات المركزي لـ React Query
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;
