import React from 'react';

const TopBar = ({ title }) => {
  return (
    <div className="flex items-center justify-between w-full px-2">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-400">مرحباً بك في نظام نـواة الذكي</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex bg-white bg-opacity-30 rounded-full px-4 py-1 border border-white border-opacity-40">
          <input 
            type="text" 
            placeholder="بحث عن وحدة..." 
            className="bg-transparent border-none outline-none text-sm w-48 placeholder-gray-400"
          />
        </div>
        
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-300 to-blue-300 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold">
          N
        </div>
      </div>
    </div>
  );
};

export default TopBar;
