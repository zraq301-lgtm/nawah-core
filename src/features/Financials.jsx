import React, { useState } from 'react';
import { BarChart3, ArrowRight, TrendingUp, TrendingDown, DollarSign, PieChart, Package, Wallet, FileSpreadsheet, PlusCircle, Trash2, X } from 'lucide-react';

const Financials = ({ onBack, stats = {}, cashBook = [] }) => {
  const [showExcelView, setShowExcelView] = useState(false); // حالة إظهار الجدول
  const s = stats;
  const netProfit = s.netProfit || 0;

  // --- وظيفة "فتح الإكسل" داخل التطبيق ---
  const handleOpenExcelView = () => {
    setShowExcelView(true);
  };

  const statItems = [
    { label: 'إجمالي الإيرادات', value: s.totalIncome || 0, icon: <TrendingUp size={18} color="#2ecc71" />, color: '#2ecc71', bg: 'rgba(236, 253, 245, 0.8)' },
    { label: 'إجمالي المصروفات', value: s.totalExpenses || 0, icon: <TrendingDown size={18} color="#e74c3c" />, color: '#e74c3c', bg: 'rgba(254, 226, 226, 0.8)' },
    { label: 'قيمة الهالك', value: s.totalWasteValue || 0, icon: <PieChart size={18} color="#f59e0b" />, color: '#f59e0b', bg: 'rgba(254, 243, 199, 0.8)' },
    { label: 'مشتريات كاش', value: s.totalPurchasesCash || 0, icon: <Wallet size={18} color="#7f8c8d" />, color: '#7f8c8d', bg: 'rgba(241, 245, 249, 0.8)' },
    { label: 'قيمة المخزن', value: s.stockValue || 0, icon: <Package size={18} color="#3498db" />, color: '#3498db', bg: 'rgba(239, 246, 255, 0.8)' },
    { label: 'رصيد الخزينة', value: s.cashBalance || 0, icon: <DollarSign size={18} color="#16a085" />, color: '#16a085', bg: 'rgba(240, 253, 244, 0.8)' },
  ];

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh', position: 'relative' }}>
      
      {/* نافذة عرض الإكسل (الجدول المجدول) */}
      {showExcelView && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'white', zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileSpreadsheet color="#1d6f42" />
              <h3 style={{ margin: 0 }}>عرض البيانات المجدولة</h3>
            </div>
            <button onClick={() => setShowExcelView(false)} style={{ background: '#eee', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>

          <div style={{ overflow: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#1d6f42', color: 'white' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>التاريخ</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>البيان</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>النوع</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {cashBook.map((entry, idx) => (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.timestamp}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.description || entry.category}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', color: entry.type === 'in' ? 'green' : 'red' }}>{entry.type === 'in' ? 'وارد' : 'صادر'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>{parseFloat(entry.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#666', textAlign: 'center' }}>تم استخراج البيانات بتاريخ {new Date().toLocaleDateString('ar-EG')}</p>
        </div>
      )}

      <div className="page-header"><BarChart3 size={28} color="#16a085" /><h2>القوائم المالية</h2></div>

      {/* الأزرار */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '15px' }}>
        <button onClick={handleOpenExcelView} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '10px', border: 'none', borderRadius: '12px', backgroundColor: '#1d6f42', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}>
          <FileSpreadsheet size={20} /> فتح Excel
        </button>
        <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '10px', border: 'none', borderRadius: '12px', backgroundColor: '#3498db', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}>
          <PlusCircle size={20} /> إضافة قائمة
        </button>
        <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '10px', border: 'none', borderRadius: '12px', backgroundColor: '#e74c3c', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}>
          <Trash2 size={20} /> حذف قائمة
        </button>
      </div>

      {/* باقي الكود الأصلي (الملخص المالي) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
        {statItems.map((item, i) => (
          <div key={i} className="glass-card" style={{ padding: '14px', background: item.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>{item.icon}<span style={{ fontSize: '0.8rem', color: '#475569' }}>{item.label}</span></div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: item.color }}>{item.value.toLocaleString()} <small style={{ fontSize: '0.7rem' }}>ج.م</small></div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '25px', textAlign: 'center', background: netProfit >= 0 ? 'rgba(220, 252, 231, 0.8)' : 'rgba(254, 226, 226, 0.8)', marginBottom: '15px' }}>
        <div style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '8px' }}>صافي الأرباح</div>
        <div style={{ fontSize: '2rem', fontWeight: '900', color: netProfit >= 0 ? '#166534' : '#991b1b' }}>{netProfit.toLocaleString()} <small style={{ fontSize: '1rem' }}>ج.م</small></div>
      </div>

      <button onClick={onBack} className="btn-back"><ArrowRight size={18} /> العودة للوحة التحكم</button>
    </div>
  );
};

export default Financials;
