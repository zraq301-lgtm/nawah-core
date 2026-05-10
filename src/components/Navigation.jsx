import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardHome from '../features/DashboardHome';
import InventoryPage from '../features/inventory/InventoryPage'; // إذا كنت قد أنشأته
import WasteAnalysis from '../features/waste-calc/WasteAnalysis'; // إذا كنت قد أنشأته

export const NavigationContainer = () => {
  return (
    <Routes>
      <Route path="/" element={<DashboardHome />} />
      
      {/* أضف المسارات الجديدة هنا كما في الخطة */}
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/waste" element={<WasteAnalysis />} />
    </Routes>
  );
};
