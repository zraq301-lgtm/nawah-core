// أضف onLoginSuccess هنا في تعريف المكون
const LoginPage = ({ onLoginSuccess }) => { 
  // ... باقي الحالات (states) كما هي ...

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '' });

    const result = await loginToOdoo(formData.email, formData.password);

    if (result.success) {
      // حفظ بنفس المسمى الموحد odoo_uid
      localStorage.setItem('odoo_uid', result.uid);
      localStorage.setItem('user_email', formData.email);
      localStorage.setItem('user_pass', formData.password);
      
      // إيقاف التحميل
      setStatus({ loading: false, error: '' });

      // أهم خطوة: إخبار ملف main بالنجاح ليقوم بتبديل الصفحة فوراً
      if (onLoginSuccess) {
        onLoginSuccess(); 
      }
    } else {
      setStatus({ loading: false, error: result.error });
    }
  };

  // ... باقي كود الـ return كما هو ...
};
