import { GoogleGenerativeAI } from "@google/generative-ai";

// جلب المفتاح السري من بيئة التشغيل (GitHub Secrets)
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ خطأ: لم يتم العثور على مفتاح GEMINI_API_KEY.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function runTest() {
  console.log("🚀 تشغيل محرك الذكاء الاصطناعي من مسار /api...");
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = "You are Nawah AI-OS. Give a technical tip for building a scalable SaaS.";

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    console.log("✅ استجابة النظام:");
    console.log("------------------------------");
    console.log(response.text());
    console.log("------------------------------");

  } catch (error) {
    console.error("🛑 فشل في المسار /api:", error.message);
  }
}

runTest();
