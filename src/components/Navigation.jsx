import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardHome from '../features/DashboardHome'; // سننشئه بالأسفل

export const NavigationContainer = ({ children }) => {
  return (
    <Router>
      {children}
      <Routes>
        <Route path="/" element={<DashboardHome />} />
        {/* يمكنك إضافة مسارات أخرى هنا مثل /inventory أو /ai-hub */}
      </Routes>
    </Router>
  );
};
