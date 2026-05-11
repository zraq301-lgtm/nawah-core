import React, { useState } from 'react';
import {
  UserCheck, UserPlus, Save, ArrowRight, Edit3, Trash2,
  X, Phone, Briefcase, DollarSign, Calendar, AlertCircle, Search
} from 'lucide-react';

const StaffManagement = ({ onBack, staff = [], onAddStaff, onUpdateStaff, onDeleteStaff }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newEmployee, setNewEmployee] = useState({
    name: '', role: 'عامل', salary: '', phone: '', hireDate: new Date().toISOString().split('T')[0], status: 'نشط'
  });

  const roles = ['عامل', 'خباز', 'سائق', 'محاسب', 'مدير', 'عامل نظافة', 'أخرى'];
  const statuses = ['نشط', 'غير نشط', 'إجازة'];

  const filteredStaff = staff.filter(s =>
    (s.name || '').includes(searchTerm) || (s.role || '').includes(searchTerm)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.salary) {
      alert("يرجى إدخال اسم العامل والراتب");
      return;
    }
    if (editingId) {
      onUpdateStaff(editingId, { ...newEmployee, salary: parseFloat(newEmployee.salary) || 0 });
      setEditingId(null);
      alert("تم تحديث بيانات العامل بنجاح");
    } else {
      onAddStaff({ ...newEmployee, id: Date.now(), salary: parseFloat(newEmployee.salary) || 0 });
      alert("تم إضافة العامل بنجاح");
    }
    setNewEmployee({ name: '', role: 'عامل', salary: '', phone: '', hireDate: new Date().toISOString().split('T')[0], status: 'نشط' });
    setShowAdd(false);
  };

  const handleEdit = (employee) => {
    setNewEmployee({
      name: employee.name, role: employee.role, salary: employee.salary,
      phone: employee.phone || '', hireDate: employee.hireDate, status: employee.status
    });
    setEditingId(employee.id);
    setShowAdd(true);
  };

  const handleDelete = (id, name) => {
    if (!confirm(`هل أنت متأكد من حذف العامل "${name}"؟`)) return;
    onDeleteStaff(id);
  };

  const handleCancel = () => {
    setShowAdd(false);
    setEditingId(null);
    setNewEmployee({ name: '', role: 'عامل', salary: '', phone: '', hireDate: new Date().toISOString().split('T')[0], status: 'نشط' });
  };

  const activeCount = staff.filter(s => s.status === 'نشط').length;
  const totalSalaries = staff.filter(s => s.status === 'نشط').reduce((sum, s) => sum + (parseFloat(s.salary) || 0), 0);

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh' }}>
      <div className="page-header">
        <UserCheck size={28} color="#0ea5e9" />
        <h2>إدارة العمالة</h2>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
        <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>إجمالي العمال</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0ea5e9' }}>{staff.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>النشطين</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10b981' }}>{activeCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>الرواتب</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f59e0b' }}>{totalSalaries.toLocaleString()}</div>
        </div>
      </div>

      {/* Add/Edit Toggle */}
      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary"
          style={{ backgroundColor: '#0ea5e9', marginBottom: '15px', boxShadow: '0 4px 15px rgba(14, 165, 233, 0.3)' }}
        >
          <UserPlus size={20} /> إضافة عامل جديد
        </button>
      )}

      {/* Add/Edit Form */}
      {showAdd && (
        <div className="glass-card" style={{ marginBottom: '20px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#0ea5e9' }}>
              {editingId ? 'تعديل بيانات العامل' : 'بيانات العامل الجديد'}
            </h3>
            <button onClick={handleCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label"><UserCheck size={14} color="#0ea5e9" /> الاسم الكامل</label>
                <input className="glass-input" placeholder="اسم العامل" value={newEmployee.name} onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} style={{ marginBottom: '10px' }} />
              </div>
              <div>
                <label className="form-label"><Briefcase size={14} color="#0ea5e9" /> الوظيفة</label>
                <select className="glass-input" value={newEmployee.role} onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })} style={{ marginBottom: '10px' }}>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label"><DollarSign size={14} color="#0ea5e9" /> الراتب الأساسي</label>
                <input type="number" className="glass-input" placeholder="0.00" value={newEmployee.salary} onChange={e => setNewEmployee({ ...newEmployee, salary: e.target.value })} style={{ marginBottom: '10px' }} />
              </div>
              <div>
                <label className="form-label"><Phone size={14} color="#0ea5e9" /> رقم الهاتف</label>
                <input className="glass-input" placeholder="01xxxxxxxxx" value={newEmployee.phone} onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })} style={{ marginBottom: '10px' }} />
              </div>
              <div>
                <label className="form-label"><Calendar size={14} color="#0ea5e9" /> تاريخ التعيين</label>
                <input type="date" className="glass-input" value={newEmployee.hireDate} onChange={e => setNewEmployee({ ...newEmployee, hireDate: e.target.value })} style={{ marginBottom: '10px' }} />
              </div>
              <div>
                <label className="form-label">الحالة</label>
                <select className="glass-input" value={newEmployee.status} onChange={e => setNewEmployee({ ...newEmployee, status: e.target.value })} style={{ marginBottom: '10px' }}>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary" style={{ backgroundColor: '#0ea5e9', boxShadow: '0 4px 15px rgba(14, 165, 233, 0.3)', flex: 2 }}>
                <Save size={20} /> {editingId ? 'تحديث البيانات' : 'حفظ العامل'}
              </button>
              <button type="button" onClick={handleCancel} className="btn-back" style={{ flex: 1 }}>إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search style={{ position: 'absolute', right: '14px', top: '14px', color: '#94a3b8' }} size={20} />
        <input className="glass-input" placeholder="ابحث بالاسم أو الوظيفة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingRight: '42px' }} />
      </div>

      {/* Staff List */}
      {filteredStaff.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
          <AlertCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>لا يوجد عمال مسجلين</p>
        </div>
      ) : (
        filteredStaff.map(emp => (
          <div key={emp.id} className="glass-card" style={{ marginBottom: '10px', padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>{emp.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={12} /> {emp.role}
                  {emp.phone && <><span style={{ margin: '0 4px' }}>|</span><Phone size={12} /> {emp.phone}</>}
                </div>
              </div>
              <span className={`status-badge ${emp.status === 'نشط' ? 'active' : emp.status === 'إجازة' ? 'on-leave' : 'inactive'}`}>
                {emp.status}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(248, 250, 252, 0.8)', padding: '10px 14px', borderRadius: '12px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>الراتب: </span>
                <span style={{ fontWeight: '800', color: '#f59e0b' }}>{(parseFloat(emp.salary) || 0).toLocaleString()} ج.م</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> {emp.hireDate}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                onClick={() => handleEdit(emp)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '10px', border: '1px solid rgba(14, 165, 233, 0.3)',
                  background: 'rgba(239, 246, 255, 0.8)', color: '#0ea5e9', fontWeight: 'bold',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem'
                }}
              >
                <Edit3 size={14} /> تعديل
              </button>
              <button
                onClick={() => handleDelete(emp.id, emp.name)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(254, 242, 242, 0.8)', color: '#e74c3c', fontWeight: 'bold',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem'
                }}
              >
                <Trash2 size={14} /> حذف
              </button>
            </div>
          </div>
        ))
      )}

      <button onClick={onBack} className="btn-back" style={{ marginTop: '15px' }}>
        <ArrowRight size={18} /> العودة للوحة التحكم
      </button>
    </div>
  );
};

export default StaffManagement;
