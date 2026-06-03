import React, { useState, useMemo } from 'react';
import { CapacitorHttp } from '@capacitor/core';
import Swal from 'sweetalert2';
import {
  ShoppingCart, Tag, Factory, Warehouse, Trash2,
  Wallet, Truck, BarChart3, FileText, Users,
  TrendingUp, TrendingDown, DollarSign, Package, Settings, UserCheck,
  Cpu, Loader2, Layers
} from 'lucide-react';

const Dashboard = ({ 
  setActivePage, 
  stats = {}, 
  productionData = [], 
  stock = [] 
}) => {
  const [isAiLoading, setIsAiLoading] = useState(false);

  // تم تعديل المعرف (id) لصفحة الطبخات ليتطابق تماماً مع اسم الملف ونظام التوجيه الموحد في App.jsx ليعمل فوراً باللمس
  const sections = [
    { id: 'purchases', title: 'المشتريات', icon: <ShoppingCart size={28}/>, color: '#e67e22' },
    { id: 'sales', title: 'المبيعات', icon: <Tag size={28}/>, color: '#2ecc71' },
    { id: 'production', title: 'الإنتاج', icon: <Factory size={28}/>, color: '#f59e0b' },
    { id: 'bomsetupmanager', title: 'تهيئة الطبخات', icon: <Layers size={28}/>, color: '#6366f1' }, // 🚀 الربط الصريح والنهائي مع العقل المركزي
    { id: 'inventory', title: 'المخزن', icon: <Warehouse size={28}/>, color: '#3498db' },
    { id: 'waste', title: 'الهالك', icon: <Trash2 size={28}/>, color: '#e74c3c' },
    { id: 'expenses', title: 'المصروفات', icon: <Wallet size={28}/>, color: '#7f8c8d' },
    { id: 'suppliers', title: 'الموردين', icon: <Truck size={28}/>, color: '#34495e' },
    { id: 'financials', title: 'قوائم مالية', icon: <BarChart3 size={28}/>, color: '#16a085' },
    { id: 'reports', title: 'التقارير', icon: <FileText size={28}/>, color: '#2980b9' },
    { id: 'customers', title: 'العملاء', icon: <Users size={28}/>, color: '#27ae60' },
    { id: 'staff', title: 'العمالة', icon: <UserCheck size={28}/>, color: '#0ea5e9' },
  ];

  // معالجة بيانات الرسم البياني محلياً بدقة مع المزامنة مع الأب
  const chartData = useMemo(() => {
    if (!productionData || !Array.isArray(productionData) || productionData.length === 0) return [];
    
    const parsedData = productionData.map(item => {
      // التعامل المرن مع هياكل البيانات القادمة من السيرفر أو التخزين المحلي
      const details = typeof item.details === 'string' ? JSON.parse(item.details) : (item.details || item);
      return {
        name: item.created_at ? new Date(item.created_at).toLocaleDateString('ar-EG', {month: 'numeric', day: 'numeric'}) : (details.date ? details.date.split('-').slice(1).join('/') : ''), 
        quantity: parseFloat(details.products?.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0) || details.quantity || 0)
      };
    }).slice(-5).reverse(); // جلب آخر 5 إدخالات مرتبة ترتيباً تصاعدياً زمنياً للعرض

    const maxQty = Math.max(...parsedData.map(d => d.quantity), 1);
    
    return parsedData.map(d => ({
      ...d,
      heightPercentage: Math.min(Math.max((d.quantity / maxQty) * 100, 10), 100) // حساب الارتفاع النسبي للعمود البياني
    }));
  }, [productionData]);

  const generateTodayReport = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayProd = productionData.filter(p => {
      const details = typeof p.details === 'string' ? JSON.parse(p.details) : (p.details || p);
      return p.created_at?.startsWith(today) || details.date === today;
    });
    const totalCost = todayProd.reduce((sum, p) => sum + (parseFloat(p.total_actual_cost || p.totalActualCost || 0)), 0);
    const lowStockCount = stock.filter(i => parseFloat(i.balance || i.quantity || 0) < 5).length;

    Swal.fire({
      title: '📊 تقرير حالة المصنع الفوري',
      html: `<div style="text-align: right; font-family: 'Tajawal', sans-serif; line-height: 1.8;">
          <p>📅 إنتاج اليوم: <b>${todayProd.length} حركة تشغيل</b></p>
          <p>💰 إجمالي تكلفة اليوم: <b style="color: #e67e22">${totalCost.toFixed(2)} ج.م</b></p>
          <p>📦 أصناف المخزن: <b>${stock.length} صنف</b></p>
          <p>⚠️ أصناف أوشكت على النفاذ: <b style="color: #ef4444">${lowStockCount}</b></p>
        </div>`,
      icon: 'info', confirmButtonText: 'ممتاز'
    });
  };

  const analyzeWithAI = async () => {
    if (!productionData.length && !stock.length) {
        Swal.fire('تنبيه', 'لا توجد بيانات كافية للتحليل حالياً', 'warning');
        return;
    }
    setIsAiLoading(true);
    try {
      const response = await CapacitorHttp.post({
        url: 'https://maamoul-one.vercel.app/api/raqqa-ai',
        headers: { 'Content-Type': 'application/json' },
        data: { prompt: `تحليل بيانات مصنع بناء على: ${JSON.stringify(productionData.slice(-5))}` }
      });
      Swal.fire({ title: '🤖 تحليل الذكاء الصناعي', text: response.data?.message || "النظام يعمل بكفاءة", icon: 'success' });
    } catch (error) {
      Swal.fire('عذراً', 'الخدمة غير متوفرة حالياً', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div style={{ padding: '15px', direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
      {/* الهيدر العلوي الذكي */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '25px 20px', borderRadius: '24px', color: '#fff', marginBottom: '20px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Cpu size={20} color="#0ea5e9"/>
            <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: '800', letterSpacing: '0.5px' }}>nawah.ai</h1>
          </div>
          <p style={{ opacity: 0.7, margin: 0, fontSize: '0.85rem' }}>نظام إدارة الموارد والذكاء الاصطناعي الشامل</p>
        </div>
      </div>

      {/* أزرار التحكم السريع */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <button onClick={analyzeWithAI} disabled={isAiLoading} style={{ padding: '15px', borderRadius: '16px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: '#fff', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
          {isAiLoading ? <Loader2 size={18} style={{animation: 'spin 1s linear infinite'}} /> : <Cpu size={18} />} ذكاء صناعي
        </button>
        <button onClick={generateTodayReport} style={{ padding: '15px', borderRadius: '16px', background: '#1e293b', color: '#fff', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
          <BarChart3 size={18} /> التقرير الفوري
        </button>
      </div>

      {/* كروت الإحصائيات الحيوية المزامنة مع حسابات الأب */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'الإيرادات', value: stats.totalIncome || 0, icon: <TrendingUp size={18} color="#2ecc71"/>, color: '#2ecc71' },
          { label: 'المصروفات', value: stats.totalExpenses || 0, icon: <TrendingDown size={18} color="#e74c3c"/>, color: '#e74c3c' },
          { label: 'صافي الربح', value: stats.netProfit || 0, icon: <DollarSign size={18} color="#f59e0b"/>, color: stats.netProfit >= 0 ? '#2ecc71' : '#e74c3c' },
          { label: 'قيمة المخزن', value: stats.stockValue || 0, icon: <Package size={18} color="#3498db"/>, color: '#3498db' },
        ].map((item, i) => (
          <div key={i} style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '14px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            {item.icon}
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{item.label}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: item.color }}>{item.value.toLocaleString('ar-EG')} ج.م</div>
          </div>
        ))}
      </div>

      {/* منحنى ورسم الإنتاج البياني خفيف الوزن والمعدل بدون مكتبات خارجية */}
      <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '20px', marginBottom: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b', fontWeight: 'bold' }}>
          <TrendingUp size={18} color="#e67e22" /> منحنى وحجم الإنتاج الفعلي السحابي
        </h3>
        
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', padding: '20px 0' }}>لا توجد سجلات إنتاج مسجلة لعرضها برسم بياني حالياً</div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '160px', padding: '10px 5px 0 5px', background: '#fafafa', borderRadius: '16px', borderBottom: '2px solid #e2e8f0' }}>
            {chartData.map((bar, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#e67e22', marginBottom: '4px' }}>{bar.quantity}</div>
                <div style={{ width: '24px', height: `${bar.heightPercentage}%`, background: 'linear-gradient(to top, #e67e22, #ffaa66)', borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease-in-out' }}></div>
                <div style={{ fontSize: '9px', color: '#64748b', marginTop: '6px', whiteSpace: 'nowrap' }}>{bar.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* أقسام ووحدات النظام */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {sections.map((sec) => (
          <div key={sec.id} onClick={() => setActivePage(sec.id)} style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '18px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', borderTop: `4px solid ${sec.color}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ color: sec.color, marginBottom: '8px' }}>{sec.icon}</div>
            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#334155' }}>{sec.title}</span>
          </div>
        ))}
      </div>
      
      {/* إعدادات النظام */}
      <div onClick={() => setActivePage('settings')} style={{ backgroundColor: '#fff', borderRadius: '16px', marginTop: '20px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', color: '#64748b', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
        <Settings size={20}/> إعدادات النظام والنسخ الاحتياطي
      </div>
      <div style={{ height: '100px' }}></div>
    </div>
  );
};

export default Dashboard;
