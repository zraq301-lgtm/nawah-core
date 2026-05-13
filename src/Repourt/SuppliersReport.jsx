import React from 'react';
import * as XLSX from 'xlsx';
import { Truck, Download, ArrowRight } from 'lucide-react';

export default function SuppliersReport({ inventory = [], onBack }) {
  const totalPurchases = inventory.reduce((sum, op) => sum + (parseFloat(op.total) || 0), 0);
  const uniqueSuppliers = [...new Set(inventory.map(op => op.supplier || 'غير محدد'))];
  const exportSuppliersExcel = () => {
    if (inventory.length === 0) return alert("لا توجد عمليات شراء مسجلة");
    const data = inventory.map(op => ({ "التاريخ": op.date, "اسم المورد": op.supplier || 'غير محدد', "الصنف المورد": op.item, "الكمية": op.quantity, "إجمالي القيمة": op.total, "حالة السداد": op.paymentMethod }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل تعاملات الموردين"); XLSX.writeFile(wb, "Suppliers_Transactions_2026.xlsx");
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      <div className="page-header"><button onClick={onBack} style={{ border: 'none', background: 'rgba(226, 232, 240, 0.5)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><ArrowRight size={20} /></button><h2>تقرير الموردين</h2></div>
      <div className="glass-card" style={{ borderRight: '6px solid #34495e', textAlign: 'center' }}>
        <Truck size={50} color="#34495e" style={{ margin: '0 auto 15px' }} /><h3>كشف حساب الموردين</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>تحميل كافة فواتير المشتريات مجمعة حسب المورد.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
          <div style={{ background: 'rgba(241, 245, 249, 0.8)', padding: '12px', borderRadius: '14px' }}><div style={{ fontSize: '0.8rem', color: '#64748b' }}>عدد الموردين</div><strong style={{ color: '#34495e', fontSize: '1.2rem' }}>{uniqueSuppliers.length}</strong></div>
          <div style={{ background: 'rgba(241, 245, 249, 0.8)', padding: '12px', borderRadius: '14px' }}><div style={{ fontSize: '0.8rem', color: '#64748b' }}>إجمالي التعاملات</div><strong style={{ color: '#34495e', fontSize: '1.2rem' }}>{totalPurchases.toLocaleString()}</strong></div>
        </div>
        <button onClick={exportSuppliersExcel} className="btn-primary" style={{ backgroundColor: '#34495e', boxShadow: '0 4px 15px rgba(52, 73, 94, 0.3)', marginTop: '20px' }}><Download size={20} /> تحميل سجل الموردين (Excel)</button>
      </div>
    </div>
  );
}
