import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import LoginPage from "./components/LoginPage.jsx"; 
import "./index.css";
import "./App.css";

const RootComponent = () => {
  // قراءة حالة التوثيق مباشرة من التخزين المحلي باستخدام معرف سوبابيز الجديد
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('supabase_uid'));

  // المكون يغير الحالة فوراً عند نجاح تسجيل الدخول دون الحاجة لفحص دوري
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
