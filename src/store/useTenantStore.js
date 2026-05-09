import { create } from 'zustand';

export const useTenantStore = create((set) => ({
  // بيانات العميل الحالي (تأتي من قاعدة البيانات لاحقاً)
  tenantId: 'factory-789-unique', 
  tenantName: 'مصنع المعمول الحديث',
  aiStatus: 'Active',
  
  // دالة لتغيير العميل (عند تسجيل الدخول مثلاً)
  setTenant: (id, name) => set({ tenantId: id, tenantName: name }),
}));
