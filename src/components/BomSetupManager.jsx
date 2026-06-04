// components/BomSetupManager.jsx
import React, { useState } from 'react';
import { Save, Plus, Trash2, ArrowLeft, Layers, Scale, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import Swal from 'sweetalert2';

const BomSetupManager = ({ onBack }) => {
  const queryClient = useQueryClient();

  // 📥 1. جلب كافة الأصناف من المخزن دون استثناء
  const { data: stockResponse, isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: () => apiService.getData('items'),
    staleTime: 5 * 60 * 1000, 
  });

  // تحويل البيانات القادمة إلى مصفوفة صالحة للاستخدام مباشرة
  const allItems = Array.isArray(stockResponse)
    ? stockResponse
    : (stockResponse?.data || stockResponse?.items || []);

  // 🛑 حالات الواجهة المدخلة (State)
  const [finalProductName, setFinalProductName] = useState('');
  const [bomName, setBomName] = useState('');
  const [baseQuantity, setBaseQuantity] = useState('1.000');
  const [ingredients, setIngredients] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // ➕ إضافة سطر مادة خام جديدة للشبكة
  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      { raw_material_id: '', required_quantity: '' }
    ]);
  };

  // ❌ حذف سطر مادة خام من الشبكة
  const handleRemoveIngredient = (index) => {
    const updated = [...ingredients];
    updated.splice(index, 1);
    setIngredients(updated);
  };

  // 🔄 تحديث بيانات الخامات المحددة داخل الشبكة
  const handleIngredientChange = (index, field, value) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  // 🚀 إرسال وحفظ المعادلة والطبخة كاملة لقاعدة البيانات في خبطة واحدة
  const handleSaveBom = async () => {
    // التحقق المرن من المدخلات الأساسية
    if (!finalProductName.trim() || !bomName.trim() || !baseQuantity || parseFloat(baseQuantity) <= 0) {
      <p style={{ display: 'none' }} />
      Swal.fire({
        title: 'تنبيــه',
        text: 'يرجى كتابة اسم المنتج النهائي، تحديد اسم الطبخة، وتحديد الكمية المعيارية بشكل صحيح.',
        icon: 'warning',
        confirmButtonText: 'مفهوم',
        confirmButtonColor: '#6366f1'
      });
      return;
    }

    if (ingredients.length === 0) {
      Swal.fire({
        title: 'تركيبة فارغة',
        text: 'لا يمكن حفظ طبخة فارغة! يرجى إضافة مادة خام واحدة على الأقل من المواد المتاحة.',
        icon: 'warning',
        confirmButtonText: 'إضافة خامات',
        confirmButtonColor: '#6366f1'
      });
      return;
    }

    // التحقق من صحة مصفوفة المكونات وتجهيزها
    const formattedIngredients = [];
    for (let i = 0; i < ingredients.length; i++) {
      if (!ingredients[i].raw_material_id || !ingredients[i].required_quantity || parseFloat(ingredients[i].required_quantity) <= 0) {
        Swal.fire({
          title: 'بيانات ناقصة',
          text: `يرجى اختيار المادة الخام وتحديد كمية صحيحة في السطر رقم (${i + 1}).`,
          icon: 'error',
          confirmButtonText: 'تصحيح الخطأ',
          confirmButtonColor: '#ef4444'
        });
        return;
      }
      
      formattedIngredients.push({
        raw_material_id: parseInt(ingredients[i].raw_material_id),
        required_quantity: parseFloat(ingredients[i].required_quantity)
      });
    }

    setIsSaving(true);
    try {
      // 📦 إرسال الرأس والتفاصيل معاً في كائن واحد (Single Request) متوافق مع الـ API المحدث
      await apiService.createData('product_boms', {
        product_name: finalProductName.trim(),
        bom_name: bomName.trim(),
        base_quantity: parseFloat(baseQuantity),
        ingredients: formattedIngredients // المصفوفة المدمجة ليقوم الـ API بترحيلها بـ Transaction واحدة
      });

      // 🔄 تنظيف كاش النظام ليعيد قراءة المعادلات المحدثة فوراً
      await queryClient.invalidateQueries({ queryKey: ['boms'] });
      
      Swal.fire({
        title: 'تم الاعتماد بنجاح',
        text: '[زاد الخير]: تم تسجيل الرأس وتفاصيل المكونات معاً بنجاح في قاعدة البيانات دون أي فقدان للبيانات!',
        icon: 'success',
        confirmButtonText: 'ممتاز',
        confirmButtonColor: '#10b981'
      });
      
      // تصفير الخانات بالكامل بعد النجاح
      setFinalProductName('');
      setBomName('');
      setBaseQuantity('1.000');
      setIngredients([]);
      
      if (onBack) onBack();

    } catch (error) {
      console.error("🚨 خطأ أثناء الحفظ التكاملي من الفرونت إند:", error);
      Swal.fire({
        title: 'فشل الحفظ التكاملي',
        text: `🚨 فشل ترحيل المكونات: ${error.message || "يرجى التحقق من اتصال السيرفر بـ Neon"}`,
        icon: 'error',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const styles = {
    card: {
      backgroundColor: '#fff',
      borderRadius: '24px',
      padding: '24px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.02), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
      marginBottom: '24px',
      border: '1px solid #f1f5f9'
    },
    label: {
      display: 'block',
      fontSize: '13px',
      color: '#475569',
      fontWeight: '700',
      marginBottom: '8px',
      fontFamily: 'Tajawal, sans-serif'
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '16px',
      border: '2px solid #e2e8f0',
      fontSize: '14px',
      fontWeight: 'bold',
      outline: 'none',
      color: '#1e293b',
      backgroundColor: '#f8fafc',
      boxSizing: 'border-box',
      fontFamily: 'Tajawal, sans-serif',
      transition: 'all 0.2s ease'
    }
  };

  return (
    <div style={{ direction: 'rtl', padding: '16px', backgroundColor: '#f4f7fe', minHeight: '100vh', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif' }}>
      
      {/* هيدر الشاشة */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '24px', marginBottom: '20px', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', padding: '12px', borderRadius: '16px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}># تهيئة وتركيب الطبخات (BOM)</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>زاد الخير • ربط المنتجات بالمعايير الحرة</p>
          </div>
        </div>
        <button onClick={onBack} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '14px', fontSize: '13px', fontWeight: '700' }}>
          <ArrowLeft size={16} /> عودة
        </button>
      </div>

      {/* القسم الأول: البيانات الأساسية */}
      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <Sparkles size={18} color="#6366f1" />
          <h3 style={{ margin: 0, fontSize: '14px', color: '#1e293b', fontWeight: '800' }}>1. المعطيات الأساسية للصنف المستهدف</h3>
        </div>
        
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '30px 0', color: '#4f46e5', fontWeight: '700' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>جاري جلب بيانات المستودع...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={styles.label}>المنتج النهائي الصادر</label>
              <input 
                type="text"
                placeholder="اكتب اسم المنتج النهائي (مثال: معمول عجوة فاخر)" 
                value={finalProductName} 
                onChange={(e) => setFinalProductName(e.target.value)} 
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>اسم المعيار / الطبخة المميز</label>
              <input 
                type="text" 
                placeholder="مثال: خلطة الطباخ السرية بالسمن البلدي" 
                value={bomName} 
                onChange={(e) => setBomName(e.target.value)} 
                style={styles.input} 
              />
            </div>

            <div>
              <label style={styles.label}>الكمية القياسية المستهدفة من هذه الخلطة</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="number" 
                  step="0.001"
                  value={baseQuantity} 
                  onChange={(e) => setBaseQuantity(e.target.value)} 
                  style={{ ...styles.input, paddingLeft: '45px', paddingRight: '45px', textAlign: 'center' }} 
                />
                <Scale size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px' }} />
                <span style={{ position: 'absolute', right: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>كجم/وحدة</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* القسم الثاني: بناء وتحديث المواد الخام ديناميكياً */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#1e293b', fontWeight: '800' }}>2. الخامات الداخلة ونسب المقادير (يعرض كامل المخزن)</h3>
          </div>
          <button 
            type="button" 
            onClick={handleAddIngredient} 
            style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> إضافة مادة خام
          </button>
        </div>

        {ingredients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '20px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={24} color="#94a3b8" />
            <span style={{ fontSize: '13px', fontWeight: '700' }}>التركيبة فارغة حالياً</span>
            <span style={{ fontSize: '11px' }}>اضغط على زر إضافة مادة خام لعرض قائمة المستودع الكاملة.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {ingredients.map((ing, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#6366f1', backgroundColor: '#e0e7ff', padding: '2px 8px', borderRadius: '6px' }}>مكون رقم #{index + 1}</span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveIngredient(index)} 
                    style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '10px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ ...styles.label, fontSize: '12px' }}>المادة الخام</label>
                    <select 
                      value={ing.raw_material_id} 
                      onChange={(e) => handleIngredientChange(index, 'raw_material_id', e.target.value)} 
                      style={{ ...styles.input, backgroundColor: '#fff' }}
                    >
                      <option value="">-- اختر مادة من كامل محتويات المخزن --</option>
                      {allItems.map(mat => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} (المتاح حالياً: {mat.available_quantity || 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ ...styles.label, fontSize: '12px' }}>الوزن / المقدار المطلوب بالخلطة</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="number" 
                        step="0.001"
                        placeholder="مثال: 0.500" 
                        value={ing.required_quantity} 
                        onChange={(e) => handleIngredientChange(index, 'required_quantity', e.target.value)} 
                        style={{ ...styles.input, backgroundColor: '#fff', paddingLeft: '40px' }} 
                      />
                      <span style={{ position: 'absolute', left: '12px', fontSize: '12px', fontWeight: 'bold', color: '#94a3b8' }}>كجم</span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* زر الحفظ النهائي المعتمد */}
      <button 
        type="button" 
        onClick={handleSaveBom} 
        disabled={isSaving}
        style={{ width: '100%', padding: '16px', backgroundColor: isSaving ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', borderRadius: '20px', fontWeight: 'bold', fontSize: '15px', marginTop: '12px', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '40px' }}
      >
        {isSaving ? (
          <>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            جاري الاعتماد في الاسكيما...
          </>
        ) : (
          <>
            <Save size={20} /> اعتماد وحفظ معيار الطبخة بشكل دائم
          </>
        )}
      </button>

    </div>
  );
};

export default BomSetupManager;
