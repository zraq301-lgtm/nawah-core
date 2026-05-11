import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CapacitorHttp, Capacitor } from '@capacitor/core';

// --- 1. استيراد المكونات الفعلية ---
import Sidebar from './components/shared/Sidebar';
import DashboardHome from './features/DashboardHome';
import InventoryForm from './features/inventory/InventoryForm';

// تأكد من استيراد باقي الصفحات إذا كانت ملفاتها جاهزة لديك:
// import SalesForm from './features/sales/SalesForm';
// import ExpensesForm from './features/expenses/ExpensesForm';
// import StaffList from './features/staff/StaffList';

import configData from './nawah.config.json';

const BASE_URL = "https://nawah-aioi.vercel.app";

const api = {
  post: async (endpoint, body) => {
    const url = `${BASE_URL}${endpoint}`;
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({ url, headers: { 'Content-Type': 'application/json' }, data: body });
      return response.data;
    }
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json();
  },
  get: async (endpoint) => {
    const url = `${BASE_URL}${endpoint}`;
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.get({ url, headers: { 'Content-Type': 'application/json' } });
      return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    }
    const res = await fetch(url);
    return res.json();
  }
};

const App = () => {
  const [stock, setStock] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [staff, setStaff] = useState([]);

  // --- نظام المزامنة الذكي ---
  const fetchAllFromCloud = async () => {
    const collections = ['stock', 'salesData', 'expenses', 'staff'];
    const setters = { stock: setStock, salesData: setSalesData, expenses: setExpenses, staff: setStaff };
    for (const col of collections) {
      try {
        const result = await api.get(`/api/get-data?collectionName=${col}`);
        if (result?.success && result?.data) {
          setters[col](result.data);
          localStorage.setItem(col, JSON.stringify(result.data));
        }
      } catch (err) { console.error(err); }
    }
  };

  useEffect(() => { fetchAllFromCloud(); }, []);

  const stats = useMemo(() => {
    const totalIncome = salesData.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    return { totalIncome, totalExpenses: totalExp, netProfit: totalIncome - totalExp };
  }, [salesData, expenses]);

  return (
    <Router>
      <div className="app-container min-h-screen bg-pink-50/30 flex flex-col md:flex-row-reverse" dir="rtl">
        <aside className="hidden md:block w-64 bg-white/40 backdrop-blur-lg border-l border-white/20 p-6">
          <Sidebar />
        </aside>

        <main className="flex-1 p-4 pb-24 md:pb-4 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardHome stats={stats} staffCount={staff.length} />} />
            
            {/* صفحة المخزن - تم ربطها بالمكون الفعلي */}
            <Route path="/inventory" element={
              <InventoryForm 
                stock={stock} 
                onSave={(item) => {
                  setStock(prev => [...prev, item]);
                  api.post('/api/sync', { collectionName: 'stock', data: [...stock, item] });
                }} 
              />
            } />

            {/* --- هنا يجب وضع المكونات الفعلية بدلاً من <div>قريباً</div> --- */}
            <Route path="/sales" element={<div>هنا نضع مكون المبيعات الفعلي</div>} />
            <Route path="/expenses" element={<div>هنا نضع مكون المصروفات الفعلي</div>} />
            <Route path="/staff" element={<div>هنا نضع مكون العمالة الفعلي</div>} />
            
            {/* أي صفحة غير مبرمجة ستعرض رسالة تنبيه */}
            <Route path="*" element={<div className="p-10 text-center font-bold text-gray-400">هذه الصفحة قيد التطوير البرمجي</div>} />
          </Routes>
        </main>

        <MobileNavigation />
      </div>
    </Router>
  );
};

const MobileNavigation = () => {
  const navigate = useNavigate();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/70 backdrop-blur-xl border-t border-white/30 flex justify-around items-center z-50">
       <button onClick={() => navigate('/')} className="flex flex-col items-center gap-1 text-pink-600">
          <span className="text-xl">🏠</span><span className="text-[10px] font-bold">الرئيسية</span>
       </button>
       <button onClick={() => navigate('/inventory')} className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">📦</span><span className="text-[10px] font-bold">المخزن</span>
       </button>
    </nav>
  );
};

export default App;
