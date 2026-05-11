import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CapacitorHttp, Capacitor } from '@capacitor/core';

// استيراد المكونات الأساسية
import Sidebar from './components/shared/Sidebar';
import DashboardHome from './features/DashboardHome';
import InventoryForm from './features/inventory/InventoryForm';
import configData from './nawah.config.json';

// --- الرابط الأساسي للـ API ---
const BASE_URL = "https://nawah-aioi.vercel.app";

// --- محرك الاتصال الموحد (الويب + أندرويد) ---
const api = {
  post: async (endpoint, body) => {
    const url = `${BASE_URL}${endpoint}`;
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
  },
  get: async (endpoint) => {
    const url = `${BASE_URL}${endpoint}`;
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.get({
        url,
        headers: { 'Content-Type': 'application/json' }
      });
      return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    }
    const res = await fetch(url);
    return res.json();
  }
};

const App = () => {
  // --- States الحالات ---
  const [stock, setStock] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [waste, setWaste] = useState([]);
  const [staff, setStaff] = useState([]);

  // --- نظام المزامنة السحابي الذكي ---
  const fetchAllFromCloud = async () => {
    const collections = ['stock', 'salesData', 'inventory', 'expenses', 'waste', 'staff'];
    const setters = { 
      stock: setStock, salesData: setSalesData, inventory: setInventory, 
      expenses: setExpenses, waste: setWaste, staff: setStaff 
    };

    for (const col of collections) {
      try {
        const result = await api.get(`/api/get-data?collectionName=${col}`);
        if (result?.success && result?.data) {
          setters[col](result.data);
          localStorage.setItem(col, JSON.stringify(result.data));
        }
      } catch (err) {
        console.error(`Error fetching ${col}:`, err);
      }
    }
  };

  const syncToCloud = async (collectionName, data) => {
    if (!data || data.length === 0) return;
    await api.post('/api/sync', { collectionName, data });
  };

  useEffect(() => {
    fetchAllFromCloud();
  }, []);

  useEffect(() => {
    const syncMap = { stock, salesData, inventory, expenses, waste, staff };
    Object.entries(syncMap).forEach(([key, val]) => {
      syncToCloud(key, val);
      localStorage.setItem(key, JSON.stringify(val));
    });
  }, [stock, salesData, inventory, expenses, waste, staff]);

  // --- المحرك المالي ---
  const stats = useMemo(() => {
    const totalIncome = salesData.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    return { 
        totalIncome, 
        totalExpenses: totalExp, 
        netProfit: totalIncome - totalExp,
        stockValue: stock.reduce((sum, i) => sum + (parseFloat(i.price) * parseFloat(i.quantity) || 0), 0)
    };
  }, [salesData, expenses, stock]);

  return (
    <Router>
      <div className="app-container min-h-screen bg-pink-50/30 flex flex-col md:flex-row-reverse" dir="rtl">
        
        {/* القائمة الجانبية */}
        <aside className="hidden md:block w-64 bg-white/40 backdrop-blur-lg border-l border-white/20 p-6">
          <Sidebar />
        </aside>

        {/* منطقة عرض المحتوى الرئيسي */}
        <main className="flex-1 p-4 pb-24 md:pb-4 overflow-y-auto">
          <Routes>
            {/* الصفحة الرئيسية (Dashboard) */}
            <Route path="/" element={<DashboardHome stats={stats} staffCount={staff.length} />} />
            
            {/* صفحة المخزن */}
            <Route path="/inventory" element={
              <InventoryForm 
                stock={stock} 
                onSave={(item) => {
                  setStock(prev => [...prev, item]);
                  Swal.fire({ title: 'تم الحفظ سحابياً', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                }} 
              />
            } />

            {/* تعريف باقي المسارات لتعمل أزرار لوحة التحكم */}
            <Route path="/purchases" element={<div className="p-10 text-center">صفحة المشتريات (قريباً)</div>} />
            <Route path="/sales" element={<div className="p-10 text-center">صفحة المبيعات (قريباً)</div>} />
            <Route path="/production" element={<div className="p-10 text-center">صفحة الإنتاج (قريباً)</div>} />
            <Route path="/waste" element={<div className="p-10 text-center">صفحة الهالك (قريباً)</div>} />
            <Route path="/expenses" element={<div className="p-10 text-center">صفحة المصروفات (قريباً)</div>} />
            <Route path="/staff" element={<div className="p-10 text-center">صفحة العمالة (قريباً)</div>} />
            <Route path="/settings" element={<div className="p-10 text-center">الإعدادات والنسخ الاحتياطي</div>} />
          </Routes>
        </main>

        {/* Bottom Nav للموبايل */}
        <MobileNavigation />
      </div>
    </Router>
  );
};

// مكون التنقل للموبايل لضمان عمل الـ Navigation بسلاسة
const MobileNavigation = () => {
  const navigate = useNavigate();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/70 backdrop-blur-xl border-t border-white/30 flex justify-around items-center z-50">
       <button onClick={() => navigate('/')} className="flex flex-col items-center gap-1 text-pink-600">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold">الرئيسية</span>
       </button>
       <button onClick={() => navigate('/inventory')} className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">📦</span>
          <span className="text-[10px] font-bold">المخزن</span>
       </button>
       <button onClick={() => navigate('/settings')} className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] font-bold">إعدادات</span>
       </button>
    </nav>
  );
};

export default App;
