import React from 'react';
import * as XLSX from 'xlsx';
import { Users, Download, ArrowRight, Star } from 'lucide-react';

export default function CustomersReport({ salesData = [], onBack }) {
  const totalRevenue = salesData.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
  const uniqueCustomers = [...new Set(salesData.map(s => s.customerName || 'عميل نقدي'))];
  const exportCustomersExcel = () => {
    if (salesData.length === 0) return alert("لا توجد عمليات مبيعات مسجلة");
    const data = salesData.map(sale => ({ "تاريخ العملية": sale.date, "اسم العميل": sale.customerName || 'عميل نقدي', "الصنف": sale.productName || '', "الكمية": sale.quantity, "الإجمالي": sale.total }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير حركة العملاء"); XLSX.writeFile(wb, "Customers_Report_2026.xlsx");
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      <div className="page-header"><button onClick={onBack} style={{ border: 'none', background: 'rgba(226, 232, 240, 0.5)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><ArrowRight size={20} /></button><h2>تقرير العملاء</h2></div>
      <div className="glass-card" style={{ borderRight: '6px solid #27ae60', textAlign: 'center' }}>
        <Star size={50} color="#27ae60" style={{ margin: '0 auto 15px' }} /><h3>كشف مسحوبات العملاء</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>تقرير مفصل يوضح أكثر العملاء شراءً.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
          <div style={{ background: 'rgba(240, 253, 244, 0.8)', padding: '12px', borderRadius: '14px' }}><div style={{ fontSize: '0.8rem', color: '#64748b' }}>عدد العملاء</div><strong style={{ color: '#27ae60', fontSize: '1.2rem' }}>{uniqueCustomers.length}</strong></div>
          <div style={{ background: 'rgba(240, 253, 244, 0.8)', padding: '12px', borderRadius: '14px' }}><div style={{ fontSize: '0.8rem', color: '#64748b' }}>إجمالي التعاملات</div><strong style={{ color: '#27ae60', fontSize: '1.2rem' }}>{totalRevenue.toLocaleString()}</strong></div>
        </div>
        <button onClick={exportCustomersExcel} className="btn-primary" style={{ backgroundColor: '#27ae60', boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)', marginTop: '20px' }}><Download size={20} /> تحميل سجل العملاء (Excel)</button>
      </div>
    </div>
  );
}
