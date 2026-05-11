import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Tag, Factory, Warehouse, Trash2,
  Wallet, Truck, BarChart3, FileText, Users,
  TrendingUp, TrendingDown, DollarSign, Package, Settings, UserCheck
} from 'lucide-react';
import configData from '../nawah.config.json'; // استيراد إعدادات العميل

const Dashboard = ({ stats, staffCount }) => {
  const navigate = useNavigate(); // محرك التنقل الجديد بدلاً من setActivePage
  const s = stats || {};
  const clientName = configData?.clientName || "نظام معمول";

  // قائمة جميع الأقسام (الوظائف) مع المسارات الجديدة للروتر
  const sections = [
    { id: 'purchases', path: '/purchases', title: 'المشتريات', icon: <ShoppingCart size={28} />, color: 'text-orange-500', border: 'border-orange-500' },
    { id: 'sales', path: '/sales', title: 'المبيعات', icon: <Tag size={28} />, color: 'text-green-500', border: 'border-green-500' },
    { id: 'production', path: '/production', title: 'الإنتاج', icon: <Factory size={28} />, color: 'text-yellow-500', border: 'border-yellow-500' },
    { id: 'inventory', path: '/inventory', title: 'المخزن', icon: <Warehouse size={28} />, color: 'text-blue-500', border: 'border-blue-500' },
    { id: 'waste', path: '/waste', title: 'الهالك', icon: <Trash2 size={28} />, color: 'text-red-500', border: 'border-red-500' },
    { id: 'expenses', path: '/expenses', title: 'المصروفات', icon: <Wallet size={28} />, color: 'text-gray-500', border: 'border-gray-500' },
    { id: 'suppliers', path: '/suppliers', title: 'الموردين', icon: <Truck size={28} />, color: 'text-slate-700', border: 'border-slate-700' },
    { id: 'financials', path: '/financials', title: 'قوائم مالية', icon: <BarChart3 size={28} />, color: 'text-teal-600', border: 'border-teal-600' },
    { id: 'reports', path: '/reports', title: 'التقارير', icon: <FileText size={28} />, color: 'text-sky-600', border: 'border-sky-600' },
    { id: 'customers', path: '/customers', title: 'العملاء', icon: <Users size={28} />, color: 'text-emerald-600', border: 'border-emerald-600' },
    { id: 'staff', path: '/staff', title: 'العمالة', icon: <UserCheck size={28} />, color: 'text-cyan-500', border: 'border-cyan-500' },
  ];

  return (
    <div className="p-4 md:p-6 text-right animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans" dir="rtl">
      
      {/* 1. الترويسة العلوية (Header) */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-[24px] text-white mb-6 relative overflow-hidden shadow-xl shadow-slate-200">
        <div className="relative z-10">
          <h1 className="text-2xl font-black mb-1">{clientName}</h1>
          <p className="opacity-70 text-sm">لوحة التحكم الشاملة المدعومة بالذكاء الاصطناعي</p>
        </div>
        <Settings size={120} className="absolute -left-6 -bottom-6 opacity-5 text-white" />
      </div>

      {/* 2. بطاقات الإحصائيات المالية (Stats) بتصميم Glassmorphism */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'الإيرادات', value: s.totalIncome || 0, icon: <TrendingUp size={20} className="text-green-500" />, textColor: 'text-green-600' },
          { label: 'المصروفات', value: s.totalExpenses || 0, icon: <TrendingDown size={20} className="text-red-500" />, textColor: 'text-red-600' },
          { label: 'صافي الربح', value: s.netProfit || 0, icon: <DollarSign size={20} className="text-amber-500" />, textColor: (s.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600' },
          { label: 'قيمة المخزن', value: s.stockValue || 0, icon: <Package size={20} className="text-blue-500" />, textColor: 'text-blue-600' },
        ].map((item, i) => (
          <div key={i} className="bg-white/50 backdrop-blur-lg border border-white/60 shadow-lg shadow-pink-50/50 p-4 rounded-3xl text-center flex flex-col items-center justify-center transition-transform hover:scale-105">
            <div className="bg-white p-2 rounded-full shadow-sm mb-2">{item.icon}</div>
            <div className="text-xs text-slate-500 font-bold mb-1">{item.label}</div>
            <div className={`text-lg font-black ${item.textColor}`}>
              {item.value.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">ج.م</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. شبكة الأقسام والوظائف (Modules Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sections.map((sec) => (
          <div
            key={sec.id}
            onClick={() => navigate(sec.path)} // التوجيه عبر المسار الجديد
            className={`bg-white/40 backdrop-blur-md border-t-4 ${sec.border} border-x border-b border-white/60 shadow-md shadow-slate-100 p-5 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/70 active:scale-95 transition-all duration-200 group`}
          >
            <div className={`${sec.color} mb-3 group-hover:scale-110 transition-transform duration-300`}>
              {sec.icon}
            </div>
            <span className="text-sm font-bold text-slate-700">{sec.title}</span>
          </div>
        ))}
      </div>

      {/* 4. زر الإعدادات السفلي */}
      <div 
        onClick={() => navigate('/settings')} 
        className="mt-8 bg-white/40 backdrop-blur-md border border-white/60 p-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-slate-500 font-bold hover:bg-white hover:text-slate-800 transition-all shadow-sm"
      >
        <Settings size={20} /> الإعدادات والنسخ الاحتياطي السحابي
      </div>
      
      {/* مساحة فارغة للـ Mobile Nav */}
      <div className="h-24 md:h-4"></div>
    </div>
  );
};

export default Dashboard;
