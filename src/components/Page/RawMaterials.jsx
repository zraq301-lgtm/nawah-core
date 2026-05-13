import React from 'react';
import { Trash2 } from 'lucide-react';

const RawMaterials = ({ categories, onDeleteItem }) => {
  // تصفية الخامات فقط
  const rawData = categories.filter(item => {
    const name = (item.name || '').toLowerCase();
    return !(name.includes("معمول") || name.includes("جاهز"));
  });

  return (
    <div style={{ padding: '10px' }}>
      {rawData.length > 0 ? rawData.map(item => (
        <div key={item.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>{item.name}</h3>
            <Trash2 size={18} color="#ef4444" onClick={() => onDeleteItem(item.id)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', color: '#666' }}>
            <span>الرصيد: <b>{item.balance}</b></span>
            <span>السعر: <b>{item.price}</b></span>
          </div>
        </div>
      )) : <p style={{ textAlign: 'center' }}>لا توجد خامات حالياً</p>}
    </div>
  );
};

const cardStyle = { background: '#fff', padding: '15px', borderRadius: '15px', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };

export default RawMaterials;
