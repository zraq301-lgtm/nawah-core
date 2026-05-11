import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CapacitorHttp, Capacitor } from '@capacitor/core';

// استيراد المكونات (تأكد من مطابقة المسارات في مشروعك)
import Sidebar from './components/shared/Sidebar';
import DashboardHome from './features/DashboardHome';
import InventoryForm from './features/inventory/InventoryForm';
import configData from './nawah.config.json';

import './App.css';

// --- الرابط الأساسي الجديد ---
const BASE_URL = "https://nawah-aioi.vercel.app";

// --- محرك الاتصال الموحد (HTTP Handlers) ---
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
  // --- States (نفس الأسماء السابقة لضمان التوافق) ---
  const [stock, setStock] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [waste, setWaste] = useState([]);
  const [staff, setStaff] = useState([]);

  // --- نظام المزامنة مع الرابط الجديد ---
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

  // --- تحميل البيانات عند البداية ---
  useEffect(() => {
    fetchAllFromCloud();
  }, []);

  // --- المزامنة التلقائية عند أي تغيير ---
  useEffect(() => {
    const syncMap = { stock, salesData, inventory, expenses, waste, staff };
    Object.entries(syncMap).forEach(([key, val]) => {
      syncToCloud(key, val);
      localStorage.setItem(key, JSON.stringify(val));
    });
  }, [stock, salesData, inventory, expenses, waste, staff]);

  // --- المحرك المالي (useMemo للحسابات الدقيقة) ---
  const stats = useMemo(() => {
    const totalIncome = salesData.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const cashBalance = totalIncome - totalExp;
    return { totalIncome, totalExpenses: totalExp, cashBalance };
  }, [salesData, expenses]);

  return (
    <Router>
      <div className="app-container min-h-screen bg-pink-50/30 flex flex-col md:flex-row-reverse" dir="rtl">
        
        {/* Sidebar */}
        <aside className="hidden md:block w-64 bg-white/40 backdrop-blur-lg border-l border-white/20 p-6">
          <Sidebar />
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 pb-24 md:pb-4">
          <Routes>
            <Route path="/" element={<DashboardHome stats={stats} staffCount={staff.length} />} />
            <Route path="/inventory" element={
              <InventoryForm 
                stock={stock} 
                onSave={(item) => {
                  setStock(prev => [...prev, item]);
                  Swal.fire({ title: 'تم الحفظ سحابياً', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                }} 
              />
            } />
            {/* باقي المسارات تتبع نفس النمط */}
          </Routes>
        </main>

        {/* Bottom Nav للموبايل */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/70 backdrop-blur-xl border-t border-white/30 flex justify-around items-center z-50">
           <button onClick={() => window.location.href='/'} className="flex flex-col items-center gap-1 text-pink-600">
              <span className="text-xl">🏠</span>
              <span className="text-[10px] font-bold">الرئيسية</span>
           </button>
           <button onClick={() => window.location.href='/inventory'} className="flex flex-col items-center gap-1 text-gray-400">
              <span className="text-xl">📦</span>
              <span className="text-[10px] font-bold">المخزن</span>
           </button>
        </nav>
      </div>
    </Router>
  );
};

export default App;
