import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import LoginPage from "./components/LoginPage.jsx"; // تأكد من المسار الصحيح
import "./index.css";
import "./App.css";

const RootComponent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // التأكد إذا كان المستخدم مسجل دخوله مسبقاً في أودو
    const uid = localStorage.getItem('uid');
    if (uid) {
      setIsAuthenticated(true);
    }
  }, []);

  // إذا سجل دخوله، افتح التطبيق الرئيسي (المخزن)، وإذا لم يسجل، افتح صفحة تسجيل الدخول
  return isAuthenticated ? <App /> : <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
