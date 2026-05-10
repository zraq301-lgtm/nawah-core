import React from 'react';

const Sidebar = () => {
  const menuItems = [
    { name: 'لوحة التحكم', icon: '📊', active: true },
    { name: 'المخزون الذكي', icon: '📦', active: false },
    { name: 'تحليل الهالك', icon: '♻️', active: false },
    { name: 'مركز التلمذة', icon: '🎓', active: false },
    { name: 'التقارير المالية', icon: '💰', active: false },
    { name: 'الإعدادات', icon: '⚙️', active: false },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="mb-10 px-2">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent">
          Nawah AI
        </h1>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest">OS & Academy</p>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item, index) => (
          <div
            key={index}
            className={`flex items-center p-3 cursor-pointer rounded-xl transition-all ${
              item.active 
              ? 'bg-white bg-opacity-40 shadow-sm text-blue-600' 
              : 'hover:bg-white hover:bg-opacity-20 text-gray-600'
            }`}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            <span className="font-medium text-sm">{item.name}</span>
          </div>
        ))}
      </nav>

      <div className="mt-auto p-4 bg-white bg-opacity-10 rounded-2xl border border-white border-opacity-20">
        <p className="text-xs text-gray-500 text-center">الإصدار 1.0.0 Beta</p>
      </div>
    </div>
  );
};

export default Sidebar;
