// حساب السعر ووقت الطباعة التقريبي — تستخدمه صفحة Studio ولوحة الإدارة (المعاينة) بنفس المعادلة
// السعر = max(أقل سعر، الغرامات × سعر الغرام + رسوم كل لون إضافي + رسوم تجهيز الأداة + ساعات الطباعة × سعر الساعة)

// نموذج الوقت (قابل للتعديل من لوحة الإدارة حتى يطابق تقديرات Bambu Studio):
// - printFlow: متوسط سرعة الطباعة بالـ mm³ في الثانية (A1 بطبقات 0.2: حوالي 7)
// - swapSeconds: مدة كل تبديل خيط مع التنظيف (AMS lite: حوالي 70 ثانية)
// - startupMinutes: التحمية والمعايرة قبل البدء
// - layerSeconds: وقت الانتقال بين الطبقات
export const TIME_DEFAULTS = { printFlow: 7, swapSeconds: 70, startupMinutes: 5, layerSeconds: 2 };

const num = (v, fallback) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? fallback : Number(v));

export const toolPricing = (config, toolId) => {
  const t = config?.tools?.[toolId] || {};
  return {
    enabled: t.enabled !== false,
    pricePerGram: num(t.pricePerGram, Number(config?.pricePerGram) || 0),
    minPrice: num(t.minPrice, Number(config?.minPrice) || 0),
    setupFee: Number(t.setupFee) || 0,
    colorFee: Number(config?.colorFee) || 0,
    pricePerHour: Number(config?.pricePerHour) || 0,
  };
};

/** وقت الطباعة التقريبي بالدقائق، من إحصاءات المجسّم (stats في export.js) */
export function printMinutes(st, config) {
  if (!st) return 0;
  const flow = Math.max(0.5, num(config?.printFlow, TIME_DEFAULTS.printFlow));
  const swap = num(config?.swapSeconds, TIME_DEFAULTS.swapSeconds);
  const startup = num(config?.startupMinutes, TIME_DEFAULTS.startupMinutes);
  const layer = num(config?.layerSeconds, TIME_DEFAULTS.layerSeconds);
  const sec = (st.printedVolume || 0) / flow + (st.layers || 0) * layer + (st.swaps || 0) * swap + startup * 60;
  return sec / 60;
}

/** «2 س 35 د» */
export function formatMinutes(m) {
  const total = Math.max(1, Math.round(m));
  const h = Math.floor(total / 60), mm = total % 60;
  return h ? `${h} س ${mm} د` : `${mm} د`;
}

export function priceFor(config, toolId, grams, colors = 1, minutes = 0) {
  const p = toolPricing(config, toolId);
  const raw = grams * p.pricePerGram + Math.max(0, colors - 1) * p.colorFee + p.setupFee + (minutes / 60) * p.pricePerHour;
  return Math.max(p.minPrice, raw);
}

export const isToolEnabled = (config, toolId) => toolPricing(config, toolId).enabled;

/** كلفة تنزيل ملف من الأداة بالكريدت: قيمة الأداة، وإلا القيمة الافتراضية (0 = مجاني) */
export function toolCredits(config, toolId) {
  const v = config?.tools?.[toolId]?.credits;
  if (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))) return Math.max(0, Math.round(Number(v)));
  return Math.max(0, Math.round(Number(config?.creditsPerDownload) || 0));
}
