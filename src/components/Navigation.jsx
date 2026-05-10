import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// استخدام Lazy Loading يجعل Vite أكثر تسامحاً أثناء البناء
const DashboardHome = lazy(() => import('../features/DashboardHome'));
const InventoryPage = lazy(() => import('../features/inventory/InventoryPage'));

export const NavigationContainer = () => {
  return (
    <Suspense fallback={<div className="p-4 text-pink-400">جاري التحميل...</div>}>
      <Routes>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/inventory" element={<InventoryPage />} />
        
        {/* إذا لم تكن متأكداً من وجود ملف WasteAnalysis، عطل السطر التالي بوضع // قبله */}
        {/* <Route path="/waste" element={<div>قريباً</div>} /> */}
      </Routes>
    </Suspense>
  );
};
