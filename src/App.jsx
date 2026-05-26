import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { App as AppLauncher } from '@capacitor/app';
import Swal from 'sweetalert2';

// استيراد المكونات الأساسية للنظام
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import ProductionManager from './components/ProductionManager';

const App = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [stock, setStock] = useState([]);
  const [productionHistory, setProductionHistory] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- 1. المحرك المحلي المستقر (Offline-First Engine) ---
  const storage = {
    save: async (key, data) => {
      await Preferences.set({ key, value: JSON.stringify(data) });
      localStorage.setItem(key, JSON.stringify(data)); 
    },
    load: async (key) => {
      const { value } = await Preferences.get({ key });
      try {
        return value ? JSON.parse(value) : JSON.parse(localStorage.getItem(key) || 'null');
      } catch (e) {
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

  // --- المحاكاة المحلية لإدارة البيانات وسحبها ---
  const fetchLocalData = useCallback(async () => {
    setIsSyncing(true);
    const localStock = await storage.load('stock');
    const localHistory = await storage.load('productionHistory');
    
    if (localStock) setStock(localStock);
    if (localHistory) setProductionHistory(localHistory);
    setIsSyncing(false);
  }, []);

  // --- دالة حفظ الإنتاج الجديد وتحديث المخزون التلقائي ---
  const handleSaveProduction = async (newProduction) => {
    const updatedHistory = [newProduction, ...productionHistory];
    setProductionHistory(updatedHistory);
    await storage.save('productionHistory', updatedHistory);
    
    // حفظ حالة المخزن المحدثة الحالية
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

  // --- دورة حياة النظام وبدء التشغيل الفوري ---
  useEffect(() => {
    fetchLocalData();
  }, [fetchLocalData]);

  // --- العمليات الحسابية الموحدة للإحصائيات والداشبورد ---
  const stats = useMemo(() => {
    const totalProduction = productionHistory.reduce((s, p) => s + (parseFloat(p.totalActualCost) || 0), 0);
    return {
      totalItems: stock.length,
      lowStock: stock.filter(i => (parseFloat(i.balance) || 0) < 5).length,
      inventoryWorth: stock.reduce((s, i) => s + ((parseFloat(i.balance) || 0) * (parseFloat(i.price) || 0)), 0).toFixed(2),
      rawFinancialValue: totalProduction
    };
  }, [stock, productionHistory]);

  // --- توجيه الصفحات الداخلية ---
  const pages = {
    dashboard: (
      <Dashboard 
        setActivePage={setActivePage} 
        productionHistory={productionHistory} 
        stock={stock} 
        stats={stats}
        onDeleteItem={handleDelete}
        fetchData={fetchLocalData}
      />
    ),
    inventory: (
      <Inventory 
        onBack={() => setActivePage('dashboard')} 
        stock={stock} 
        setStock={setStock} 
        onDeleteItem={handleDelete}
        onInventoryEntry={handleSaveInventory} 
      />
    ),
    production: (
      <ProductionManager 
        onBack={() => setActivePage('dashboard')} 
        stock={stock} 
        setStock={setStock} 
        onSaveProduction={handleSaveProduction} 
      />
    )
  };

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', backgroundColor: '#f4f7fe', fontFamily: 'Tajawal, sans-serif' }}>
      {isSyncing && (
        <div style={{ position: 'fixed', top: 10, left: 10, zIndex: 1000, fontSize: '10px', color: '#2563eb', background: '#fff', padding: '2px 8px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          🔄 جاري تحديث البيانات...
        </div>
      )}

      <main style={{ padding: '16px', paddingBottom: '100px' }}>
        {pages[activePage] || pages.dashboard}
      </main>

      <nav style={{
        position: 'fixed', bottom: '15px', left: '15px', right: '15px',
        height: '70px', backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(15px)', borderRadius: '25px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.3)',
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
    alignItems: 'center', color: color || (active ? '#2563eb' : '#94a3b8'), transition: '0.3s', cursor: 'pointer'
  }}>
    <span style={{ fontSize: '20px' }}>{icon}</span>
    <span style={{ fontSize: '12px', fontWeight: active ? 'bold' : 'normal' }}>{label}</span>
  </button>
);

export default App;
