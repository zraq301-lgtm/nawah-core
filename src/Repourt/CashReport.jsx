import React from 'react';
import * as XLSX from 'xlsx';
import { BadgeDollarSign, Download, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

export default function CashReport({ salesData = [], inventory = [], expenses = [], onBack }) {
  const exportCashFlowExcel = () => {
    const cashIn = salesData.map(s => ({ "التاريخ": s.date, "البيان": "مبيعات", "وارد (+)": s.total, "صادر (-)": 0 }));
    const cashOutPurchases = inventory.filter(p => p.paymentMethod === 'كاش').map(p => ({ "التاريخ": p.date, "البيان": `شراء: ${p.item}`, "وارد (+)": 0, "صادر (-)": p.total }));
    const cashOutExpenses = expenses.map(e => ({ "التاريخ": e.date, "البيان": `مصروف: ${e.category}`, "وارد (+)": 0, "صادر (-)": e.amount }));
    const allTransactions = [...cashIn, ...cashOutPurchases, ...cashOutExpenses].sort((a, b) => new Date(a.التاريخ) - new Date(b.التاريخ));
    const ws = XLSX.utils.json_to_sheet(allTransactions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "حركة الخزينة");
    XLSX.writeFile(wb, "Cash_Flow_Report_2026.xlsx");
  };
  const totalIn = salesData.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalOut = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) + inventory.filter(p => p.paymentMethod === 'كاش').reduce((sum, p) => sum + (p.total || 0), 0);

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      <div className="page-header"><button onClick={onBack} style={{ border: 'none', background: 'rgba(226, 232, 240, 0.5)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><ArrowRight size={20} /></button><h2>التقرير النقدي (الخزينة)</h2></div>
      <div className="glass-card" style={{ borderRight: '6px solid #e67e22', textAlign: 'center' }}>
        <BadgeDollarSign size={50} color="#e67e22" style={{ margin: '0 auto 15px' }} /><h3>ملخص التدفق النقدي</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
          <div style={{ background: 'rgba(240, 253, 244, 0.8)', padding: '12px', borderRadius: '14px' }}><TrendingUp size={16} color="#27ae60" /><div style={{ fontSize: '0.8rem', color: '#64748b' }}>إجمالي الوارد</div><strong style={{ color: '#27ae60' }}>{totalIn.toLocaleString()}</strong></div>
          <div style={{ background: 'rgba(254, 242, 242, 0.8)', padding: '12px', borderRadius: '14px' }}><TrendingDown size={16} color="#e74c3c" /><div style={{ fontSize: '0.8rem', color: '#64748b' }}>إجمالي المنصرف</div><strong style={{ color: '#e74c3c' }}>{totalOut.toLocaleString()}</strong></div>
        </div>
        <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(248, 250, 252, 0.8)', borderRadius: '14px' }}><span style={{ fontSize: '0.85rem', color: '#64748b' }}>رصيد الخزينة:</span><div style={{ fontSize: '1.5rem', fontWeight: '800', color: (totalIn - totalOut) >= 0 ? '#27ae60' : '#e74c3c' }}>{(totalIn - totalOut).toLocaleString()} ج.م</div></div>
        <button onClick={exportCashFlowExcel} className="btn-primary" style={{ backgroundColor: '#e67e22', boxShadow: '0 4px 15px rgba(230, 126, 34, 0.3)', marginTop: '20px' }}><Download size={20} /> تحميل تقرير الخزينة (Excel)</button>
      </div>
    </div>
  );
}
