import React, { useState } from 'react';
import { CapacitorHttp } from '@capacitor/core';
import Swal from 'sweetalert2';

const ODOO_BASE_URL = 'https://nawahio1.odoo.com';
const ODOO_DB = 'nawahio1';

const OdooDiagnostic = () => {
    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState('جاهز للفحص');

    const addLog = (msg, data = null) => {
        setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, data }, ...prev]);
    };

    const callOdooRaw = async (model, method, args = [[]], kwargs = {}) => {
        const uid = localStorage.getItem('odoo_uid');
        const password = localStorage.getItem('user_pass');
        
        const payload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute_kw",
                args: [ODOO_DB, parseInt(uid), password, model, method, args, kwargs]
            },
            id: Math.random()
        };

        try {
            const response = await CapacitorHttp.post({
                url: `${ODOO_BASE_URL}/jsonrpc`,
                headers: { 'Content-Type': 'application/json' },
                data: payload
            });
            return response.data;
        } catch (err) {
            return { error: err.message };
        }
    };

    const runDiagnostic = async () => {
        setStatus('جاري الفحص...');
        setLogs([]);
        addLog('--- بدء عملية الفحص الشامل ---');

        // 1. فحص أنواع العمليات (Picking Types)
        addLog('1. جلب أنواع العمليات المتاحة...');
        const types = await callOdooRaw("stock.picking.type", "search_read", [[["active", "=", true]]], { fields: ["id", "name", "display_name", "code"] });
        addLog('نتيجة أنواع العمليات:', types);

        // 2. فحص المواقع (Locations)
        addLog('2. جلب مواقع المخزن المتاحة...');
        const locations = await callOdooRaw("stock.location", "search_read", [[["usage", "=", "internal"]]], { fields: ["id", "display_name"] });
        addLog('نتيجة المواقع:', locations);

        // 3. تجربة إنشاء "مسودة" استلام (Dry Run)
        if (types.result && locations.result) {
            addLog('3. تجربة إنشاء مستند "مسودة" لاختبار الصلاحيات...');
            const testDraft = await callOdooRaw("stock.picking", "create", [{
                'picking_type_id': types.result[0].id,
                'location_id': 4, // المورد
                'location_dest_id': locations.result[0].id,
                'origin': 'فحص التطبيق'
            }]);
            addLog('نتيجة تجربة الإنشاء:', testDraft);
        }

        setStatus('تم الفحص. راجع السجلات بالأسفل.');
    };

    return (
        <div style={{ padding: '20px', direction: 'rtl', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
            <h2>🛠 وحدة تشخيص اتصال أودو</h2>
            <p>الحالة: <strong>{status}</strong></p>
            
            <button 
                onClick={runDiagnostic}
                style={{ padding: '15px 30px', backgroundColor: '#714B67', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}
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

export default OdooDiagnostic;
