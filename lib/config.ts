// lib/config.ts
export const BRAND = {
  name: 'Nezal',
  // Shown in email footers (lib/email-templates.ts). The address is the one
  // published on the Terms of Service / Shipping Policy pages.
  legalName: 'Nezal Herbocare Private Limited',
  registeredAddress:
    'S-28, Whispering Palms, Lokhandwala Complex, Akurli Road, Kandivali East, Mumbai 400101, Maharashtra, India',
  domain: 'https://nezalherbocare.com',
  supportEmail: 'info@nezalherbocare.com',
  phone: '+917710076400',
  whatsapp: {
    primary: '7710076400',
  },
  social: {
    instagram: 'https://instagram.com/nezalherbocare',
    facebook: 'https://www.facebook.com/nezalherbocare',
  },
  // Add any other brand constants you need
} as const;

// Cart-wide cap before routing the user to a bulk-order phone call
// instead of letting them keep adding items. Used in cart page, product
// card "Add to Cart", and referenced in the ritual page's dialog copy.
export const BULK_ORDER_LIMIT = 12;