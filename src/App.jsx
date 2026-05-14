import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { CapacitorHttp } from '@capacitor/core';

// استيراد المكونات
import Dashboard from './components/Dashboard';
import PurchasesManager from './components/PurchasesManager';
import Sales from './components/Sales';
import Reports from './components/Reports';
import StaffManagement from './components/StaffManagement';
import Inventory from './components/Inventory';
import Settings from './components/Settings';

import './App.css';

const ODOO_BASE_URL = 'https://nawahio1.odoo.com';
const ODOO_DB = 'nawahio1';

const callOdoo = async (model, method, args = [[]], kwargs = {}) => {
    const url = `${ODOO_BASE_URL}/jsonrpc`;
    const uid = localStorage.getItem('odoo_uid');
    const password = localStorage.getItem('user_pass');

    if (!uid || !password) return { error: { message: "بيانات تسجيل الدخول غير متوفرة" } };

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

        const response = await CapacitorHttp.post(options);
        const responseData = response.data;

        if (responseData.error) {
            const errorMsg = responseData.error.data?.message || responseData.error.message;
            // عرض تنبيه فقط إذا لم يكن الخطأ متوقعاً
            if (!errorMsg.includes("doesn't exist")) {
                Swal.fire({
                    title: 'تنبيه من أودو',
                    text: errorMsg,
                    icon: 'info',
                    confirmButtonText: 'مفهوم'
                });
            }
        }
        return responseData;
    } catch (err) {
        return { error: err };
    }
};

const showSwal = (title, icon = 'success') => {
    Swal.fire({ title, icon, timer: 1500, showConfirmButton: false, position: 'center', toast: true });
};

const App = () => {
    const [activePage, setActivePage] = useState('dashboard');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // States البيانات
    const [stock, setStock] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [staff, setStaff] = useState([]);

    const fetchAllFromOdoo = async () => {
        // 1. جلب المنتجات والمخزون
        const resProducts = await callOdoo("product.product", "search_read", [[]], { 
            fields: ["name", "qty_available", "list_price", "uom_id"] 
        });
        
        if (resProducts?.result) {
            setStock(resProducts.result.map(i => ({
                id: i.id, 
                name: i.name, 
                balance: i.qty_available || 0, 
                price: i.list_price || 0, 
                unit: i.uom_id ? i.uom_id[1] : 'وحدة'
            })));
        }

        // 2. جلب جهات الاتصال (حل مشكلة customer_rank)
        // سنحاول جلب الحقول الأساسية أولاً
        const resPartners = await callOdoo("res.partner", "search_read", [[["is_company", "=", true]]], {
            fields: ["name", "customer_rank", "supplier_rank"]
        });
        
        if (resPartners?.result) {
            // إذا كانت النسخة تدعم الرتب (Rank)
            setCustomers(resPartners.result.filter(p => (p.customer_rank || 0) > 0));
            setSuppliers(resPartners.result.filter(p => (p.supplier_rank || 0) > 0));
        } else {
            // خطة بديلة: جلب كل جهات الاتصال إذا فشلت الرتب
            const resFallback = await callOdoo("res.partner", "search_read", [[]], { fields: ["name"] });
            if (resFallback?.result) {
                setCustomers(resFallback.result);
                setSuppliers(resFallback.result);
            }
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
        const stockValue = stock.reduce((sum, s) => sum + (s.balance * s.price), 0);
        return { totalIncome: 0, totalExpenses: 0, cashBalance: 0, stockValue };
    }, [stock]);

    // وظيفة المشتريات (معالجة خطأ الموديل غير الموجود)
    const handleSavePurchase = async (p) => {
        showSwal('جاري الإرسال لـ أودو...', 'info');
        
        const res = await callOdoo("purchase.order", "create", [{
            'partner_id': parseInt(p.supplierId),
            'order_line': [[0, 0, {
                'product_id': parseInt(p.productId),
                'product_qty': parseFloat(p.quantity),
                'price_unit': parseFloat(p.price),
                'name': p.productName || 'طلب من التطبيق'
            }]]
        }]);

        if (res?.result) {
            await callOdoo("purchase.order", "button_confirm", [[res.result]]);
            showSwal('تم التوريد وتحديث أودو');
            fetchAllFromOdoo();
        } else if (res?.error?.data?.message?.includes("doesn't exist")) {
            Swal.fire('خطأ في أودو', 'تطبيق "المشتريات" غير مثبت في نسخة أودو الخاصة بك', 'error');
        }
    };

    // وظيفة المبيعات
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

    const renderPage = () => {
        const commonProps = { onBack: () => setActivePage('dashboard') };
        switch (activePage) {
            case 'dashboard': return <Dashboard setActivePage={setActivePage} stats={financialStats} />;
            case 'inventory': return <Inventory {...commonProps} categories={stock} setStock={setStock} />;
            case 'purchases': return <PurchasesManager {...commonProps} stock={stock} suppliers={suppliers} onPurchaseComplete={handleSavePurchase} />;
            case 'sales': return <Sales {...commonProps} onSaveSale={handleSaveSale} customers={customers} stock={stock} />;
            case 'reports': return <Reports {...commonProps} stock={stock} />;
            case 'staff': return <StaffManagement {...commonProps} staff={staff} setStaff={setStaff} />;
            case 'settings': return <Settings />;
            default: return <Dashboard setActivePage={setActivePage} stats={financialStats} />;
        }
    };

    return (
        <div className="app-container" style={{ direction: 'rtl' }}>
            <main className="main-content">
                {renderPage()}
            </main>
            <nav className="bottom-nav">
                <button className={activePage === 'dashboard' ? 'active' : ''} onClick={() => setActivePage('dashboard')}>🏠 الرئيسية</button>
                <button className={activePage === 'inventory' ? 'active' : ''} onClick={() => setActivePage('inventory')}>📦 المخزن</button>
                <button className={activePage === 'purchases' ? 'active' : ''} onClick={() => setActivePage('purchases')}>⚙️ العمليات</button>
                <button className={activePage === 'reports' ? 'active' : ''} onClick={() => setActivePage('reports')}>📊 التقارير</button>
            </nav>
        </div>
    );
};

export default App;
