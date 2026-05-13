import React from 'react';
import * as XLSX from 'xlsx';
import { Wallet, Download, ArrowRight, PieChart, FileSpreadsheet } from 'lucide-react';

export default function ExpenseReports({ expensesData = [], onBack }) {
  const exportExpensesExcel = () => {
    if (!expensesData || expensesData.length === 0) { alert("لا توجد بيانات مصروفات"); return; }
    const data = expensesData.map(exp => ({ "التاريخ": exp.date, "بند المصروف": exp.category || 'غير مصنف', "البيان": exp.description || '', "المبلغ": parseFloat(exp.amount || 0) }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل المصروفات"); XLSX.writeFile(wb, `Expenses_Report_${new Date().getMonth() + 1}_2026.xlsx`);
  };
  const totalExpenses = expensesData.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      <div className="page-header"><button onClick={onBack} style={{ border: 'none', background: 'rgba(226, 232, 240, 0.5)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><ArrowRight size={20} /></button><h2>تقرير المصروفات</h2></div>
      <div className="glass-card" style={{ borderRight: '6px solid #7f8c8d', textAlign: 'center' }}>
        <div style={{ color: '#7f8c8d', marginBottom: '15px' }}><Wallet size={50} style={{ margin: '0 auto' }} /></div>
        <h3 style={{ margin: '0 0 10px 0' }}>كشف المصروفات</h3>
        <div style={{ background: 'rgba(248, 250, 252, 0.8)', padding: '15px', borderRadius: '15px', marginTop: '15px', border: '1px dashed rgba(203, 213, 225, 0.5)' }}><span style={{ fontSize: '0.9rem', color: '#64748b' }}>إجمالي المصروفات:</span><div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#e74c3c' }}>{totalExpenses.toLocaleString()} <small style={{ fontSize: '0.8rem' }}>ج.م</small></div></div>
        <button onClick={exportExpensesExcel} className="btn-primary" style={{ backgroundColor: '#34495e', boxShadow: '0 4px 15px rgba(52, 73, 94, 0.3)', marginTop: '20px' }}><FileSpreadsheet size={20} /> تحميل كشف المصروفات (Excel)</button>
      </div>
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ marginBottom: '12px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}><PieChart size={18} /> آخر العمليات:</h4>
        {expensesData.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center' }}>لا توجد مصروفات مسجلة</p> : expensesData.slice(-5).reverse().map((exp, i) => (
          <div key={i} className="glass-card" style={{ marginBottom: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{exp.category}</div><div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{exp.date}</div></div>
            <div style={{ fontWeight: 'bold', color: '#e74c3c' }}>-{parseFloat(exp.amount).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
