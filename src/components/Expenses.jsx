import React, { useState } from 'react';
import { Wallet, ArrowRight, Save, Receipt, Calendar, Info } from 'lucide-react';

const Expenses = ({ onBack, onSaveExpense }) => {
  const [expense, setExpense] = useState({ category: 'إيجار', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  const categories = ['إيجار', 'كهرباء', 'مياه', 'سولار', 'نقل', 'صيانة', 'عمالة يومية', 'رواتب', 'أخرى'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!expense.amount || !expense.description) { alert("يرجى إدخال المبلغ والبيان"); return; }
    onSaveExpense({ ...expense, id: Date.now() }); alert("تم تسجيل المصروف بنجاح"); onBack();
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", minHeight: '100vh' }}>
      <div className="page-header"><Wallet size={28} color="#7f8c8d" /><h2>تسجيل مصروفات</h2></div>
      <div className="glass-card">
        <form onSubmit={handleSubmit}>
          <label className="form-label"><Receipt size={16} color="#7f8c8d" /> نوع المصروف</label>
          <select className="glass-input" value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })} style={{ marginBottom: '12px' }}>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
          <label className="form-label"><Info size={16} color="#7f8c8d" /> البيان / التفاصيل</label>
          <input className="glass-input" placeholder="مثال: فاتورة كهرباء شهر مايو" value={expense.description} onChange={(e) => setExpense({ ...expense, description: e.target.value })} style={{ marginBottom: '12px' }} />
          <label className="form-label">المبلغ</label>
          <input type="number" className="glass-input" placeholder="0.00" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} style={{ marginBottom: '12px' }} />
          <label className="form-label"><Calendar size={16} color="#7f8c8d" /> التاريخ</label>
          <input type="date" className="glass-input" value={expense.date} onChange={(e) => setExpense({ ...expense, date: e.target.value })} style={{ marginBottom: '15px' }} />
          <button type="submit" className="btn-primary" style={{ backgroundColor: '#7f8c8d', boxShadow: '0 4px 15px rgba(127, 140, 141, 0.3)' }}><Save size={20} /> حفظ المصروف</button>
        </form>
      </div>
      <button onClick={onBack} className="btn-back" style={{ marginTop: '15px' }}><ArrowRight size={18} /> العودة للوحة التحكم</button>
    </div>
  );
};

export default Expenses;
