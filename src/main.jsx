import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import LoginPage from "./components/LoginPage.jsx"; 
import "./index.css";
import "./App.css";

const RootComponent = () => {
  // توحيد المسمى ليكون odoo_uid ليطابق ملف App.jsx
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('odoo_uid'));

  useEffect(() => {
    const checkAuth = () => {
      const uid = localStorage.getItem('odoo_uid');
      if (uid) {
        setIsAuthenticated(true);
      }
    };
    // فحص دوري سريع للتأكد من استجابة الحالة
    const interval = setInterval(checkAuth, 500);
    return () => clearInterval(interval);
  }, []);

  return isAuthenticated ? (
    <App />
  ) : (
    <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
