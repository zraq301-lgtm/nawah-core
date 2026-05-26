import React, { useState, useMemo, useEffect } from 'react';
import { CapacitorHttp } from '@capacitor/core';
import Swal from 'sweetalert2';
import {
  ShoppingCart, Tag, Factory, Warehouse, Trash2,
  Wallet, Truck, BarChart3, FileText, Users,
  TrendingUp, TrendingDown, DollarSign, Package, Settings, UserCheck,
  ClipboardList, Activity, BarChart, Cpu, Sparkles, Loader2, Clock, Calendar
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Dashboard = ({ 
  setActivePage, 
  stats = {}, 
  productionData = [], // تم ضبط الاسم ليتوافق مع App.jsx
  stock = [], 
  onDeleteItem, // دالة الحذف الموحدة
  // لا نحتاج لجلب بيانات يدوياً هنا، الـ App يقوم بذلك عبر useEffect
}) => {
  const [isAiLoading, setIsAiLoading] = useState(false);

  const sections = [
    { id: 'PurchasesManager', title: 'المشتريات', icon: <ShoppingCart size={28}/>, color: '#e67e22' },
    { id: 'Sales', title: 'المبيعات', icon: <Tag size={28}/>, color: '#2ecc71' },
    { id: 'ProductionManager', title: 'الإنتاج', icon: <Factory size={28}/>, color: '#f59e0b' },
    { id: 'Inventory', title: 'المخزن', icon: <Warehouse size={28}/>, color: '#3498db' },
    { id: 'Waste', title: 'الهالك', icon: <Trash2 size={28}/>, color: '#e74c3c' },
    { id: 'Expenses', title: 'المصروفات', icon: <Wallet size={28}/>, color: '#7f8c8d' },
    { id: 'Suppliers', title: 'الموردين', icon: <Truck size={28}/>, color: '#34495e' },
    { id: 'Financials', title: 'قوائم مالية', icon: <BarChart3 size={28}/>, color: '#16a085' },
    { id: 'Reports', title: 'التقارير', icon: <FileText size={28}/>, color: '#2980b9' },
    { id: 'Customers', title: 'العملاء', icon: <Users size={28}/>, color: '#27ae60' },
    { id: 'StaffManagement', title: 'العمالة', icon: <UserCheck size={28}/>, color: '#0ea5e9' },
  ];

  const chartData = useMemo(() => {
    if (!productionData || !Array.isArray(productionData)) return [];
    return productionData.map(item => ({
      name: item.date ? item.date.split('-').slice(1).join('/') : '', 
      كمية: parseFloat(item.products?.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0) || 0),
      تكلفة: parseFloat(item.totalActualCost || 0)
    })).slice(-7); 
  }, [productionData]);

  const generateTodayReport = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayProd = productionData.filter(p => p.date === today);
    const totalCost = todayProd.reduce((sum, p) => sum + parseFloat(p.totalActualCost || 0), 0);
    const lowStockCount = stock.filter(i => parseFloat(i.balance || i.quantity || 0) < 5).length;

    Swal.fire({
      title: '📊 تقرير حالة المصنع',
      html: `<div style="text-align: right; font-family: 'Tajawal', sans-serif; line-height: 1.8;">
          <p>📅 إنتاج اليوم: <b>${todayProd.length} وردية</b></p>
          <p>💰 إجمالي تكلفة اليوم: <b style="color: #e67e22">${totalCost.toFixed(2)} ج.م</b></p>
          <p>📦 أصناف المخزن: <b>${stock.length} صنف</b></p>
          <p>⚠️ أصناف أوشكت على النفاذ: <b style="color: #ef4444">${lowStockCount}</b></p>
        </div>`,
      icon: 'info', confirmButtonText: 'ممتاز'
    });
  };

  const analyzeWithAI = async () => {
    if (!productionData.length && !stock.length) {
        Swal.fire('تنبيه', 'لا توجد بيانات كافية للتحليل حالياً', 'warning');
        return;
    }
    setIsAiLoading(true);
    try {
      const response = await CapacitorHttp.post({
        url: 'https://maamoul-one.vercel.app/api/raqqa-ai',
        headers: { 'Content-Type': 'application/json' },
        data: { prompt: `تحليل بيانات مصنع بناء على: ${JSON.stringify(productionData.slice(-5))}` }
      });
      Swal.fire({ title: '🤖 تحليل الذكاء الصناعي', text: response.data?.message || "النظام يعمل بكفاءة", icon: 'success' });
    } catch (error) {
      Swal.fire('عذراً', 'الخدمة غير متوفرة حالياً', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '25px 20px', borderRadius: '24px', color: '#fff', marginBottom: '20px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Cpu size={20} color="#0ea5e9"/>
            <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: '800', letterSpacing: '0.5px' }}>nawah.ai</h1>
          </div>
          <p style={{ opacity: 0.7, margin: 0, fontSize: '0.85rem' }}>نظام إدارة الموارد والذكاء الاصطناعي الشامل</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <button onClick={analyzeWithAI} disabled={isAiLoading} style={{ padding: '15px', borderRadius: '16px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: '#fff', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
          {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Cpu size={18} />} ذكاء صناعي
        </button>
        <button onClick={generateTodayReport} style={{ padding: '15px', borderRadius: '16px', background: '#1e293b', color: '#fff', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
          <BarChart3 size={18} /> التقرير الفوري
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'الإيرادات', value: stats.totalIncome || 0, icon: <TrendingUp size={18} color="#2ecc71"/>, color: '#2ecc71' },
          { label: 'المصروفات', value: stats.totalExpenses || 0, icon: <TrendingDown size={18} color="#e74c3c"/>, color: '#e74c3c' },
          { label: 'صافي الربح', value: stats.netProfit || 0, icon: <DollarSign size={18} color="#f59e0b"/>, color: '#2ecc71' },
          { label: 'قيمة المخزن', value: stats.stockValue || 0, icon: <Package size={18} color="#3498db"/>, color: '#3498db' },
        ].map((item, i) => (
          <div key={i} style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '14px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            {item.icon}
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{item.label}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: item.color }}>{item.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '20px', marginBottom: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b', fontWeight: 'bold' }}>
          <TrendingUp size={18} color="#e67e22" /> منحنى الإنتاج
        </h3>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" style={{fontSize: '10px'}} />
              <Tooltip />
              <Area type="monotone" dataKey="كمية" stroke="#e67e22" fillOpacity={0.1} fill="#e67e22" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {sections.map((sec) => (
          <div key={sec.id} onClick={() => setActivePage(sec.id)} style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '18px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', borderTop: `4px solid ${sec.color}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ color: sec.color, marginBottom: '8px' }}>{sec.icon}</div>
            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#334155' }}>{sec.title}</span>
          </div>
        ))}
      </div>
      
      <div onClick={() => setActivePage('Settings')} style={{ backgroundColor: '#fff', borderRadius: '16px', marginTop: '20px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', color: '#64748b', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
        <Settings size={20}/> إعدادات النظام والنسخ الاحتياطي
      </div>
      <div style={{ height: '100px' }}></div>
    </div>
  );
};

export default Dashboard;
