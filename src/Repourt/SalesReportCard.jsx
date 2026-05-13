import React from 'react';
import * as XLSX from 'xlsx';
import { Tag, Download, ArrowRight } from 'lucide-react';

const SalesReportCard = ({ salesData = [], onBack }) => {
  const totalSales = salesData.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
  const exportSalesExcel = () => {
    if (salesData.length === 0) return alert("لا توجد بيانات مبيعات");
    const data = salesData.map(sale => ({ "التاريخ": sale.date, "العميل": sale.customerName || 'عميل نقدي', "الصنف": sale.productName || '', "الكمية": sale.quantity, "السعر": sale.pricePerUnit, "الإجمالي": sale.total }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل المبيعات"); XLSX.writeFile(wb, `Sales_Report_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      <div className="page-header"><button onClick={onBack} style={{ border: 'none', background: 'rgba(226, 232, 240, 0.5)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><ArrowRight size={20} /></button><h2>تقرير المبيعات</h2></div>
      <div className="glass-card" style={{ borderRight: '6px solid #2ecc71' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><Tag color="#2ecc71" size={24} /><h3 style={{ margin: 0, fontSize: '1.1rem' }}>تقرير المبيعات</h3></div>
        <div style={{ background: 'rgba(236, 253, 245, 0.8)', padding: '14px', borderRadius: '14px', textAlign: 'center', marginBottom: '15px' }}><span style={{ fontSize: '0.85rem', color: '#64748b' }}>إجمالي المبيعات:</span><div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#2ecc71' }}>{totalSales.toLocaleString()} ج.م</div></div>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 15px 0' }}>عدد العمليات: {salesData.length}</p>
        <button onClick={exportSalesExcel} className="btn-primary" style={{ backgroundColor: '#2ecc71', boxShadow: '0 4px 15px rgba(46, 204, 113, 0.3)' }}><Download size={18} /> تحميل سجل المبيعات (Excel)</button>
      </div>
    </div>
  );
};

export default SalesReportCard;
