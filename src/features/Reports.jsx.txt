import React, { useState } from 'react';
import { ArrowRight, FileText } from 'lucide-react';

import CashReport from '../Repourt/CashReport';
import CustomersReport from '../Repourt/CustomersReport';
import ExpenseReports from '../Repourt/ExpenseReports';
import PurchaseReportCard from '../Repourt/PurchaseReportCard';
import SalesReportCard from '../Repourt/SalesReportCard';
import SuppliersReport from '../Repourt/SuppliersReport';
import StaffReport from '../Repourt/StaffReport';

const Reports = ({ inventory = [], stock = [], salesData = [], expenses = [], staff = [], onBack }) => {
  const [activeSubReport, setActiveSubReport] = useState('main');

  const reportCards = [
    { id: 'cash', title: 'تقرير الخزينة', icon: '💰', color: '#e67e22', component: CashReport, props: { salesData, inventory, expenses } },
    { id: 'purchases', title: 'تقرير المشتريات', icon: '🛒', color: '#9b59b6', component: PurchaseReportCard, props: { inventory } },
    { id: 'sales', title: 'تقرير المبيعات', icon: '📈', color: '#2ecc71', component: SalesReportCard, props: { salesData } },
    { id: 'expenses', title: 'تقرير المصروفات', icon: '💸', color: '#e74c3c', component: ExpenseReports, props: { expensesData: expenses } },
    { id: 'customers', title: 'تقرير العملاء', icon: '👥', color: '#3498db', component: CustomersReport, props: { salesData } },
    { id: 'suppliers', title: 'تقرير الموردين', icon: '🚛', color: '#34495e', component: SuppliersReport, props: { inventory } },
    { id: 'staff', title: 'تقرير العمالة', icon: '👷', color: '#0ea5e9', component: StaffReport, props: { staff } },
  ];

  const goBackToMenu = () => setActiveSubReport('main');

  if (activeSubReport !== 'main') {
    const selected = reportCards.find(r => r.id === activeSubReport);
    const ReportComponent = selected.component;
    return <ReportComponent {...selected.props} onBack={goBackToMenu} />;
  }

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      <div className="page-header">
        <FileText size={28} color="#2980b9" />
        <h2>مركز التقارير</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {reportCards.map((card) => (
          <div
            key={card.id}
            onClick={() => setActiveSubReport(card.id)}
            className="glass-card"
            style={{ cursor: 'pointer', textAlign: 'center', borderBottom: `4px solid ${card.color}`, padding: '18px 8px' }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.85rem' }}>{card.title}</div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ marginTop: '20px', textAlign: 'center', padding: '12px' }}>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
          يتم سحب البيانات حياً من النظام وتصديرها Excel.
        </p>
      </div>

      <button onClick={onBack} className="btn-back" style={{ marginTop: '15px' }}>
        <ArrowRight size={18} /> العودة للرئيسية
      </button>
    </div>
  );
};

export default Reports;
