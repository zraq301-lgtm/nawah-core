import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { CapacitorHttp } from '@capacitor/core';

// استيراد المكونات
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

const ODOO_BASE_URL = 'https://nawahio1.odoo.com';
const ODOO_DB = 'nawahio1';

/**
 * دالة الاتصال الرئيسية باستخدام CapacitorHttp للتعامل مع أودو كـ "سيرفر خارجي"
 * هذه الطريقة تتخطى مشاكل الـ CORS في المتصفحات
 */
const callOdoo = async (model, method, args = [[]], kwargs = {}) => {
    const url = `${ODOO_BASE_URL}/jsonrpc`;
    const uid = localStorage.getItem('odoo_uid');
    const password = localStorage.getItem('user_pass');

    if (!uid || !password) {
        console.error("Credentials missing in localStorage");
        return { error: { message: "بيانات تسجيل الدخول غير متوفرة" } };
    }

    const payload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
            service: "object",
            method: "execute_kw",
            args: [ODOO_DB, parseInt(uid), password, model, method, args, kwargs]
        },
        id: Math.floor(Math.random() * 1000)
    };

    try {
        const options = {
            url: url,
            headers: { 'Content-Type': 'application/json' },
            data: payload
        };

        // استخدام CapacitorHttp دائماً لضمان تخطي حواجز الحماية
        const response = await CapacitorHttp.post(options);
        
        const responseData = response.data;

        if (responseData.error) {
            console.error("Odoo Error:", responseData.error);
            Swal.fire('خطأ من أودو', responseData.error.data?.message || responseData.error.message, 'error');
        }
        
        return responseData;
    } catch (err) {
        console.error("CapacitorHttp Error:", err);
        Swal.fire('فشل الاتصال', 'تعذر الوصول للسيرفر الخارجي، تحقق من الإنترنت', 'error');
        return { error: err };
    }
};

const showSwal = (title, icon = 'success') => {
    Swal.fire({ title, icon, timer: 1800, showConfirmButton: false, position: 'center', toast: true });
};

const App = () => {
    const [activePage, setActivePage] = useState('dashboard');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // States
    const [stock, setStock] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [waste, setWaste] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [productionData, setProductionData] = useState([]);
    const [cashBook, setCashBook] = useState([]);
    const [staff, setStaff] = useState([]);

    // جلب البيانات من أودو
    const fetchAllFromOdoo = async () => {
        // جلب المنتجات والمخزون
        const resProducts = await callOdoo("product.template", "search_read", [[]], { 
            fields: ["name", "qty_available", "list_price", "uom_id"] 
        });
        
        if (resProducts?.result) {
            setStock(resProducts.result.map(i => ({
                id: i.id, 
                name: i.name, 
                balance: i.qty_available, 
                price: i.list_price, 
                unit: i.uom_id ? i.uom_id[1] : 'وحدة'
            })));
        }

        // جلب الشركاء (عملاء وموردين)
        const resPartners = await callOdoo("res.partner", "search_read", [[]], {
            fields: ["name", "customer_rank", "supplier_rank"]
        });
        
        if (resPartners?.result) {
            setCustomers(resPartners.result.filter(p => p.customer_rank > 0));
            setSuppliers(resPartners.result.filter(p => p.supplier_rank > 0));
        }
    };

    useEffect(() => {
        const uid = localStorage.getItem('odoo_uid');
        if (uid) {
            setIsLoggedIn(true);
            fetchAllFromOdoo();
        }
    }, []);

    // الحسابات المالية اللحظية
    const financialStats = useMemo(() => {
        const totalIncome = salesData.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
        const totalExp = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const stockValue = stock.reduce((sum, s) => sum + ((parseFloat(s.balance) || 0) * (parseFloat(s.price) || 0)), 0);
        return { totalIncome, totalExpenses: totalExp, cashBalance: totalIncome - totalExp, stockValue };
    }, [salesData, expenses, stock]);

    // حفظ المشتريات وتأكيدها في أودو
    const handleSavePurchase = async (p) => {
        const res = await callOdoo("purchase.order", "create", [{
            'partner_id': parseInt(p.supplierId),
            'order_line': [[0, 0, {
                'product_id': parseInt(p.productId),
                'product_qty': parseFloat(p.quantity),
                'price_unit': parseFloat(p.price),
                'name': p.productName || 'طلب توريد من التطبيق'
            }]]
        }]);

        if (res?.result) {
            await callOdoo("purchase.order", "button_confirm", [[res.result]]);
            showSwal('تم التوريد وتحديث أودو');
            fetchAllFromOdoo();
        }
    };

    // حفظ المبيعات وتأكيدها في أودو
    const handleSaveSale = async (sale) => {
        const res = await callOdoo("sale.order", "create", [{
            'partner_id': parseInt(sale.customerId),
            'order_line': [[0, 0, {
                'product_id': parseInt(sale.productId),
                'product_uom_qty': parseFloat(sale.quantity),
                'price_unit': parseFloat(sale.price),
                'name': sale.productName
            }]]
        }]);

        if (res?.result) {
            await callOdoo("sale.order", "action_confirm", [[res.result]]);
            showSwal('تم تسجيل المبيعات بنجاح');
            fetchAllFromOdoo();
        }
    };

    const goHome = () => setActivePage('dashboard');

    const renderPage = () => {
        const cp = { onBack: goHome };
        switch (activePage) {
            case 'dashboard': return <Dashboard setActivePage={setActivePage} stats={financialStats} />;
            case 'inventory': return <Inventory {...cp} categories={stock} setStock={setStock} onInventoryEntry={handleSavePurchase} />;
            case 'purchases': return <PurchasesManager {...cp} stock={stock} inventory={inventory} onPurchaseComplete={handleSavePurchase} />;
            case 'sales': return <Sales {...cp} onSaveSale={handleSaveSale} customers={customers} stock={stock} />;
            case 'suppliers': return <Suppliers {...cp} suppliers={suppliers} onAddSupplier={() => {}} />;
            case 'customers': return <Customers {...cp} customers={customers} onAddCustomer={() => {}} />;
            case 'reports': return <Reports {...cp} inventory={inventory} stock={stock} salesData={salesData} expenses={expenses} />;
            case 'settings': return <Settings />;
            default: return <Dashboard setActivePage={setActivePage} stats={financialStats} />;
        }
    };

    return (
        <div className="app-container" style={{ direction: 'rtl' }}>
            <main className="main-content">{renderPage()}</main>
            <nav className="bottom-nav" style={{ display: 'flex', justifyContent: 'space-around', padding: '10px', background: '#fff', borderTop: '1px solid #ddd' }}>
                <button className="nav-item" onClick={() => setActivePage('dashboard')}>🏠 الرئيسية</button>
                <button className="nav-item" onClick={() => setActivePage('inventory')}>📦 المخزن</button>
                <button className="nav-item" onClick={() => setActivePage('purchases')}>⚙️ العمليات</button>
                <button className="nav-item" onClick={() => setActivePage('reports')}>📊 التقارير</button>
            </nav>
        </div>
    );
};

export default App;
