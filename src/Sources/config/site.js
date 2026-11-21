// Site switches — change here, nothing else.
//
// CART_ENABLED = false → the site is a portfolio ("Our Works"): no cart, no checkout.
//   Each piece gets an "Order one like this" button that opens WhatsApp with the piece's details,
//   and a link to the Studio. Set it back to true to bring the shop + cart back.
export const CART_ENABLED = false;

// Portfolio mode hides shop-only details: prices, SKU, sale badges, size, gender/age/length
export const SHOW_SHOP_DETAILS = CART_ENABLED;

export const WORKS_PATH = '/our-works';
export const WORKS_LABEL = CART_ENABLED ? 'Shop' : 'Our Works';
export const WHATSAPP = '96176118290'; // international format, no +

export const whatsappLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

/** WhatsApp message for "I want one like this piece" */
export function orderLikeThisLink(item, variant, lang = 'en') {
  const ar = lang === 'ar';
  const lines = [
    ar ? 'مرحبا 3DSTL! بدّي إطلب شي متل هالقطعة:' : `Hi 3DSTL! I'd like to order something like this piece:`,
    `• ${item?.name || ''}`,
  ];
  if (SHOW_SHOP_DETAILS && variant?.color && variant.color !== 'simple') lines.push(`• ${ar ? 'اللون' : 'Color'}: ${variant.color}`);
  lines.push('', ar ? 'التعديلات يلي بدّي ياها (اسم، قياس، ألوان…):' : 'Changes I want (name, size, colors…):', '', `${window.location.origin}/item/${item?.id ?? ''}`);
  return whatsappLink(lines.join('\n'));
}
