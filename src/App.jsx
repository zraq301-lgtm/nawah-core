import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { AdMob } from '@capacitor-community/admob';
import { NavigationContainer } from './components/Navigation'; // افترضنا وجوده
import Sidebar from './components/shared/Sidebar';
import TopBar from './components/shared/TopBar';

// استيراد الثيم الخاص بـ Nawah (Glassmorphism)
const glassStyle = "bg-white bg-opacity-20 backdrop-blur-lg border border-white border-opacity-30 rounded-2xl shadow-xl";

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializePlatform = async () => {
      // 1. تهيئة AdMob للربحية
      try {
        await AdMob.initialize();
      } catch (e) {
        console.error("AdMob Init Error:", e);
      }

      // 2. إعداد التنبيهات (Push Notifications)
      if (Capacitor.getPlatform() !== 'web') {
        setupNotifications();
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
        <div className="animate-pulse text-pink-400 font-bold text-xl">Nawah AI-OS Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50 p-4 md:p-6">
      {/* Container الرئيسي بنمط Glassmorphism */}
      <div className={`flex h-[92vh] overflow-hidden ${glassStyle}`}>
        
        {/* الشريط الجانبي - Sidebar */}
        <aside className="w-64 hidden md:block border-r border-white border-opacity-20 p-4">
          <Sidebar />
        </aside>

        {/* محتوى التطبيق الرئيسي */}
        <main className="flex-1 flex flex-col relative overflow-y-auto">
          <header className="p-4">
            <TopBar title="Nawah AI-OS Dashboard" />
          </header>

          <section className="p-6">
            {/* هنا يتم استدعاء الراوتر أو المكونات الأساسية بناءً على الخطة */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* بطاقة تحليل المخزون الذكي (AI Module) */}
              <div className={`p-6 ${glassStyle} hover:scale-105 transition-transform cursor-pointer`}>
                <h3 className="text-gray-700 font-bold mb-2">📦 المخزون التنبؤي</h3>
                <p className="text-sm text-gray-500">تحليل النواقص باستخدام AI قبل حدوثها.</p>
                <button className="mt-4 text-xs bg-blue-400 text-white px-3 py-1 rounded-full">تحليل الآن</button>
              </div>

              {/* بطاقة تدريب المطورين (Apprenticeship Hub) */}
              <div className={`p-6 ${glassStyle} hover:scale-105 transition-transform cursor-pointer`}>
                <h3 className="text-gray-700 font-bold mb-2">🎓 مركز التلمذة</h3>
                <p className="text-sm text-gray-500">مراجعة الكود برمجياً وتوجيهات معمارية.</p>
                <div className="mt-4 flex -space-x-2">
                   <div className="w-8 h-8 rounded-full bg-pink-200 border-2 border-white"></div>
                   <div className="w-8 h-8 rounded-full bg-blue-200 border-2 border-white"></div>
                </div>
              </div>

              {/* بطاقة الأرباح (Monetization) */}
              <div className={`p-6 ${glassStyle} hover:scale-105 transition-transform cursor-pointer`}>
                <h3 className="text-gray-700 font-bold mb-2">💰 الأرباح والنمو</h3>
                <p className="text-sm text-gray-500">متابعة CPC و CPM من AdMob/Adsterra.</p>
                <div className="mt-2 text-2xl font-bold text-green-500">$0.00</div>
              </div>

            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;
