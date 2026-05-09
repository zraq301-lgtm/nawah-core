import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ خطأ: لم يتم العثور على مفتاح GEMINI_API_KEY.");
  process.exit(1);
}

// تعديل بسيط لضمان الاتصال الصحيح
const genAI = new GoogleGenerativeAI(API_KEY);

async function runTest() {
  console.log("🚀 تشغيل محرك الذكاء الاصطناعي...");
  
  try {
    // جرب تغيير الموديل لنسخة مستقرة أو أحدث 
    // ملاحظة: أحياناً يتطلب الأمر 'gemini-pro' كبديل إذا كان flash في صيانة
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // إرسال طلب بسيط جداً للتأكد من الاتصال
    const result = await model.generateContent("Hello, are you active?");
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ استجابة النظام:");
    console.log("------------------------------");
    console.log(text);
    console.log("------------------------------");

  } catch (error) {
    console.error("🛑 خطأ في جلب البيانات:");
    console.log(error.message);
    
    // حل بديل فوري إذا استمر الخطأ: استخدام الرابط المباشر (curl-style) داخل الكود
    console.log("تلميح: تأكد من تحديث مكتبة @google/generative-ai لأحدث إصدار.");
  }
}

runTest();
