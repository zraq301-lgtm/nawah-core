import React from 'react';
import * as XLSX from 'xlsx';
import { ShoppingBag, Download, ArrowRight } from 'lucide-react';

const PurchaseReportCard = ({ inventory = [], onBack }) => {
  const totalPurchases = inventory.reduce((sum, op) => sum + (parseFloat(op.total) || 0), 0);
  const exportPurchasesExcel = () => {
    if (inventory.length === 0) return alert("لا توجد بيانات مشتريات");
    const data = inventory.map(op => ({ "التاريخ": op.date, "اسم الصنف": op.item, "الوحدة": op.unit, "الكمية": op.quantity, "سعر الوحدة": op.price, "الإجمالي": op.total, "المورد": op.supplier || 'غير محدد', "طريقة السداد": op.paymentMethod || 'كاش' }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل المشتريات"); XLSX.writeFile(wb, `Purchases_Report_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      <div className="page-header"><button onClick={onBack} style={{ border: 'none', background: 'rgba(226, 232, 240, 0.5)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><ArrowRight size={20} /></button><h2>تقرير المشتريات</h2></div>
      <div className="glass-card" style={{ borderRight: '6px solid #9b59b6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><ShoppingBag color="#9b59b6" size={24} /><h3 style={{ margin: 0, fontSize: '1.1rem' }}>تقرير المشتريات التفصيلي</h3></div>
        <div style={{ background: 'rgba(243, 239, 249, 0.8)', padding: '14px', borderRadius: '14px', textAlign: 'center', marginBottom: '15px' }}><span style={{ fontSize: '0.85rem', color: '#64748b' }}>إجمالي المشتريات:</span><div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#9b59b6' }}>{totalPurchases.toLocaleString()} ج.م</div></div>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 15px 0' }}>عدد الفواتير: {inventory.length}</p>
        <button onClick={exportPurchasesExcel} className="btn-primary" style={{ backgroundColor: '#9b59b6', boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)' }}><Download size={18} /> تحميل سجل المشتريات (Excel)</button>
      </div>
    </div>
  );
};

export default PurchaseReportCard;
