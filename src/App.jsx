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

// 🚀 تصحيح الاستيراد: المكون الفعلي لإدارة تركيبات فواتير المواد (BOM)
import BomSetupManager from './components/BomSetupManager';

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
        await Preferences.set({ key, value: stringifiedData });
        localStorage.setItem(key, stringifiedData); 
      } catch (error) {
        console.error(`خطأ أثناء الحفظ المحلي للمفتاح ${key}:`, error);
      }
    },
    load: async (key) => {
      try {
        const { value } = await Preferences.get({ key });
        if (value) return JSON.parse(value);
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

  const triggerAndroidNotification = async (title, body) => {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: Math.floor(Math.random() * 100000),
            schedule: { at: new Date(Date.now() + 1000) },
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
        grouped.set(name, {
          ...item,
          id: item.id || item._id || Date.now() + Math.random(),
          name: name,
          balance: balance,
          price: price
        });
      }
    });
    return Array.from(grouped.values());
  };

  // --- دالة المزامنة السحابية الذكية المحدثة ---
  const syncCloudData = async () => {
    try {
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

      const contactsResult = await apiService.getData('contacts');
      if (contactsResult && contactsResult.success && contactsResult.data) {
        const allContacts = contactsResult.data;
        const fetchedCustomers = allContacts.filter(c => c.type === 'customer' || c.type === 'general');
        const fetchedSuppliers = allContacts.filter(s => s.type === 'supplier');
        
        setCustomers(fetchedCustomers);
        setSuppliers(fetchedSuppliers);
        
        await storage.save('customers', fetchedCustomers);
        await storage.save('suppliers', fetchedSuppliers);
        
        triggerAndroidNotification('تحديث النظام', '📥 تم مزامنة بيانات المخازن والعملاء السحابية بنجاح.');
      }
    } catch (apiErr) {
      console.warn("⚠️ لم يتم تحديث السيرفر السحابي, جاري استخدام القاعدة المحلية الاحتياطية:", apiErr.message);
    }
  };

  const handleSaveCustomer = async (newCustomer) => {
    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);
    await storage.save('customers', updatedCustomers);

    try {
      await apiService.createData('contacts', {
        id: newCustomer.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        address: newCustomer.address,
        type: 'customer'
      });
      triggerAndroidNotification('إدارة العملاء', `👥 تم حفظ العميل [${newCustomer.name}] ومزامنته بالسيرفر.`);
      await syncCloudData();
    } catch (err) {
      console.error("تم حفظ العميل محلياً وتأخر الرفع للسيرفر:", err.message);
    }
  };

  const fetchLocalData = useCallback(async () => {
    setIsSyncing(true);
    const savedAuth = await storage.load('is_logged_in');
    if (savedAuth === true) setIsLoggedIn(true);

    const savedSchema = await storage.load('tenant_schema');
    if (savedSchema) setTenantSchema(savedSchema);

    const localStock = await storage.load('stock');
    const localHistory = await storage.load('productionHistory');
    const localCustomers = await storage.load('customers');
    const localSuppliers = await storage.load('suppliers');
    
    if (localStock) setStock(localStock);
    if (localHistory) setProductionHistory(localHistory);
    if (localCustomers) setCustomers(localCustomers);
    if (localSuppliers) setSuppliers(localSuppliers);

    if (savedSchema && savedAuth === true) {
      await syncCloudData();
    }

    setCheckingAuth(false);
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    fetchLocalData();
  }, [fetchLocalData]);

  const stats = useMemo(() => {
    const totalProduction = productionHistory.reduce((s, p) => s + (parseFloat(p.totalActualCost) || 0), 0);
    const totalIncome = productionHistory.length * 1500; 
    const totalExpenses = totalProduction + 500;
    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      stockValue: stock.reduce((s, i) => s + ((parseFloat(i.balance) || 0) * (parseFloat(i.price) || 0)), 0),
      totalItems: stock.length,
      lowStock: stock.filter(i => (parseFloat(i.balance) || 0) < 5).length
    };
  }, [stock, productionHistory]);

  const handleSaveProduction = async (newProduction) => {
    const updatedHistory = [newProduction, ...productionHistory];
    setProductionHistory(updatedHistory);
    await storage.save('productionHistory', updatedHistory);
    await storage.save('stock', stock);

    try {
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
      await apiService.createData('stock', {
        item_name: formattedItem.name,
        quantity: formattedItem.balance,
        price: formattedItem.price,
        barcode: newItem.barcode || ''
      });
      triggerAndroidNotification('المخازن', `📦 تم إضافة وتحديث الصنف [${formattedItem.name}] سحابياً.`);
      await syncCloudData();
    } catch (err) {
      console.error("تم الحفظ محلياً وتأخر ترحيل السيرفر:", err.message);
    }
  };

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

  // --- محرك التوجيه الموحد المحمي بـ تصفية النصوص وفك الارتباك ---
  const renderPage = () => {
    const backToDashboard = () => setActivePage('dashboard');
    
    // 🧠 تأمين قراءة النص الممرر بتحويله لحروف صغيرة ممسوحة الفراغات لضمان المطابقة 100%
    const pageKey = (activePage || '').trim().toLowerCase();

    switch (pageKey) {
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

      // 🚀 جدار حماية الأيقونة الفولاذي: يقوم بالتقاط اسم الملف الصريح والمباشر وفتحه فوراً
      case 'bomsetupmanager':
      case 'recipes': 
      case 'bom':
      case 'product_boms':
        return (
          <BomSetupManager 
            onBack={backToDashboard}
            tenantSchema={tenantSchema}
            stock={stock}
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
            suppliers={suppliers} 
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
            customers={customers} 
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
            customers={customers} 
            onAddCustomer={handleSaveCustomer} 
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
            onRefresh={syncCloudData}
          />
        );
    }
  };

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
      <main style={{ padding: '16px' }}>
        {renderPage()}
      </main>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;
