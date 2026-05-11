import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CapacitorHttp, Capacitor } from '@capacitor/core';

// --- 1. استيراد المكونات من المسارات الجديدة ---
import Dashboard from './features/DashboardHome';
import Inventory from './features/inventory/InventoryForm'; // تأكد من اسم الملف
import PurchasesManager from './features/PurchasesManager';
import Sales from './features/Sales';
import Waste from './features/Waste';
import Expenses from './features/Expenses';
import Suppliers from './features/Suppliers';
import Financials from './features/Financials';
import Reports from './features/Reports';
import Customers from './features/Customers';
import ProductionManager from './features/ProductionManager';
import StaffManagement from './features/StaffManagement';
import Settings from './features/Settings';

// --- دوال الاتصال الموحدة ---
const httpPost = async (url, body) => {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.post({
      url,
      headers: { 'Content-Type': 'application/json' },
      data: body
    });
    return response.data;
  }
  const res = await fetch(url, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(body) 
  });
  return res.json();
};

const httpGet = async (url) => {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({
      url,
      headers: { 'Content-Type': 'application/json' }
    });
    return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  }
  const res = await fetch(url);
  return res.json();
};

const showSwal = (title, icon = 'success') => {
  Swal.fire({ title, icon, timer: 1800, showConfirmButton: false, position: 'center', toast: true });
};

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- التحميل من LocalStorage ---
  const loadInitial = (key, initialValue) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch (e) { return initialValue; }
  };

  // --- States الحالات ---
  const [stock, setStock] = useState(() => loadInitial('stock', []));
  const [salesData, setSalesData] = useState(() => loadInitial('salesData', []));
  const [inventory, setInventory] = useState(() => loadInitial('inventory', []));
  const [expenses, setExpenses] = useState(() => loadInitial('expenses', []));
  const [waste, setWaste] = useState(() => loadInitial('waste', []));
  const [suppliers, setSuppliers] = useState(() => loadInitial('suppliers', []));
  const [customers, setCustomers] = useState(() => loadInitial('customers', []));
  const [productionData, setProductionData] = useState(() => loadInitial('productionData', []));
  const [supplierWaitingList, setSupplierWaitingList] = useState(() => loadInitial('waitingList', []));
  const [cashBook, setCashBook] = useState(() => loadInitial('cashBook', []));
  const [staff, setStaff] = useState(() => loadInitial('staff', []));

  // --- المزامنة ---
  const syncWithCloud = async (collectionName, data) => {
    if (!data || (Array.isArray(data) && data.length === 0)) return;
    try { await httpPost('https://nawah-aioi.vercel.app/api/sync', { collectionName, data }); } 
    catch (error) { console.error("Sync error:", error); }
  };

  const fetchFromCloud = async (collectionName, setter) => {
    try {
      const parsed = await httpGet(`https://nawah-aioi.vercel.app/api/get-data?collectionName=${collectionName}`);
      if (parsed?.success && parsed?.data) {
        setter(parsed.data);
        localStorage.setItem(collectionName, JSON.stringify(parsed.data));
      }
    } catch (error) { console.error("Fetch error:", error); }
  };

  useEffect(() => {
    const cols = ['stock', 'salesData', 'inventory', 'expenses', 'waste', 'suppliers', 'customers', 'productionData', 'waitingList', 'cashBook', 'staff'];
    const setters = { stock: setStock, salesData: setSalesData, inventory: setInventory, expenses: setExpenses, waste: setWaste, suppliers: setSuppliers, customers: setCustomers, productionData: setProductionData, waitingList: setSupplierWaitingList, cashBook: setCashBook, staff: setStaff };
    cols.forEach(col => fetchFromCloud(col, setters[col]));
  }, []);

  useEffect(() => {
    const syncMap = { stock, salesData, inventory, expenses, waste, suppliers, customers, productionData, waitingList: supplierWaitingList, cashBook, staff };
    Object.entries(syncMap).forEach(([key, val]) => {
      localStorage.setItem(key, JSON.stringify(val));
      syncWithCloud(key, val);
    });
  }, [stock, salesData, inventory, expenses, waste, suppliers, customers, productionData, supplierWaitingList, cashBook, staff]);

  // --- المحرك المالي ---
  const financialStats = useMemo(() => {
    const totalIncome = salesData.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalWasteValue = waste.reduce((sum, w) => {
      const item = stock.find(s => s.name === (w.itemName || w.item));
      return sum + ((parseFloat(w.quantity) || 0) * (item ? (item.price || 0) : 0));
    }, 0);
    const totalPurchasesCash = inventory.filter(p => p.paymentMethod === 'كاش').reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
    const stockValue = stock.reduce((sum, s) => sum + ((parseFloat(s.balance) || 0) * (parseFloat(s.price) || 0)), 0);
    return { 
      totalIncome, totalExpenses: totalExp, totalWasteValue, totalPurchasesCash, 
      cashBalance: totalIncome - (totalExp + totalPurchasesCash), 
      stockValue, netProfit: totalIncome - totalExp - totalWasteValue - totalPurchasesCash 
    };
  }, [salesData, expenses, waste, stock, inventory]);

  // --- المعالجات (Handlers) ---
  const addCashEntry = (entry) => setCashBook(prev => [...prev, { ...entry, id: Date.now(), timestamp: new Date().toLocaleString() }]);
  
  const handleSavePurchase = (p) => {
    setInventory(prev => [...prev, p]);
    setStock(prev => {
      const idx = prev.findIndex(s => s.name === p.item);
      if (idx > -1) {
        const up = [...prev];
        up[idx] = { ...up[idx], balance: (up[idx].balance || 0) + parseFloat(p.quantity), price: parseFloat(p.price) || up[idx].price };
        return up;
      }
      return [...prev, { id: Date.now(), name: p.item, balance: parseFloat(p.quantity), price: parseFloat(p.price), unit: p.unit || 'وحدة' }];
    });
    if (p.paymentMethod === 'كاش') addCashEntry({ type: 'out', category: 'مشتريات', amount: parseFloat(p.total), description: `شراء: ${p.item}` });
    showSwal('تم الحفظ بنجاح');
    navigate('/');
  };

  const commonProps = { onBack: () => navigate('/') };

  return (
    <div className="app-layout min-h-screen bg-[#fdf2f8] flex flex-col md:flex-row-reverse" dir="rtl">
      <main className="flex-1 p-4 pb-24 md:pb-8 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard stats={financialStats} staffCount={staff.filter(s => s.status === 'نشط').length} />} />
          <Route path="/inventory" element={<Inventory {...commonProps} categories={stock} setStock={setStock} onInventoryEntry={handleSavePurchase} />} />
          <Route path="/purchases" element={<PurchasesManager {...commonProps} stock={stock} inventory={inventory} onPurchaseComplete={handleSavePurchase} />} />
          <Route path="/sales" element={<Sales {...commonProps} onSaveSale={(sale) => { setSalesData(prev => [...prev, sale]); showSwal('تم البيع'); }} customers={customers} stock={stock} />} />
          <Route path="/production" element={<ProductionManager {...commonProps} stock={stock} onSaveProduction={(p) => showSwal('تم الإنتاج')} />} />
          <Route path="/waste" element={<Waste {...commonProps} inventory={stock} onSaveWaste={(w) => showSwal('تم تسجيل الهالك')} />} />
          <Route path="/expenses" element={<Expenses {...commonProps} onSaveExpense={(e) => showSwal('تم تسجيل المصروف')} />} />
          <Route path="/suppliers" element={<Suppliers {...commonProps} suppliers={suppliers} />} />
          <Route path="/staff" element={<StaffManagement {...commonProps} staff={staff} />} />
          <Route path="/reports" element={<Reports {...commonProps} inventory={inventory} stock={stock} salesData={salesData} expenses={expenses} />} />
          <Route path="/financials" element={<Financials {...commonProps} stats={financialStats} cashBook={cashBook} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      {/* Navigation السفلي للموبايل */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-lg border-t flex justify-around items-center z-50">
        <button onClick={() => navigate('/')} className={`flex flex-col items-center ${location.pathname === '/' ? 'text-pink-600' : 'text-gray-400'}`}>
          <span className="text-2xl">🏠</span><span className="text-[10px] font-bold">الرئيسية</span>
        </button>
        <button onClick={() => navigate('/inventory')} className={`flex flex-col items-center ${location.pathname === '/inventory' ? 'text-pink-600' : 'text-gray-400'}`}>
          <span className="text-2xl">📦</span><span className="text-[10px] font-bold">المخزن</span>
        </button>
        <button onClick={() => navigate('/reports')} className={`flex flex-col items-center ${location.pathname === '/reports' ? 'text-pink-600' : 'text-gray-400'}`}>
          <span className="text-2xl">📊</span><span className="text-[10px] font-bold">التقارير</span>
        </button>
      </nav>
    </div>
  );
};

const App = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;
