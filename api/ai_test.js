async function runNawahAI() {
  const API_KEY = process.env.GEMINI_API_KEY;
  
  if (!API_KEY) {
    console.error("❌ خطأ: لم يتم العثور على المفتاح السري.");
    return;
  }

  // استخدام الرابط المباشر للـ API (v1) بدلاً من v1beta
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  console.log("🚀 جاري الاتصال المباشر بمركز ذكاء نواة...");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: "Hello, you are Nawah AI-OS. Give me a 1-sentence tip for a modern factory." }]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const aiResponse = data.candidates[0].content.parts[0].text;

    console.log("✅ تم الاتصال بنجاح!");
    console.log("------------------------------");
    console.log("نصيحة الذكاء الاصطناعي:", aiResponse);
    console.log("------------------------------");

  } catch (error) {
    console.error("🛑 فشل الاتصال المباشر:");
    console.error(error.message);
  }
}

runNawahAI();
