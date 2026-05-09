async function runNawahAI() {
  const API_KEY = process.env.GEMINI_API_KEY;
  
  if (!API_KEY) {
    console.error("❌ خطأ: لم يتم العثور على المفتاح السري GEMINI_API_KEY.");
    return;
  }

  // تجربة الموديل 'gemini-pro' لأنه الأكثر استقراراً في الـ v1
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

  console.log("🚀 جاري محاولة الاتصال بـ Gemini Pro...");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: "Hello Gemini, this is Nawah AI-OS. Confirm connection." }]
        }]
      })
    });

    const data = await response.json();

    // فحص إذا كان هناك خطأ في الاستجابة من جوجل
    if (data.error) {
      console.error("🛑 رد جوجل بالخطأ:", data.error.message);
      return;
    }

    if (data.candidates && data.candidates[0].content) {
      const aiResponse = data.candidates[0].content.parts[0].text;
      console.log("✅ تم الاتصال بنجاح!");
      console.log("------------------------------");
      console.log("رد النظام:", aiResponse);
      console.log("------------------------------");
    } else {
      console.log("⚠️ تم الاتصال ولكن لم يتم استلام نص. تفاصيل الرد:", JSON.stringify(data));
    }

  } catch (error) {
    console.error("🛑 فشل الاتصال تماماً:");
    console.error(error.message);
  }
}

runNawahAI();
