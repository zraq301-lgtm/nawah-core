import React, { useState, useEffect, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';

// استيراد مباشر لضمان توفر الأدوات فور تشغيل التطبيق
import { CapacitorHttp, Capacitor } from '@capacitor/core';

import Dashboard from './components/Dashboard';
import PurchasesManager from './components/PurchasesManager';
import Sales from './components/Sales';
import Waste from './components/Waste';
import Expenses from './components/Expenses';
import Suppliers from './components/Suppliers';
import Financials from './components/Financials';
import Reports from './components/Reports';
import Customers from './components/Customers';
import Inventory from './components/Inventory';
import ProductionManager from './components/ProductionManager';
import StaffManagement from './components/StaffManagement';
import Settings from './components/Settings';

import './App.css';

// --- ضبط دوال الاتصال لتناسب الأندرويد والويب معاً ---
const httpPost = async (url, body) => {
  // استخدام CapacitorHttp إذا كان التطبيق يعمل على الأندرويد
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.post({
      url,
      headers: { 'Content-Type': 'application/json' },
      data: body
    });
    return response.data;
  }
  // الفولباك للويب
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
    // معالجة البيانات إذا كانت نصاً
    return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  }
  const res = await fetch(url);
  return res.json();
};

const showSwal = (title, icon = 'success') => {
  Swal.fire({ title, icon, timer: 1800, showConfirmButton: false, position: 'center', toast: true });
};

