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

// --- محرك الاتصال الذكي بأودو (JSON-RPC) ---
const callOdoo = async (model, method, args = [[]], kwargs = {}) => {
    const url = `${ODOO_BASE_URL}/jsonrpc`;
    const uid = localStorage.getItem('odoo_uid');
    const password = localStorage.getItem('user_pass');

    if (!uid || !password) return { error: { message: "بيانات تسجيل الدخول مفقودة" } };

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
        const response = await CapacitorHttp.post({
            url: url,
            headers: { 'Content-Type': 'application/json' },
            data: payload
        });
        return response.data;
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

    // --- سجلات البيانات الموحدة ---
    const [stock, setStock] = useState([]);
    const [partners, setPartners] = useState([]); 
    const [staff, setStaff] = useState([]);      

    // --- 1. جلب البيانات بتوافقية المخزن الذكي ---
    const fetchAllFromOdoo = async () => {
        // أ- جلب المنتجات والمخزون المتاح فعلياً
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

        // ب- جلب جهات الاتصال (للموردين، العملاء، والعمالة)
        const resPartners = await callOdoo("res.partner", "search_read", [[]], { 
            fields: ["name", "mobile", "comment"] 
        });

        if (resPartners?.result) {
            const allData = resPartners.result;
            setPartners(allData); 
            setStaff(allData);
        }
    };

    useEffect(() => {
        const uid = localStorage.getItem('odoo_uid');
        if (uid) {
            setIsLoggedIn(true);
            fetchAllFromOdoo();
        }
    }, []);

    // --- 2. إدارة الأفراد (إضافة عمالة/موردين/عملاء) ---
    const handleSavePartner = async (person) => {
        showSwal('جاري الحفظ في أودو...', 'info');
        const res = await callOdoo("res.partner", "create", [{
            'name': person.name,
            'mobile': person.phone || '',
            'comment': person.note || 'تمت الإضافة عبر التطبيق'
        }]);

        if (res?.result) {
            showSwal('تم الحفظ بنجاح');
            fetchAllFromOdoo();
        }
    };

    // --- 3. العمليات المخزنية المعتمدة على روابطك المرفقة ---
    
    // التوريد (Incoming) - يعتمد على المعرف رقم 1 (تسلسل Nawahio)
    const handleSavePurchase = async (p) => {
        showSwal('جاري تسجيل استلام في تسلسل Nawahio...', 'info');
        const res = await callOdoo("stock.picking", "create", [{
            'partner_id': parseInt(p.supplierId),
            'picking_type_id': 1, // المعرف المستخرج من الرابط الأول
            'location_id': 4,     // موقع المورد الافتراضي
            'location_dest_id': 8, // موقع المخزن الرئيسي (Stock)
            'move_ids_without_package': [[0, 0, {
                'name': 'توريد ذكي: ' + p.productName,
                'product_id': parseInt(p.productId),
                'product_uom_qty': parseFloat(p.quantity),
                'product_uom': 1,
                'location_id': 4,
                'location_dest_id': 8,
            }]]
        }]);

        if (res?.result) {
            // تأكيد العملية فوراً لجعل الكمية "منجزة" وتحديث الرصيد
            await callOdoo("stock.picking", "action_confirm", [[res.result]]);
            await callOdoo("stock.picking", "button_validate", [[res.result]]);
            showSwal('تم التوريد وتحديث المخزن بنجاح');
            fetchAllFromOdoo();
        }
    };

    // المبيعات (Outgoing) - يعتمد على المعرف رقم 2 (التسلسل للخارج)
    const handleSaveSale = async (sale) => {
        showSwal('جاري تسجيل صرف من التسلسل للخارج...', 'info');
        const res = await callOdoo("stock.picking", "create", [{
            'partner_id': parseInt(sale.customerId),
            'picking_type_id': 2, // المعرف المستخرج من الرابط الثاني
            'location_id': 8,     // من المخزن الرئيسي
            'location_dest_id': 9, // إلى موقع العميل
            'move_ids_without_package': [[0, 0, {
                'name': 'بيع ذكي: ' + sale.productName,
                'product_id': parseInt(sale.productId),
                'product_uom_qty': parseFloat(sale.quantity),
                'product_uom': 1,
                'location_id': 8,
                'location_dest_id': 9,
            }]]
        }]);

        if (res?.result) {
            await callOdoo("stock.picking", "action_confirm", [[res.result]]);
            await callOdoo("stock.picking", "button_validate", [[res.result]]);
            showSwal('تم الصرف وتحديث المخزن بنجاح');
            fetchAllFromOdoo();
        }
    };

    const financialStats = useMemo(() => {
        const stockValue = stock.reduce((sum, s) => sum + (s.balance * s.price), 0);
        return { totalIncome: 0, totalExpenses: 0, cashBalance: 0, stockValue };
    }, [stock]);

    const renderPage = () => {
        const commonProps = { onBack: () => setActivePage('dashboard') };
        switch (activePage) {
            case 'dashboard': return <Dashboard setActivePage={setActivePage} stats={financialStats} />;
            case 'inventory': return <Inventory {...commonProps} categories={stock} setStock={setStock} />;
            case 'purchases': return <PurchasesManager {...commonProps} stock={stock} suppliers={partners} onPurchaseComplete={handleSavePurchase} />;
            case 'sales': return <Sales {...commonProps} onSaveSale={handleSaveSale} customers={partners} stock={stock} />;
            case 'reports': return <Reports {...commonProps} stock={stock} />;
            case 'staff': return <StaffManagement {...commonProps} staff={staff} onSaveStaff={handleSavePartner} />;
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
                <button className={activePage === 'staff' ? 'active' : ''} onClick={() => setActivePage('staff')}>👥 الأفراد</button>
                <button className={activePage === 'reports' ? 'active' : ''} onClick={() => setActivePage('reports')}>📊 التقارير</button>
            </nav>
        </div>
    );
};

export default App;
