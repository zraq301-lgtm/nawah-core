-- Nawah AI-OS: Core Database Schema (V1.0)
-- This schema supports Multi-tenancy and AI-driven Insights.

-- 1. المنظمات (المصانع/المحلات)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100), -- مثال: تصنيع ملابس، مخبز، تجارة تجزئة
    owner_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. المستودع الذكي (Inventory)
-- صُمم ليدعم التنبؤ بالنواقص
CREATE TABLE smart_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100), -- كود المنتج
    current_stock DECIMAL(12, 2) DEFAULT 0.00,
    unit_measure VARCHAR(50), -- (كيلو، قطعة، متر)
    cost_per_unit DECIMAL(12, 2),
    min_safety_threshold DECIMAL(12, 2), -- الحد الأدنى الذكي
    ai_restock_prediction DATE, -- تاريخ التنبؤ بالنقص القادم
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. سجلات الإنتاج والعمليات (Intelligence Feed)
-- هذا الجدول هو المصدر الأساسي لبيانات الذكاء الاصطناعي
CREATE TABLE production_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    item_id UUID REFERENCES smart_inventory(id),
    operation_type VARCHAR(50), -- (إنتاج، هالك، بيع، توريد)
    quantity DECIMAL(12, 2) NOT NULL,
    waste_percentage DECIMAL(5, 2), -- نسبة الهالك (يحسبها النظام ذكياً)
    notes TEXT, -- ملاحظات الموظفين التي يحللها الـ AI لاحقاً
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. محرك التوصيات (AI Insights Engine)
-- حيث يضع النظام "بصيرته" الرقمية
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    category VARCHAR(50), -- (نقص مخزون، هدر موارد، فرصة ربح)
    priority_level VARCHAR(20), -- (عاجل، تنبيه، معلومة)
    insight_text TEXT NOT NULL,
    suggested_action TEXT, -- ما الذي يجب على صاحب العمل فعله؟
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. سجلات التلمذة (Apprentice Contributions)
-- لتتبع من من المتدربين قام بتطوير أي جزء
CREATE TABLE apprentice_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apprentice_github_user VARCHAR(100),
    module_name VARCHAR(100),
    contribution_type VARCHAR(50),
    review_score INTEGER CHECK (review_score BETWEEN 1 AND 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
