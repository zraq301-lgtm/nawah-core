import React, { useState } from 'react';
import { Settings as SettingsIcon, Download, Upload, Trash2, ArrowRight, Shield, Database } from 'lucide-react';

const Settings = () => {
  const [message, setMessage] = useState('');
  const showMessage = (text) => { setMessage(text); setTimeout(() => setMessage(''), 3000); };

  const handleExport = () => {
    const allKeys = ['stock', 'salesData', 'inventory', 'expenses', 'waste', 'suppliers', 'customers', 'productionData', 'waitingList', 'cashBook', 'staff'];
    const backupData = {};
    allKeys.forEach(key => { try { const data = localStorage.getItem(key); if (data) backupData[key] = JSON.parse(data); } catch (e) { /* skip */ } });
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `mamoul_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url); showMessage('تم تصدير النسخة الاحتياطية بنجاح');
  };

  const handleImport = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!confirm('هل أنت متأكد من استعادة هذه النسخة؟ سيتم استبدال البيانات الحالية.')) return;
          Object.entries(data).forEach(([key, value]) => { localStorage.setItem(key, JSON.stringify(value)); });
          showMessage('تم استعادة النسخة الاحتياطية بنجاح. يرجى إعادة تحميل الصفحة.');
        } catch (err) { showMessage('خطأ في قراءة الملف.'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearData = () => {
    if (!confirm('هل أنت متأكد من حذف جميع البيانات؟')) return;
    if (!confirm('تأكيد نهائي: سيتم حذف كل البيانات المحفوظة!')) return;
    const allKeys = ['stock', 'salesData', 'inventory', 'expenses', 'waste', 'suppliers', 'customers', 'productionData', 'waitingList', 'cashBook', 'staff'];
    allKeys.forEach(key => localStorage.removeItem(key));
    showMessage('تم حذف جميع البيانات. يرجى إعادة تحميل الصفحة.');
  };

  const storageSize = () => { let total = 0; for (let key in localStorage) { if (localStorage.hasOwnProperty(key)) total += localStorage.getItem(key).length * 2; } return (total / 1024).toFixed(1); };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh' }}>
      <div className="page-header"><SettingsIcon size={28} color="#64748b" /><h2>الإعدادات</h2></div>
      {message && <div style={{ background: 'rgba(236, 253, 245, 0.9)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 16px', borderRadius: '14px', marginBottom: '15px', color: '#065f46', fontWeight: 'bold', textAlign: 'center' }}>{message}</div>}
      <div className="glass-card" style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><Database size={20} color="#3498db" /><h3 style={{ margin: 0, fontSize: '1rem' }}>معلومات التخزين</h3></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(226, 232, 240, 0.5)' }}><span style={{ color: '#64748b', fontSize: '0.9rem' }}>حجم البيانات المحفوظة</span><span style={{ fontWeight: 'bold', color: '#1e293b' }}>{storageSize()} KB</span></div>
      </div>
      <div className="glass-card" style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}><Shield size={20} color="#2ecc71" /><h3 style={{ margin: 0, fontSize: '1rem' }}>النسخ الاحتياطي</h3></div>
        <button onClick={handleExport} className="btn-primary" style={{ backgroundColor: '#2ecc71', boxShadow: '0 4px 15px rgba(46, 204, 113, 0.3)', marginBottom: '10px' }}><Download size={20} /> تصدير نسخة احتياطية (JSON)</button>
        <button onClick={handleImport} className="btn-primary" style={{ backgroundColor: '#3498db', boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)' }}><Upload size={20} /> استعادة من نسخة احتياطية</button>
      </div>
      <div className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}><Trash2 size={20} color="#e74c3c" /><h3 style={{ margin: 0, fontSize: '1rem', color: '#e74c3c' }}>منطقة الخطر</h3></div>
        <button onClick={handleClearData} className="btn-primary" style={{ backgroundColor: '#e74c3c', boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)' }}><Trash2 size={20} /> حذف جميع البيانات</button>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>هذا الإجراء لا يمكن التراجع عنه.</p>
      </div>
    </div>
  );
};

export default Settings;
