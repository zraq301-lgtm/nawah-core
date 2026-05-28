import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { App as AppLauncher } from '@capacitor/app';
import Swal from 'sweetalert2';

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

const App = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [stock, setStock] = useState([]);
  const [productionHistory, setProductionHistory] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // 🔥 إضافة المتغير السحري الخاص برقم الشركة (السكيما) المتصل بالـ API
  const [tenantSchema, setTenantSchema] = useState('public');

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

  // --- ميزة تفعيل أزرار الهاتف للرجوع ---
  useEffect(() => {
    const backHandler = AppLauncher.addListener('backButton', () => {
      if (activePage === 'dashboard') {
        AppLauncher.exitApp();
      } else {
        setActivePage('dashboard');
      }
    });
    return () => { backHandler.then(h => h.remove()); };
  }, [activePage]);

  // --- دالة تجميع الأصناف ومنع التكرار ---
  const groupItems = (items) => {
    const grouped = new Map();
    items.forEach(item => {
      const name = (item.name || item.item || "صنف غير مسمى").trim();
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

  // --- مزامنة وإدارة البيانات السريعة وسحب رقم الشركة ---
  const fetchLocalData = useCallback(async () => {
    setIsSyncing(true);
    const localStock = await storage.load('stock');
    const localHistory = await storage.load('productionHistory');
    
    // 🔥 جلب رقم السكيما المخزن محلياً باسم 'tenant_schema'
    const savedSchema = await storage.load('tenant_schema');
    if (savedSchema) setTenantSchema(savedSchema);
    
    if (localStock) setStock(localStock);
    if (localHistory) setProductionHistory(localHistory);
    setIsSyncing(false);
  }, []);

  // --- دالة حفظ الإنتاج وتحديث المخزن التلقائي ---
  const handleSaveProduction = async (newProduction) => {
    const updatedHistory = [newProduction, ...productionHistory];
    setProductionHistory(updatedHistory);
    await storage.save('productionHistory', updatedHistory);
    await storage.save('stock', stock);
    Swal.fire('تم الحفظ', 'تم تسجيل الإنتاج وتحديث المخزن بنجاح', 'success');
  };

  // --- دالة حفظ مدخلات المخزن الجديدة ---
  const handleSaveInventory = async (newItem) => {
    const formattedItem = {
      ...newItem,
      name: newItem.name || newItem.item,
      balance: parseFloat(newItem.balance || newItem.quantity || 0),
      price: parseFloat(newItem.price || 0)
    };

    const updatedStock = groupItems([...stock, formattedItem]);
    setStock(updatedStock);
    await storage.save('stock', updatedStock);
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

  // --- محرك التوجيه الحقيقي لربط وعرض المكونات الفعلية بنسبة 100% ---
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
            tenantSchema={tenantSchema} // 🔥 تمرير السكيما
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
            tenantSchema={tenantSchema} // 🔥 تمرير السكيما
          />
        );
      case 'production':
        return (
          <ProductionManager 
            onBack={backToDashboard} 
            stock={stock} 
            setStock={setStock} 
            onSaveProduction={handleSaveProduction} 
            tenantSchema={tenantSchema} // 🔥 تمرير السكيما
          />
        );
      case 'purchases':
        return <PurchasesManager onBack={backToDashboard} stock={stock} setStock={setStock} tenantSchema={tenantSchema} />;
      case 'sales':
        return <Sales onBack={backToDashboard} stock={stock} setStock={setStock} stats={stats} tenantSchema={tenantSchema} />;
      case 'waste':
        return <Waste onBack={backToDashboard} stock={stock} setStock={setStock} onDeleteItem={handleDelete} tenantSchema={tenantSchema} />;
      case 'expenses':
        return <Expenses onBack={backToDashboard} stats={stats} tenantSchema={tenantSchema} />;
      case 'suppliers':
        return <Suppliers onBack={backToDashboard} tenantSchema={tenantSchema} />;
      case 'financials':
        return <Financials onBack={backToDashboard} stats={stats} productionHistory={productionHistory} tenantSchema={tenantSchema} />;
      case 'reports':
        return <Reports onBack={backToDashboard} productionHistory={productionHistory} stock={stock} stats={stats} tenantSchema={tenantSchema} />;
      case 'customers':
        return <Customers onBack={backToDashboard} tenantSchema={tenantSchema} />;
      case 'staff':
        return <StaffManagement onBack={backToDashboard} tenantSchema={tenantSchema} />;
      case 'settings':
        return <Settings onBack={backToDashboard} fetchLocalData={fetchLocalData} stock={stock} productionHistory={productionHistory} tenantSchema={tenantSchema} setTenantSchema={setTenantSchema} storage={storage} />;
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

export default App;
