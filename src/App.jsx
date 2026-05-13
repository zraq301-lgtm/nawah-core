import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
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

// --- إعدادات أودو الثابتة ---
const ODOO_BASE_URL = 'https://nawahio1.odoo.com';
const ODOO_DB = 'nawahio1';

// --- دالة الاتصال الموحدة بأودو (JSON-RPC) ---
const callOdoo = async (model, method, args = [[]], kwargs = {}) => {
    const url = `${ODOO_BASE_URL}/jsonrpc`;
    const body = {
        jsonrpc: "2.0",
        method: "call",
        params: {
            service: "object",
            method: "execute_kw",
            args: [ODOO_DB, localStorage.getItem('odoo_uid'), localStorage.getItem('user_pass'), model, method, args, kwargs]
        },
        id: Math.floor(Math.random() * 1000)
    };

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

const showSwal = (title, icon = 'success') => {
    Swal.fire({ title, icon, timer: 1800, showConfirmButton: false, position: 'center', toast: true });
};

const App = () => {
    const [activePage, setActivePage] = useState('dashboard');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // --- States ---
    const [stock, setStock] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [waste, setWaste] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [productionData, setProductionData] = useState([]);
    const [supplierWaitingList, setSupplierWaitingList] = useState([]);
    const [cashBook, setCashBook] = useState([]);
    const [staff, setStaff] = useState([]);

    // --- دالة جلب البيانات الشاملة من أودو ---
    const fetchAllFromOdoo = async () => {
        try {
            // 1. جلب المنتجات (المخزن)
            const stockRes = await callOdoo("product.template", "search_read", [[]], { 
                fields: ["name", "qty_available", "list_price", "uom_id"] 
            });
            if (stockRes?.result) {
                setStock(stockRes.result.map(i => ({
                    id: i.id, name: i.name, balance: i.qty_available, price: i.list_price, unit: i.uom_id[1]
                })));
            }

            // 2. جلب العملاء
            const custRes = await callOdoo("res.partner", "search_read", [[["customer_rank", ">", 0]]], {
                fields: ["name", "phone", "email"]
            });
            if (custRes?.result) setCustomers(custRes.result);

            // 3. جلب الموردين
            const suppRes = await callOdoo("res.partner", "search_read", [[["supplier_rank", ">", 0]]], {
                fields: ["name", "phone", "debt"]
            });
            if (suppRes?.result) setSuppliers(suppRes.result);

            // 4. جلب المبيعات
            const salesRes = await callOdoo("sale.order", "search_read", [[]], {
                fields: ["name", "partner_id", "amount_total", "date_order"]
            });
            if (salesRes?.result) {
                setSalesData(salesRes.result.map(s => ({
                    id: s.id, productName: s.name, customerName: s.partner_id[1], total: s.amount_total, date: s.date_order
                })));
            }

        } catch (error) {
            console.error("Fetch All Error:", error);
        }
    };

    useEffect(() => {
        const uid = localStorage.getItem('odoo_uid');
        if (uid) {
            setIsLoggedIn(true);
            fetchAllFromOdoo();
        }
    }, []);

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

    // --- دوال الحفظ في أودو ---
    const handleSavePurchase = async (p) => {
        await callOdoo("purchase.order", "create", [{ partner_id: p.supplierId, order_line: [] }]); 
        setInventory(prev => [...prev, p]);
        showSwal('تم مزامنة المشتريات مع أودو');
    };

    const handleSaveSale = async (sale) => {
        setSalesData(prev => [...prev, sale]);
        addCashEntry({ type: 'in', category: 'مبيعات', amount: parseFloat(sale.total || 0), description: `بيع: ${sale.productName}` });
        showSwal('تم تسجيل المبيعات في أودو');
    };

    const handleSaveWaste = (wasteEntry) => {
        setWaste(prev => [...prev, wasteEntry]);
        showSwal('تم تسجيل الهالك', 'warning');
    };

    const handleSaveExpense = (expense) => {
        setExpenses(prev => [...prev, expense]);
        addCashEntry({ type: 'out', category: expense.category, amount: parseFloat(expense.amount || 0), description: expense.description });
    };

    const handleSaveProduction = (production) => {
        const totalUnits = (parseFloat(production.boxes) || 0) * (parseFloat(production.unitsPerBox) || 0);
        setProductionData(prev => [...prev, { ...production, totalUnits, id: Date.now() }]);
        showSwal(`تم تسجيل الإنتاج في أودو`);
    };

    const handleAddSupplier = (supplier) => { setSuppliers(prev => [...prev, supplier]); };
    const handleAddCustomer = (customer) => { setCustomers(prev => [...prev, customer]); };
    
    const goHome = () => setActivePage('dashboard');

    const renderPage = () => {
        const cp = { onBack: goHome };
        switch (activePage) {
            case 'dashboard': return <Dashboard setActivePage={setActivePage} stats={financialStats} staffCount={staff.filter(s => s.status === 'نشط').length} />;
            case 'purchases': return <PurchasesManager {...cp} stock={stock} inventory={inventory} onPurchaseComplete={handleSavePurchase} />;
            case 'suppliers': return <Suppliers {...cp} suppliers={suppliers} waitingList={supplierWaitingList} onAddSupplier={handleAddSupplier} />;
            case 'inventory': return <Inventory {...cp} categories={stock} setStock={setStock} onInventoryEntry={handleSavePurchase} />;
            case 'sales': return <Sales {...cp} onSaveSale={handleSaveSale} customers={customers} stock={stock} />;
            case 'production': return <ProductionManager {...cp} stock={stock} setStock={setStock} onSaveProduction={handleSaveProduction} onSaveWaste={handleSaveWaste} />;
            case 'waste': return <Waste {...cp} inventory={stock} onSaveWaste={handleSaveWaste} />;
            case 'expenses': return <Expenses {...cp} onSaveExpense={handleSaveExpense} />;
            case 'customers': return <Customers {...cp} customers={customers} onAddCustomer={handleAddCustomer} />;
            case 'financials': return <Financials {...cp} stats={financialStats} cashBook={cashBook} />;
            case 'staff': return <StaffManagement {...cp} staff={staff} onAddStaff={(e) => setStaff([...staff, e])} />;
            case 'reports': return <Reports {...cp} inventory={inventory} stock={stock} salesData={salesData} expenses={expenses} staff={staff} />;
            case 'settings': return <Settings />;
            default: return <Dashboard setActivePage={setActivePage} stats={financialStats} />;
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
