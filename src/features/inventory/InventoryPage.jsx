import React from 'react';
import GlassCard from '../../components/ui/GlassCard';

const InventoryPage = () => {
  const inventoryItems = [
    { id: 1, name: "مادة خام A", stock: 50, prediction: "تنتهي خلال 3 أيام", status: "warning" },
    { id: 2, name: "منتج نهائي B", stock: 120, prediction: "مستقر", status: "safe" },
  ];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-800">المخزون التنبؤي</h2>
      <div className="grid gap-4">
        {inventoryItems.map(item => (
          <GlassCard key={item.id} className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-gray-700">{item.name}</h4>
              <p className="text-xs text-gray-500">الكمية الحالية: {item.stock}</p>
            </div>
            <div className={`px-4 py-2 rounded-full text-[10px] font-bold ${
              item.status === 'warning' ? 'bg-pink-100 text-pink-600' : 'bg-green-100 text-green-600'
            }`}>
              AI: {item.prediction}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default InventoryPage;
