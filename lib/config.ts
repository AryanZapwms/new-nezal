// lib/config.ts
export const BRAND = {
  name: 'Nezal',
  domain: 'https://nezalherbocare.com',
  supportEmail: 'info@nezalherbocare.com',
  phone: '+917710076400',
  whatsapp: {
    primary: '7710076400',
  },
  social: {
    instagram: 'https://instagram.com/nezal',
    facebook: 'https://facebook.com/nezal',
  },
  // Add any other brand constants you need
} as const;

// Cart-wide cap before routing the user to a bulk-order phone call
// instead of letting them keep adding items. Used in cart page, product
// card "Add to Cart", and referenced in the ritual page's dialog copy.
export const BULK_ORDER_LIMIT = 12;