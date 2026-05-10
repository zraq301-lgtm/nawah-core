import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { AdMob } from '@capacitor-community/admob';

// استيراد المكونات التي أنشأناها
import { NavigationContainer } from './components/Navigation';
import Sidebar from './components/shared/Sidebar';
import TopBar from './components/shared/TopBar';

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);

  // نمط الزجاج (Glassmorphism) الموحد للنظام
  const glassStyle = "bg-white/20 backdrop-blur-lg border border-white/30 rounded-3xl shadow-xl";

  useEffect(() => {
    const initializePlatform = async () => {
      // تهيئة خدمات الموبايل (AdMob & Notifications)
      try {
        if (Capacitor.isNativePlatform()) {
          await AdMob.initialize();
          setupNotifications();
        }
      } catch (e) {
        console.warn("Mobile services init skipped or failed:", e);
      }
      setIsInitializing(false);
    };

    initializePlatform();
  }, []);

  const setupNotifications = async () => {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive === 'granted') {
      await PushNotifications.register();
    }
  };

  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-pink-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-400"></div>
          <div className="animate-pulse text-pink-400 font-bold text-xl tracking-widest">NAWAH AI-OS</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50 p-3 md:p-6 flex items-center justify-center">
        
        {/* الحاوية الرئيسية للهيكل التنظيمي */}
        <div className={`flex w-full max-w-7xl h-[90vh] overflow-hidden ${glassStyle}`}>
          
          {/* 1. الشريط الجانبي (Sidebar) */}
          <aside className="w-64 hidden lg:block border-r border-white/20 p-6">
            <Sidebar />
          </aside>

          {/* 2. منطقة المحتوى (Main Content Area) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* الشريط العلوي (TopBar) */}
            <header className="p-4 border-b border-white/10">
              <TopBar title="Nawah AI-OS Dashboard" />
            </header>

            {/* محرك الصفحات (Navigation) */}
            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <NavigationContainer />
            </main>
            
          </div>
        </div>
      </div>
    </Router>
  );
};

export default App;
