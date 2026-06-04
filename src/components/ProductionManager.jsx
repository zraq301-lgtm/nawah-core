import React, { useState } from 'react';
import { Factory, ArrowLeft, Box, RefreshCw, PackagePlus, AlertTriangle, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import Swal from 'sweetalert2';

const ProductionManager = ({ onBack }) => {
  const queryClient = useQueryClient();

  // 📥 1️⃣ جلب بيانات المواد ومحتويات المخزن بالكامل بدون فلاتر ضيقة لضمان التوافق مع المعايير الحرة
  const { data: stockResponse, isLoading, refetch } = useQuery({
    queryKey: ['stock'],
    queryFn: () => apiService.getData('items'), 
    staleTime: 0, 
  });

  // 📥 2️⃣ جلب معايير وبنيات الطبخات (BOM) لربط حركات التصنيع
  const { data: bomsResponse } = useQuery({
    queryKey: ['boms'],
    queryFn: () => apiService.getData('product_boms'),
    staleTime: 0,
  });

  const itemsList = Array.isArray(stockResponse)
    ? stockResponse
    : (stockResponse?.data || stockResponse?.items || []);

  const bomsList = Array.isArray(bomsResponse)
    ? bomsResponse
    : (bomsResponse?.data || bomsResponse?.items || []);

  // الواجهة تعرض للمستخدم كافة الأصناف المخزنية المتاحة للمراقبة والمراجعة
  const rawMaterials = itemsList;

  // 🛑 مدخلات أمر التشغيل والإنتاج
  const [productNameInput, setProductNameInput] = useState('');
  const [batchesToProduce, setBatchesToProduce] = useState(''); // عدد الطبخات المطلوبة بأمر التشغيل
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'الأولى'
  });

  const shifts = ['الأولى', 'الثانية', 'السهرة', 'إضافي'];

  // 🚀 معالج احتساب أمر التشغيل ودمج كميات الطبخات ديناميكياً
  const handleProcessProduction = async () => {
    if (isProcessing) return;

    const timestamp = Date.now();
    let consumedIngredients = [];
    let totalBomCost = 0;

    if (!itemsList || itemsList.length === 0) {
      Swal.fire('خطأ بالنظام', 'لا توجد مواد مخزنية مسجلة حالياً بالسيستم.', 'error');
      return;
    }

    const requestedBatches = batchesToProduce === '' ? 0 : parseFloat(batchesToProduce);
    const enteredProductName = productNameInput.trim();

    if (!enteredProductName || requestedBatches <= 0) {
      Swal.fire('تنبيه', 'يرجى كتابة اسم المنتج النهائي وتحديد عدد الطبخات المطلوبة لأمر التشغيل.', 'warning');
      return;
    }

    // 🔍 1️⃣ مطابقة اسم المنتج المكتوب حراً مع معيار الطبخة (BOM) المخزن بالقاعدة
    const cleanEnteredName = enteredProductName.toLowerCase().replace(/\s+/g, '');
    const matchedBom = bomsList.find(b => {
      const bName = (b.product_name || b.bom_name || b.name || '').toString().toLowerCase().replace(/\s+/g, '');
      return bName === cleanEnteredName || bName.includes(cleanEnteredName);
    });

    if (!matchedBom) {
      Swal.fire(
        'المعيار غير موجود',
        `لم يتم العثور على طبخة أو معيار (BOM) باسم "${enteredProductName}". يرجى التأكد من تهيئة المعيار أولاً بنفس الاسم في شاشة الإعدادات.`,
        'error'
      );
      return;
    }

    setIsProcessing(true);

    try {
      // 🔍 2️⃣ جلب وتفكيك مكونات المعيار المربوط بالخلفية
      // في حالة كانت المكونات مسجلة بجدول منفصل، يتم عمل استدعاء لها أو قراءتها مباشرة من العلاقة المضمنة
      const ingredientsList = matchedBom.ingredients || [];
      
      if (ingredientsList.length === 0) {
        // محاولة جلب فرعية احتياطية لضمان عدم توقف أمر التشغيل في بيئة الهجين
        try {
          const subIngredientsRes = await apiService.getData(`bom_ingredients?bom_id=${matchedBom.id}`);
          if (subIngredientsRes) {
            ingredientsList = Array.isArray(subIngredientsRes) ? subIngredientsRes : (subIngredientsRes.data || []);
          }
        } catch (e) {
          console.log("لم يتم تفعيل كاش المكونات الفرعي الديناميكي", e);
        }
      }

      if (ingredientsList.length === 0) {
        Swal.fire('بنية ناقصة', 'معادلة الإنتاج المسجلة لهذا المنتج فارغة أو لم يتم ربط خاماتها بشكل سليم.', 'error');
        setIsProcessing(false);
        return;
      }

      // 🧮 3️⃣ ضرب المقادير المعيارية للطبخة الواحدة في عدد الطبخات المطلوبة
      for (const ingredient of ingredientsList) {
        const requiredQtyInBom = parseFloat(ingredient.required_quantity || 0);
        
        // معادلة الإنتاج الحرة لزاد الخير: مقدار الخامة المطلوبة للطبخة الواحدة * عدد الطبخات المطلوبة
        const finalRequiredRawQty = requiredQtyInBom * requestedBatches;
        
        // جلب تفاصيل المادة من المخزن لمطابقة الرصيد والأسعار الحالية
        const currentRawStockItem = itemsList.find(s => s.id.toString() === ingredient.raw_material_id.toString());
        
        if (!currentRawStockItem) {
          Swal.fire('صنف مفقود', `المادة الخام ذات الكود (${ingredient.raw_material_id}) المطلوبة بالمعيار غير متوفرة بجدول الأصناف الحالية.`, 'error');
          setIsProcessing(false);
          return;
        }

        const currentAvailable = parseFloat(currentRawStockItem.available_quantity || 0);
        const rawUnitCost = parseFloat(currentRawStockItem.cost_price || 0);

        // مراقبة ومنع تصفير المخزن بالسالب
        if (currentAvailable < finalRequiredRawQty) {
          Swal.fire(
            'عجز في الخامات',
            `الخامة: (${currentRawStockItem.name})\nالكمية المطلوبة لتشغيل ${requestedBatches} طبخات هي: ${finalRequiredRawQty.toFixed(3)} كجم.\nالمتاح حالياً بالمستودع: ${currentAvailable} كجم فقط.`,
            'warning'
          );
          setIsProcessing(false);
          return;
        }

        totalBomCost += (finalRequiredRawQty * rawUnitCost);
        consumedIngredients.push({
          id: currentRawStockItem.id,
          name: currentRawStockItem.name,
          quantity: parseFloat(finalRequiredRawQty.toFixed(3)),
          unit_price: rawUnitCost
        });
      }

      // حساب إجمالي كمية المنتج النهائي الناتجة (الكمية المعيارية للطبخة * عدد الطبخات)
      const totalFinalProducedQty = parseFloat(matchedBom.base_quantity || 1) * requestedBatches;
      const calculatedUnitCost = totalFinalProducedQty > 0 ? parseFloat((totalBomCost / totalFinalProducedQty).toFixed(2)) : 0;

      // 🔄 4️⃣ ترحيل مستند حركة تصنيع رسمي لقاعدة البيانات لخصم الخامات وزيادة المنتج التام
      const productionVoucher = await apiService.createData('invoices', {
        invoice_number: `PROD-BATCH-${timestamp}`,
        invoice_type: 'manufacturing',
        contact_id: 1, 
        gross_amount: totalBomCost,
        net_amount: totalBomCost,
        paid_amount: totalBomCost,
        remaining_amount: 0,
        description: `تشغيل أمر إنتاج بعدد (${requestedBatches}) طبخات للمنتج: [ ${enteredProductName} ] - وردية: ${formData.shift}`
      });

      const voucherId = productionVoucher?.id || productionVoucher?.data?.id;

      // أ) ترحيل الخامات المستهلكة في تفاصيل الحركة لخصم أرصدتها تلقائياً
      for (const rawItem of consumedIngredients) {
        await apiService.createData('invoice_items', {
          invoice_id: voucherId,
          item_id: rawItem.id,
          quantity: rawItem.quantity,
          unit_price: rawItem.unit_price,
          total_price: parseFloat((rawItem.quantity * rawItem.unit_price).toFixed(2)),
          notes: `سحب خامات لعدد ${requestedBatches} طبخات`
        });
      }

      // ب) إدراج وزيادة رصيد المنتج النهائي الصادر في المستودع
      // نبحث عن السجل التام إذا كان مسجلاً بالاسم، وإذا لم يوجد ندرجه مباشرة كحركة ربط مرنة
      const targetProductItem = itemsList.find(s => s.name?.toString().toLowerCase().trim() === enteredProductName.toLowerCase().trim());
      
      await apiService.createData('invoice_items', {
        invoice_id: voucherId,
        item_id: targetProductItem ? targetProductItem.id : matchedBom.id, // استخدام المعرف المطابق لحفظ التوازن
        quantity: totalFinalProducedQty,
        unit_price: calculatedUnitCost,
        total_price: totalBomCost,
        notes: `إنتاج نهائي جاهز مستلم من خط الطبخ`
      });

      // 🔄 5️⃣ تحديث كاش المستودع الفوري بالواجهات
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      await refetch();

      Swal.fire({
        title: 'تم ترحيل أمر التشغيل',
        text: `[زاد الخير]: تم تنفيذ عدد (${requestedBatches}) طبخات بنجاح من المزيج، وخصم المواد المستهلكة من المخزن فوراً!`,
        icon: 'success',
        confirmButtonColor: '#4f46e5'
      });

      setProductNameInput('');
      setBatchesToProduce('');
      if (onBack) onBack();

    } catch (error) {
      console.error(error);
      Swal.fire('فشل الترحيل', `🚨 لم تكتمل العملية: ${error.message || "يرجى مراجعة الصلاحيات للـ Schema"}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: '16px', border: '2px solid #e2e8f0',
    fontSize: '14px', fontWeight: 'bold', textAlign: 'center', outline: 'none', color: '#1e293b', boxSizing: 'border-box',
    backgroundColor: '#f8fafc'
  };

  return (
    <div style={{ direction: 'rtl', padding: '16px', backgroundColor: '#f4f7fe', minHeight: '100vh', fontFamily: "Tajawal, sans-serif", maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* الرأس الهيدر */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '24px', border: '1px solid #f1f5f9', marginBottom: '20px', boxSizing: 'border-box' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>⚙️ إدارة وتشغيل خطوط الإنتاج والطبخ</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>زاد الخير • احتساب مكونات الطبخات وسحبها ديناميكياً</p>
        </div>
      </div>

      {/* شاشة الأرصدة الحالية لجميع محتويات المخزن */}
      <div style={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '24px', padding: '20px', marginBottom: '20px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', borderBottom: '1px solid #475569', paddingBottom: '10px' }}>
          <Box size={18} color="#3b82f6" />
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '14px', fontWeight: '700' }}>مراقبة الأرصدة الحالية لجميع مواد المخزن</h3>
        </div>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '15px', color: '#3b82f6', fontWeight: 'bold' }}>جاري تحديث قراءة الكميات المتوفرة...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {rawMaterials.slice(0, 8).map(mat => (
              <div key={mat.id} style={{ backgroundColor: '#2d3a4f', padding: '10px 12px', borderRadius: '14px', border: '1px solid #475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{mat.name}</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981', backgroundColor: '#1e293b', padding: '4px 6px', borderRadius: '8px' }}>
                  {mat.available_quantity || 0} كجم
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* تفاصيل أمر الطبخ والتصنيع */}
      <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9', boxSizing: 'border-box', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.01)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <PackagePlus size={20} color="#6366f1" />
          <h3 style={{ margin: 0, color: '#1e293b', fontSize: '14px', fontWeight: '800' }}>إصدار أمر تشغيل (حساب بالطبخة)</h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#475569', fontWeight: '700' }}>اكتب اسم المنتج النهائي (يسحب معيار الطبخة من هناك)</label>
            <input 
              type="text"
              placeholder="مثال: معمول عجوة فاخر"
              value={productNameInput}
              onChange={(e) => setProductNameInput(e.target.value)}
              style={{ ...inputStyle, border: '2px solid #6366f1', textAlign: 'right', backgroundColor: '#fff' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#475569', fontWeight: '700' }}>عدد الطبخات المطلوبة لخط الإنتاج الحالي</label>
            <input 
              type="number" 
              placeholder="اكتب كم طبخة تريد تشغيلها (مثال: 2)" 
              value={batchesToProduce} 
              onChange={(e) => setBatchesToProduce(e.target.value)} 
              style={{ ...inputStyle, border: '2px solid #6366f1', backgroundColor: '#fff' }} 
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '6px', color: '#64748b', fontWeight: 'bold' }}>تاريخ التشغيل</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData(p => ({...p, date: e.target.value}))} style={{ ...inputStyle, padding: '10px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '6px', color: '#64748b', fontWeight: 'bold' }}>الوردية الحالية</label>
            <select value={formData.shift} onChange={(e) => setFormData(p => ({...p, shift: e.target.value}))} style={{ ...inputStyle, padding: '10px' }}>
              {shifts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* أزرار الحفظ والإرسال المعتمدة لقاعدة البيانات */}
      <button 
        onClick={handleProcessProduction} 
        disabled={isProcessing}
        style={{ width: '100%', padding: '16px', background: isProcessing ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', border: 'none', borderRadius: '20px', fontWeight: 'bold', fontSize: '15px', marginTop: '20px', marginBottom: '12px', cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        {isProcessing ? (
          <>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            جاري احتساب المكونات وخصم الخامات...
          </>
        ) : (
          "بدء معالجة الطبخات وخصم الخامات تلقائياً"
        )}
      </button>

      <button onClick={onBack} style={{ width: '100%', background: '#fff', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '20px', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '30px' }}>
        <ArrowLeft size={16} /> العودة للشاشة السابقة
      </button>
    </div>
  );
};

export default ProductionManager;
