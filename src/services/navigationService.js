import { App as AppLauncher } from '@capacitor/app';

/**
 * خدمة إدارة زر الرجوع الخاص بالهاتف (Hardware Back Button)
 */
export const navigationService = {
  privateListener: null,

  /**
   * تفعيل الاستماع لزر الرجوع الخاص بالهاتف
   * @param {string} activePage - الصفحة النشطة حالياً
   * @param {function} setActivePage - دالة تغيير الصفحة القادمة من App.jsx
   */
  initBackButton: function (activePage, setActivePage) {
    // تنظيف أي مستمع سابق لتجنب تكرار العمليات وتداخل الصفحات
    this.destroy();

    this.privateListener = AppLauncher.addListener('backButton', () => {
      // 1. إذا كان المستخدم في اللوحة الرئيسية (الداشبورد)، يتم إغلاق التطبيق فوراً بالخروج الكامل
      if (activePage === 'dashboard' || activePage === 'login') {
        AppLauncher.exitApp();
      } 
      // 2. إذا كان المستخدم داخل الأقسام الفرعية (الخامات، التوريد، المنتجات) في صفحة المخزن
      else if (activePage === 'raw' || activePage === 'supply' || activePage === 'finished') {
        setActivePage('inventory'); // إرجاعه لواجهة المخزن الرئيسية
      }
      // 3. إذا كان في أي قسم آخر من أقسام التطبيق، يتم إرجاعه للوحة التحكم (الرئيسية)
      else {
        setActivePage('dashboard');
      }
    });
  },

  /**
   * إلغاء تفعيل الاستماع لزر الرجوع (يُستدعى عند إغلاق المكون)
   */
  destroy: function () {
    if (this.privateListener) {
      this.privateListener.then(handler => handler.remove());
      this.privateListener = null;
    }
  }
};
