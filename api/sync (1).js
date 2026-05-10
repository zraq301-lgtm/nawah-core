import clientPromise from "../lib/mongodb.js";

export default async function handler(request, response) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') return response.status(200).end();
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

    try {
        const client = await clientPromise;
        const db = client.db("maamoul_db");
        const { collectionName, data } = request.body;

        // التحقق من وجود البيانات الأساسية
        if (!collectionName || data === undefined || data === null) {
            return response.status(400).json({ error: 'بيانات ناقصة' });
        }

        if (Array.isArray(data)) {
            // --- علاج الخطأ الرئيسي هنا ---
            // إذا كانت المصفوفة فارغة، ننهي الطلب بنجاح دون إرسال شيء لقاعدة البيانات
            if (data.length === 0) {
                return response.status(200).json({ 
                    success: true, 
                    message: 'لا توجد بيانات للمزامنة (المصفوفة فارغة)',
                    result: { matchedCount: 0, upsertedCount: 0 } 
                });
            }

            const operations = data.map(item => {
                const { _id, ...cleanData } = item; 
                
                return {
                    updateOne: {
                        filter: { id: item.id }, 
                        update: { 
                            $set: { 
                                ...cleanData, 
                                updatedAt: new Date() 
                            } 
                        },
                        upsert: true
                    }
                };
            });

            // الآن استدعاء bulkWrite آمن لأننا تأكدنا أن data.length > 0
            const result = await db.collection(collectionName).bulkWrite(operations);
            return response.status(200).json({ success: true, result });

        } else {
            // التعامل مع عنصر واحد (Object)
            const { _id, ...cleanData } = data;
            
            const result = await db.collection(collectionName).updateOne(
                { id: data.id },
                { $set: { ...cleanData, updatedAt: new Date() } },
                { upsert: true }
            );
            return response.status(200).json({ success: true, result });
        }

    } catch (error) {
        console.error('Database Sync Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
