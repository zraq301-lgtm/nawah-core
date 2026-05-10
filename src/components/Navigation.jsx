import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// استدعاء الصفحة باستخدام Lazy Loading للأداء العالي
const DashboardHome = lazy(() => import('../features/DashboardHome'));
const InventoryForm = lazy(() => import('../features/inventory/InventoryForm'));

export const NavigationContainer = () => {
  return (
    <Suspense fallback={<div className="p-10 text-center text-pink-500">جاري تحميل الوحدة...</div>}>
      <Routes>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/inventory" element={<InventoryForm />} />
        {/* المسارات الأخرى تضاف هنا بنفس الطريقة */}
      </Routes>
    </Suspense>
  );
};
