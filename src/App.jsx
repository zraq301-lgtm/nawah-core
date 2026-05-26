import React, { useState } from 'react';
// استدعاء عميل سوبابيز الحقيقي والمعدل بالبيانات الصحيحة
import { supabase } from '../config/supabase';

const SupabaseDiagnostic = () => {
    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState('جاهز للفحص');

    const addLog = (msg, data = null) => {
        setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, data }, ...prev]);
    };

    const runDiagnostic = async () => {
        setStatus('جاري الفحص...');
        setLogs([]);
        addLog('--- بدء عملية الفحص الشامل لمنصة سوبابيز ---');

        try {
            // 1. فحص الاتصال وجلب بيانات المستخدم الحالي
            addLog('1. التحقق من جلسة المستخدم الحالي ومصادقة البيانات...');
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError) {
                addLog('خطأ في جلب بيانات المستخدم:', userError);
            } else {
                addLog('تم التحقق من المستخدم الحالي بنجاح والمظهر العام له:', {
                    id: user?.id,
                    email: user?.email,
                    role: user?.role
                });
            }

            // 2. فحص جدول أنواع العمليات (picking_types) في قاعدة البيانات
            addLog('2. جلب أنواع العمليات المتاحة من السيرفر...');
            const { data: types, error: typesError } = await supabase
                .from('picking_types') // تأكد من مطابقة اسم الجدول في قاعدة بياناتك
                .select('id, name, display_name, code')
                .eq('active', true);

            if (typesError) {
                addLog('خطأ أثناء جلب أنواع العمليات:', typesError);
            } else {
                addLog('نتيجة أنواع العمليات بنجاح:', types);
            }

            // 3. فحص جدول المواقع والمخازن (locations) في قاعدة البيانات
            addLog('3. جلب مواقع المخزن المتاحة من السيرفر...');
            const { data: locations, error: locationsError } = await supabase
                .from('locations') // تأكد من مطابقة اسم الجدول في قاعدة بياناتك
                .select('id, display_name')
                .eq('usage', 'internal');

            if (locationsError) {
                addLog('خطأ أثناء جلب مواقع المخزن:', locationsError);
            } else {
                addLog('نتيجة المواقع المستلمة بنجاح:', locations);
            }

        } catch (err) {
            addLog('حدث خطأ غير متوقع أثناء الفحص العام:', err.message);
        }

        setStatus('تم الفحص. راجع السجلات بالأسفل.');
    };

    return (
        <div style={{ padding: '20px', direction: 'rtl', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
            <h2>🛠 وحدة تشخيص اتصال سوبابيز (Supabase)</h2>
            <p>الحالة: <strong>{status}</strong></p>
            
            <button 
                onClick={runDiagnostic}
                style={{ padding: '15px 30px', backgroundColor: '#4338ca', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}
            >
                ابدأ فحص التكليف والبيانات
            </button>

            <div style={{ marginTop: '20px', backgroundColor: '#1e1e1e', color: '#00ff00', padding: '15px', borderRadius: '8px', overflowX: 'auto', textAlign: 'left', direction: 'ltr' }}>
                <h3>Logs / السجلات:</h3>
                {logs.map((log, index) => (
                    <div key={index} style={{ marginBottom: '10px', borderBottom: '1px solid #333' }}>
                        <span style={{ color: '#888' }}>[{log.time}]</span> 
                        <span style={{ color: '#fff', marginLeft: '10px' }}>{log.msg}</span>
                        {log.data && (
                            <pre style={{ fontSize: '12px', color: '#00d4ff' }}>
                                {JSON.stringify(log.data, null, 2)}
                            </pre>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SupabaseDiagnostic;
