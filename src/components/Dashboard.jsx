import React from 'react';
import {
  ShoppingCart, Tag, Factory, Warehouse, Trash2,
  Wallet, Truck, BarChart3, FileText, Users,
  TrendingUp, TrendingDown, DollarSign, Package, Settings, UserCheck
} from 'lucide-react';

const Dashboard = ({ setActivePage, stats, staffCount }) => {
  const sections = [
    { id: 'purchases', title: 'المشتريات', icon: <ShoppingCart size={28} />, color: '#e67e22' },
    { id: 'sales', title: 'المبيعات', icon: <Tag size={28} />, color: '#2ecc71' },
    { id: 'production', title: 'الإنتاج', icon: <Factory size={28} />, color: '#f59e0b' },
    { id: 'inventory', title: 'المخزن', icon: <Warehouse size={28} />, color: '#3498db' },
    { id: 'waste', title: 'الهالك', icon: <Trash2 size={28} />, color: '#e74c3c' },
    { id: 'expenses', title: 'المصروفات', icon: <Wallet size={28} />, color: '#7f8c8d' },
    { id: 'suppliers', title: 'الموردين', icon: <Truck size={28} />, color: '#34495e' },
    { id: 'financials', title: 'قوائم مالية', icon: <BarChart3 size={28} />, color: '#16a085' },
    { id: 'reports', title: 'التقارير', icon: <FileText size={28} />, color: '#2980b9' },
    { id: 'customers', title: 'العملاء', icon: <Users size={28} />, color: '#27ae60' },
    { id: 'staff', title: 'العمالة', icon: <UserCheck size={28} />, color: '#0ea5e9' },
  ];

  const s = stats || {};

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        padding: '25px 20px', borderRadius: '24px', color: '#fff', marginBottom: '20px',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 5px 0', fontWeight: '800' }}>نظام معمول</h1>
          <p style={{ opacity: 0.7, margin: 0, fontSize: '0.9rem' }}>لوحة التحكم الشاملة</p>
        </div>
        <Settings size={100} style={{ position: 'absolute', left: '-15px', bottom: '-15px', opacity: 0.05, color: '#fff' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'الإيرادات', value: s.totalIncome || 0, icon: <TrendingUp size={18} color="#2ecc71" />, color: '#2ecc71' },
          { label: 'المصروفات', value: s.totalExpenses || 0, icon: <TrendingDown size={18} color="#e74c3c" />, color: '#e74c3c' },
          { label: 'صافي الربح', value: s.netProfit || 0, icon: <DollarSign size={18} color="#f59e0b" />, color: (s.netProfit || 0) >= 0 ? '#2ecc71' : '#e74c3c' },
          { label: 'قيمة المخزن', value: s.stockValue || 0, icon: <Package size={18} color="#3498db" />, color: '#3498db' },
        ].map((item, i) => (
          <div key={i} className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            {item.icon}
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{item.label}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: item.color }}>{item.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {sections.map((sec) => (
          <div
            key={sec.id}
            onClick={() => setActivePage(sec.id)}
            className="glass-card"
            style={{
              padding: '18px 10px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'transform 0.2s ease', borderTop: `4px solid ${sec.color}`,
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ color: sec.color, marginBottom: '8px' }}>{sec.icon}</div>
            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#334155' }}>{sec.title}</span>
          </div>
        ))}
      </div>

      <div onClick={() => setActivePage('settings')} className="glass-card" style={{ marginTop: '20px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', color: '#64748b', fontWeight: 'bold' }}>
        <Settings size={20} /> الإعدادات والنسخ الاحتياطي
      </div>
      <div style={{ height: '100px' }}></div>
    </div>
  );
};

export default Dashboard;
