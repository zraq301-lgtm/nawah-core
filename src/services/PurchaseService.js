import { CapacitorHttp } from '@capacitor/core';

export const PurchaseService = {
  async createPurchaseOrder(tenantId, orderData, idempotencyKey) {
    try {
      // الرابط المحدث الذي طلبته
      const response = await CapacitorHttp.post({
        url: 'https://maamoul-pro-five.vercel.app/api/purchases/create',
        headers: { 
          'Content-Type': 'application/json' 
        },
        data: { 
          tenantId, 
          orderData, 
          idempotencyKey 
        }
      });

      // التحقق من حالة الاستجابة
      if (response.status === 409) throw new Error("DUPLICATE_ORDER");
      if (response.status !== 200) throw new Error("SERVER_ERROR");
      
      return response.data;
    } catch (error) {
      console.error("Purchase Service Error:", error);
      throw error;
    }
  }
};
