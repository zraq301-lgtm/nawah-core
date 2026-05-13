// بيانات سيرفر أودو الخاص بك
const ODOO_CONFIG = {
  baseUrl: 'https://nawahio1.odoo.com',
  db: 'nawahio1', // اسم قاعدة البيانات المستخرج من الرابط
};

export const loginToOdoo = async (email, password) => {
  try {
    const response = await fetch(`${ODOO_CONFIG.baseUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "common",
          method: "login",
          args: [ODOO_CONFIG.db, email, password]
        }
      })
    });

    const data = await response.json();

    // أودو يرجع رقم (UID) في حال النجاح، ويرجع False في حال الفشل
    if (data.result && typeof data.result === 'number') {
      return { success: true, uid: data.result };
    } else {
      return { success: false, error: "بيانات الدخول غير صحيحة" };
    }
  } catch (err) {
    return { success: false, error: "فشل الاتصال بسيرفر أودو" };
  }
};