const App = () => {
  const [activePage, setActivePage] = useState('dashboard');

  const loadInitial = (key, initialValue) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch (e) {
      return initialValue;
    }
  };

  // --- API Handlers ---
  const syncWithCloud = async (collectionName, data) => {
    if (!data || (Array.isArray(data) && data.length === 0)) return;
    try {
      await httpPost('https://maamoul-pro-five.vercel.app/api/sync', { collectionName, data });
    } catch (error) {
      console.error("Sync error:", error);
    }
  };

  const fetchFromCloud = async (collectionName, setter) => {
    try {
      const parsed = await httpGet(`https://maamoul-pro-five.vercel.app/api/get-data?collectionName=${collectionName}`);
      
      if (parsed?.success && parsed?.data) {
        const cloudData = parsed.data;
        setter(cloudData);
        localStorage.setItem(collectionName, JSON.stringify(cloudData));
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const deleteFromCloud = async (collectionName, id) => {
    try {
      await httpPost('https://maamoul-pro-five.vercel.app/api/delete-item', { collectionName, id });
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // --- States ---
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

  // Load from Cloud on Start
  useEffect(() => {
    const cols = ['stock', 'salesData', 'inventory', 'expenses', 'waste', 'suppliers', 'customers', 'productionData', 'waitingList', 'cashBook', 'staff'];
    const setters = {
      stock: setStock, salesData: setSalesData, inventory: setInventory,
      expenses: setExpenses, waste: setWaste, suppliers: setSuppliers,
      customers: setCustomers, productionData: setProductionData,
      waitingList: setSupplierWaitingList, cashBook: setCashBook, staff: setStaff
    };
    cols.forEach(col => fetchFromCloud(col, setters[col]));
  }, []);

  // Sync to Cloud and LocalStorage on Change
  useEffect(() => {
    const syncMap = {
      stock, salesData, inventory, expenses, waste, suppliers,
      customers, productionData, waitingList: supplierWaitingList,
      cashBook, staff
    };
    Object.entries(syncMap).forEach(([key, val]) => {
      localStorage.setItem(key, JSON.stringify(val));
      syncWithCloud(key, val);
    });
  }, [stock, salesData, inventory, expenses, waste, suppliers, customers, productionData, supplierWaitingList, cashBook, staff]);

  const financialStats = useMemo(() => {
    const totalIncome = salesData.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalWasteValue = waste.reduce((sum, w) => {
      const item = stock.find(s => s.name === (w.itemName || w.item));
      return sum + ((parseFloat(w.quantity) || 0) * (item ? (item.price || 0) : 0));
    }, 0);
    const totalPurchasesCash = inventory.filter(p => p.paymentMethod === 'كاش').reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
    const cashBalance = totalIncome - (totalExp + totalPurchasesCash);
    const stockValue = stock.reduce((sum, s) => sum + ((parseFloat(s.balance) || 0) * (parseFloat(s.price) || 0)), 0);
    const netProfit = totalIncome - totalExp - totalWasteValue - totalPurchasesCash;
    const totalSalaries = staff.filter(s => s.status === 'نشط').reduce((sum, s) => sum + (parseFloat(s.salary) || 0), 0);
    return { totalIncome, totalExpenses: totalExp, totalWasteValue, totalPurchasesCash, totalCashIn: totalIncome, totalCashOut: totalExp + totalPurchasesCash, cashBalance, stockValue, netProfit, totalSalaries };
  }, [salesData, expenses, waste, stock, inventory, staff]);

  const addCashEntry = (entry) => {
    setCashBook(prev => [...prev, { ...entry, id: Date.now(), timestamp: new Date().toLocaleString() }]);
  };

  const handleGenericDelete = (collectionName, id, setter) => {
    setter(prev => prev.filter(item => (item.id !== id && item._id !== id)));
    deleteFromCloud(collectionName, id);
    showSwal('تم الحذف بنجاح', 'success');
  };

  const handleSavePurchase = (p) => {
    const total = parseFloat(p.total || (p.quantity * p.price) || 0);
    setInventory(prev => [...prev, p]);
    setStock(prev => {
      const idx = prev.findIndex(s => s.name === p.item);
      const qty = parseFloat(p.quantity || 0);
      const price = parseFloat(p.price || 0);
      if (idx > -1) {
        const up = [...prev];
        up[idx] = { ...up[idx], balance: (up[idx].balance || 0) + qty, price: price || up[idx].price };
        if (!up[idx].batches) up[idx].batches = [];
        up[idx].batches.push({ date: p.date, qty, cost: price });
        return up;
      }
      return [...prev, { id: Date.now(), name: p.item, balance: qty, price, unit: p.unit || 'وحدة', batches: [{ date: p.date, qty, cost: price }] }];
    });
    if (p.paymentMethod === 'كاش') addCashEntry({ type: 'out', category: 'مشتريات', amount: total, description: `شراء: ${p.item}` });
    else if (p.paymentMethod === 'آجل' && p.supplier) setSuppliers(prev => prev.map(s => s.name === p.supplier ? { ...s, debt: (parseFloat(s.debt) || 0) + total } : s));
    showSwal('تم حفظ عملية الشراء', 'success');
    setActivePage('dashboard');
  };

  const handleSaveSale = (sale) => {
    setSalesData(prev => [...prev, sale]);
    setStock(prev => prev.map(item => item.name === sale.productName ? { ...item, balance: Math.max(0, (item.balance || 0) - parseFloat(sale.quantity || 0)) } : item));
    addCashEntry({ type: 'in', category: 'مبيعات', amount: parseFloat(sale.total || 0), description: `بيع: ${sale.productName} - ${sale.customerName}` });
    showSwal('تم تسجيل عملية البيع', 'success');
  };

  const handleSaveWaste = (wasteEntry) => {
    setWaste(prev => [...prev, wasteEntry]);
    const itemName = wasteEntry.itemName || wasteEntry.item;
    if (itemName) setStock(prev => prev.map(item => item.name === itemName ? { ...item, balance: Math.max(0, (item.balance || 0) - parseFloat(wasteEntry.quantity || 0)) } : item));
    showSwal('تم تسجيل الهالك', 'warning');
  };

  const handleSaveExpense = (expense) => {
    setExpenses(prev => [...prev, expense]);
    addCashEntry({ type: 'out', category: expense.category, amount: parseFloat(expense.amount || 0), description: expense.description });
    showSwal('تم تسجيل المصروف', 'success');
  };

  const handleSaveProduction = (production) => {
    const totalUnits = (parseFloat(production.boxes) || 0) * (parseFloat(production.unitsPerBox) || 0);
    const finalProduction = { ...production, totalUnits, id: Date.now() };
    
    setProductionData(prev => [...prev, finalProduction]);

    setStock(prev => {
      const productName = production.productName || "منتج نهائي جديد";
      const idx = prev.findIndex(s => s.name === productName);
      
      if (idx > -1) {
        const up = [...prev];
        up[idx] = { 
          ...up[idx], 
          balance: (up[idx].balance || 0) + totalUnits,
          category: 'منتج نهائي' 
        };
        return up;
      }
      return [...prev, { 
        id: Date.now(), 
        name: productName, 
        balance: totalUnits, 
        price: 0, 
        unit: 'وحدة', 
        category: 'منتج نهائي' 
      }];
    });

    showSwal(`تم إنتاج ${totalUnits} وحدة وإضافتها للمخزن`, 'success');
  };

  const handleOrderTrigger = (orderData) => setSupplierWaitingList(prev => [orderData, ...prev]);
  const handleAddSupplier = (supplier) => { setSuppliers(prev => [...prev, { ...supplier, debt: supplier.debt || 0 }]); showSwal('تم إضافة المورد', 'success'); };
  const handleAddCustomer = (customer) => { setCustomers(prev => [...prev, customer]); showSwal('تم إضافة العميل', 'success'); };
  const handlePaySupplierDebt = (supplierName, amount) => {
    setSuppliers(prev => prev.map(s => s.name === supplierName ? { ...s, debt: Math.max(0, (parseFloat(s.debt) || 0) - parseFloat(amount)) } : s));
    addCashEntry({ type: 'out', category: 'سداد موردين', amount: parseFloat(amount), description: `سداد ديون: ${supplierName}` });
    showSwal('تم سداد دين المورد', 'success');
  };

  const handleAddStaff = (employee) => { setStaff(prev => [...prev, employee]); showSwal('تم إضافة الموظف', 'success'); };
  const handleUpdateStaff = (id, updatedData) => { setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updatedData } : s)); showSwal('تم تحديث بيانات الموظف', 'success'); };
  const handleDeleteStaff = (id) => { handleGenericDelete('staff', id, setStaff); };

  const handleDirectStockAdd = (item) => { setStock(prev => [...prev, { ...item, id: Date.now(), batches: [{ date: new Date().toLocaleDateString(), qty: item.balance, cost: item.price }] }]); showSwal('تم إضافة الصنف للمخزن', 'success'); };

  const goHome = () => setActivePage('dashboard');

  const renderPage = () => {
    const cp = { onBack: goHome };
    switch (activePage) {
      case 'dashboard': return <Dashboard setActivePage={setActivePage} stats={financialStats} staffCount={staff.filter(s => s.status === 'نشط').length} />;
      case 'purchases': return <PurchasesManager {...cp} stock={stock} inventory={inventory} onPurchaseComplete={handleSavePurchase} onOrderTrigger={handleOrderTrigger} />;
      case 'suppliers': return <Suppliers {...cp} suppliers={suppliers} waitingList={supplierWaitingList} onAddSupplier={handleAddSupplier} onUpdateWaitingList={setSupplierWaitingList} onPayDebt={handlePaySupplierDebt} />;
      case 'inventory': return <Inventory {...cp} categories={stock} setStock={setStock} onAddItem={handleDirectStockAdd} onDeleteItem={(id) => handleGenericDelete('stock', id, setStock)} onInventoryEntry={handleSavePurchase} />;
      case 'sales': return <Sales {...cp} onSaveSale={handleSaveSale} customers={customers} stock={stock} />;
      case 'production': return <ProductionManager {...cp} stock={stock} setStock={setStock} onSaveProduction={handleSaveProduction} onSaveWaste={handleSaveWaste} />;
      case 'waste': return <Waste {...cp} inventory={stock} onSaveWaste={handleSaveWaste} />;
      case 'expenses': return <Expenses {...cp} onSaveExpense={handleSaveExpense} />;
      case 'customers': return <Customers {...cp} customers={customers} onAddCustomer={handleAddCustomer} />;
      case 'financials': return <Financials {...cp} stats={financialStats} cashBook={cashBook} />;
      case 'staff': return <StaffManagement {...cp} staff={staff} onAddStaff={handleAddStaff} onUpdateStaff={handleUpdateStaff} onDeleteStaff={handleDeleteStaff} />;
      case 'reports': return <Reports {...cp} inventory={inventory} stock={stock} salesData={salesData} expenses={expenses} staff={staff} />;
      case 'settings': return <Settings />;
      default: return <Dashboard setActivePage={setActivePage} stats={financialStats} staffCount={staff.filter(s => s.status === 'نشط').length} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: 'home' },
    { id: 'inventory', label: 'المخزن', icon: 'box' },
    { id: 'purchases', label: 'العمليات', icon: 'ops' },
    { id: 'reports', label: 'التقارير', icon: 'chart' },
  ];

  const renderNavIcon = (iconType, isActive) => {
    const fill = isActive ? '#1e5631' : 'none';
    const stroke = isActive ? '#1e5631' : '#94a3b8';
    const props = { width: 26, height: 26, viewBox: '0 0 24 24', fill, stroke, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
    switch (iconType) {
      case 'home': return <svg {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
      case 'box': return <svg {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
      case 'ops': return <svg {...props}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
      case 'chart': return <svg {...props}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
      default: return null;
    }
  };

  return (
    <div className="app-container" style={{ direction: 'rtl' }}>
      <main className="main-content">{renderPage()}</main>
      <nav className="bottom-nav">
        {navItems.map(item => {
          const isActive = activePage === item.id || (item.id === 'purchases' && ['purchases', 'sales', 'production', 'waste', 'expenses'].includes(activePage));
          return (
            <button key={item.id} className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
              {renderNavIcon(item.icon, isActive)}
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default App;
