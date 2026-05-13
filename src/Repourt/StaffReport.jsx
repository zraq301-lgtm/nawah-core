import React from 'react';
import * as XLSX from 'xlsx';
import { UserCheck, Download, ArrowRight, DollarSign, Users, Briefcase } from 'lucide-react';

export default function StaffReport({ staff = [], onBack }) {
  const activeStaff = staff.filter(s => s.status === 'نشط');
  const totalSalaries = activeStaff.reduce((sum, s) => sum + (parseFloat(s.salary) || 0), 0);
  const onLeaveStaff = staff.filter(s => s.status === 'إجازة');
  const inactiveStaff = staff.filter(s => s.status === 'غير نشط');

  const rolesCount = {};
  staff.forEach(s => { const role = s.role || 'أخرى'; rolesCount[role] = (rolesCount[role] || 0) + 1; });

  const exportStaffExcel = () => {
    if (staff.length === 0) return alert("لا توجد بيانات عمالة");
    const data = staff.map(emp => ({
      "الاسم": emp.name, "الوظيفة": emp.role, "الراتب الأساسي": parseFloat(emp.salary || 0),
      "رقم الهاتف": emp.phone || '', "تاريخ التعيين": emp.hireDate, "الحالة": emp.status
    }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل العمالة"); XLSX.writeFile(wb, `Staff_Report_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      <div className="page-header">
        <button onClick={onBack} style={{ border: 'none', background: 'rgba(226, 232, 240, 0.5)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><ArrowRight size={20} /></button>
        <h2>تقرير العمالة</h2>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
        <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
          <Users size={18} color="#10b981" />
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>النشطين</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10b981' }}>{activeStaff.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
          <DollarSign size={18} color="#f59e0b" />
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>إجمالي الرواتب</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f59e0b' }}>{totalSalaries.toLocaleString()}</div>
        </div>
        <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
          <UserCheck size={18} color="#0ea5e9" />
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>إجمالي العمال</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0ea5e9' }}>{staff.length}</div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="glass-card" style={{ marginBottom: '15px' }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem', marginBottom: '15px', color: '#334155' }}>تحليل تكلفة العمالة</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(226, 232, 240, 0.5)' }}>
          <span style={{ color: '#64748b', fontSize: '0.9rem' }}>تكلفة الرواتب الشهرية</span>
          <span style={{ fontWeight: '800', color: '#f59e0b' }}>{totalSalaries.toLocaleString()} ج.م</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(226, 232, 240, 0.5)' }}>
          <span style={{ color: '#64748b', fontSize: '0.9rem' }}>متوسط الراتب</span>
          <span style={{ fontWeight: '800', color: '#0ea5e9' }}>{activeStaff.length > 0 ? (totalSalaries / activeStaff.length).toFixed(0) : 0} ج.م</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(226, 232, 240, 0.5)' }}>
          <span style={{ color: '#64748b', fontSize: '0.9rem' }}>في إجازة</span>
          <span style={{ fontWeight: '800', color: '#f59e0b' }}>{onLeaveStaff.length}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
          <span style={{ color: '#64748b', fontSize: '0.9rem' }}>غير نشطين</span>
          <span style={{ fontWeight: '800', color: '#ef4444' }}>{inactiveStaff.length}</span>
        </div>
      </div>

      {/* Roles Distribution */}
      {Object.keys(rolesCount).length > 0 && (
        <div className="glass-card" style={{ marginBottom: '15px' }}>
          <h3 style={{ marginTop: 0, fontSize: '1rem', marginBottom: '12px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={18} /> توزيع الوظائف
          </h3>
          {Object.entries(rolesCount).map(([role, count]) => (
            <div key={role} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(226, 232, 240, 0.3)' }}>
              <span style={{ fontSize: '0.9rem', color: '#1e293b' }}>{role}</span>
              <span style={{ fontWeight: 'bold', color: '#0ea5e9' }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Staff List */}
      {staff.length > 0 && (
        <div className="glass-card" style={{ marginBottom: '15px' }}>
          <h3 style={{ marginTop: 0, fontSize: '1rem', marginBottom: '12px', color: '#334155' }}>قائمة العمال</h3>
          {staff.map(emp => (
            <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(226, 232, 240, 0.3)' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>{emp.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{emp.role} | {emp.hireDate}</div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '800', color: '#f59e0b', fontSize: '0.9rem' }}>{(parseFloat(emp.salary) || 0).toLocaleString()} ج.م</div>
                <span className={`status-badge ${emp.status === 'نشط' ? 'active' : emp.status === 'إجازة' ? 'on-leave' : 'inactive'}`}>{emp.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={exportStaffExcel} className="btn-primary" style={{ backgroundColor: '#0ea5e9', boxShadow: '0 4px 15px rgba(14, 165, 233, 0.3)', marginBottom: '10px' }}>
        <Download size={20} /> تحميل سجل العمالة (Excel)
      </button>

      <button onClick={onBack} className="btn-back">
        <ArrowRight size={18} /> العودة لمركز التقارير
      </button>
    </div>
  );
}
