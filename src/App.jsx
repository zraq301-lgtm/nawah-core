import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { LocalNotifications } from '@capacitor/local-notifications';
import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { App as AppLauncher } from '@capacitor/app';
import Swal from 'sweetalert2';

// استيراد المكونات الأساسية للنظام
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import ProductionManager from './components/ProductionManager';

// إعدادات الروابط الموحدة لنظام معمول ERP
const API_CONFIG = {
  SYNC: 'https://maamoul-one.vercel.app/api/sync',
  GET: 'https://maamoul-one.vercel.app/api/get-data',
  DELETE: 'https://maamoul-one.vercel.app/api/delete-item'
};

const App = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [stock, setStock] = useState([]);
  const [productionHistory, setProductionHistory] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- 1. المحرك المحلي (Offline-First Engine) ---
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

  // --- ميزة تفعيل أزرار الهاتف ---
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

  // --- دالة مساعدة لتجميع الأصناف (Helper Function) ---
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

  // --- 2. نظام المزامنة والتوحيد ---
  const fetchCloudData = useCallback(async () => {
    try {
      const resProd = await CapacitorHttp.get({ url: `${API_CONFIG.GET}?collectionName=productionData` });
      let prodResponse = typeof resProd.data === 'string' ? JSON.parse(resProd.data) : resProd.data;
      if (prodResponse?.success && prodResponse.data) {
        setProductionHistory(prodResponse.data);
        await storage.save('productionHistory', prodResponse.data);
      }

      const resStock = await CapacitorHttp.get({ url: `${API_CONFIG.GET}?collectionName=stock` });
      let stockResponse = typeof resStock.data === 'string' ? JSON.parse(resStock.data) : resStock.data;
      
      const rawItems = stockResponse.data || [];

      if (stockResponse?.success && Array.isArray(rawItems)) {
        const normalizedStock = groupItems(rawItems);
        setStock(normalizedStock);
        await storage.save('stock', normalizedStock);
      }
    } catch (error) {
      console.warn("ERP Alert: جاري العمل بالبيانات المحلية.");
    }
  }, []);

  const syncData = async (collection, data) => {
    if (!data || data.length === 0) return;
    setIsSyncing(true);
    try {
      await CapacitorHttp.post({
        url: API_CONFIG.SYNC,
        headers: { 'Content-Type': 'application/json' },
        data: { collectionName: collection, data }
      });
    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- دالة حفظ الإنتاج الجديد (تم الضبط لضمان المزامنة النهائية) ---
  const handleSaveProduction = async (newProduction) => {
    // 1. تحديث سجل الإنتاج
    const updatedHistory = [newProduction, ...productionHistory];
    setProductionHistory(updatedHistory);
    await storage.save('productionHistory', updatedHistory);
    
    // 2. تحديث المخزن المحدث بالفعل من ProductionManager
    // ملاحظة: الـ stock هنا سيأتي مخصوماً وجاهزاً لأننا نمرر setStock للـ ProductionManager
    await storage.save('stock', stock);

    // 3. مزامنة البيانات (السجل الجديد + حالة المخزن النهائية)
    await syncData('productionData', [newProduction]);
    await syncData('stock', stock);
    
    Swal.fire('تم الحفظ', 'تم تسجيل الإنتاج وتحديث المخزن بنجاح', 'success');
  };

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
    await syncData('stock', updatedStock);
  };

  // --- دالة الحذف المعدلة للحذف اللحظي ---
  const handleDelete = async (id, type) => {
    if (type === 'stock') {
      const updatedStock = stock.filter(item => (item.id !== id && item._id !== id));
      setStock(updatedStock);
      await storage.save('stock', updatedStock);
      
      try {
        await CapacitorHttp.post({
          url: API_CONFIG.DELETE,
          headers: { 'Content-Type': 'application/json' },
          data: { collectionName: 'stock', id }
        });
      } catch (e) {
        console.error("فشل الحذف من السيرفر.");
      }
    } else {
      const updatedHistory = productionHistory.filter(item => (item.id !== id && item._id !== id));
      setProductionHistory(updatedHistory);
      await storage.save('productionHistory', updatedHistory);

      try {
        await CapacitorHttp.post({
          url: API_CONFIG.DELETE,
          headers: { 'Content-Type': 'application/json' },
          data: { collectionName: 'productionData', id }
        });
      } catch (e) {
        console.error("فشل الحذف من السيرفر.");
      }
    }
  };

  // --- 3. دورة حياة النظام ---
  useEffect(() => {
    const bootSystem = async () => {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.requestPermissions();
      }
      const localStock = await storage.load('stock');
      const localHistory = await storage.load('productionHistory');
      if (localStock) setStock(localStock);
      if (localHistory) setProductionHistory(localHistory);
      
      await fetchCloudData();
    };
    bootSystem();
  }, [fetchCloudData]);

  const stats = useMemo(() => {
    const totalProduction = productionHistory.reduce((s, p) => s + (parseFloat(p.totalActualCost) || 0), 0);
    return {
      totalItems: stock.length,
      lowStock: stock.filter(i => (parseFloat(i.balance) || 0) < 5).length,
      inventoryWorth: stock.reduce((s, i) => s + ((parseFloat(i.balance) || 0) * (parseFloat(i.price) || 0)), 0).toFixed(2),
      rawFinancialValue: totalProduction
    };
  }, [stock, productionHistory]);

  // --- 4. توجيه الصفحات ---
  const pages = {
    dashboard: (
      <Dashboard 
        setActivePage={setActivePage} 
        productionHistory={productionHistory} 
        stock={stock} 
        stats={stats}
        onDeleteItem={handleDelete}
        fetchData={fetchCloudData}
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
          🔄 جاري المزامنة...
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
