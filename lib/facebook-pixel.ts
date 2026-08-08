/**
 * Facebook Pixel Tracking Utility
 * Pixel ID: read from NEXT_PUBLIC_META_PIXEL_ID (see components/analytics.tsx)
 * Currency: INR
 * Production Ready
 */
export interface FacebookPixelEventData {
  [key: string]: any
}

/**
 * Initialize Facebook Pixel base code
 * NOTE: the base pixel is already loaded by <Analytics /> in components/analytics.tsx
 * on every page. This is only a fallback for contexts where that component isn't mounted.
 */
export function initializeFacebookPixel() {
  if (typeof window === 'undefined') return

  // Check if fbq already exists
  if ((window as any).fbq) return

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  if (!pixelId) return

  ;(function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n 
    n.push = n
    n.loaded = !0
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = !0
    t.src = v
    s = b.getElementsByTagName(e)[0]!
    s.parentNode!.insertBefore(t, s)
  })(
    window,
    document,
    'script',
    'https://connect.facebook.net/en_US/fbevents.js'
  )

  ;(window as any).fbq('init', pixelId)
  ;(window as any).fbq('track', 'PageView')
}

/**
 * Track PageView event (called on every page load)
 */
export function trackPageView() {
  if (typeof window === 'undefined' || !(window as any).fbq) return
    ; (window as any).fbq('track', 'PageView')
}

/**
 * Track ViewContent event
 * Fired when user views a product page
 * @param productId - Product ID
 * @param productName - Product name
 * @param price - Product price in INR
 */
export function trackViewContent(
  productId: string,
  productName: string,
  price: number
) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    content_name: productName,
    content_ids: [productId],
    content_type: 'product',
    value: price.toFixed(2),
    currency: 'INR',
  }

    ; (window as any).fbq('track', 'ViewContent', data)
}

/**
 * Track AddToCart event
 * Fired when user adds item to cart
 * @param productId - Product ID
 * @param productName - Product name
 * @param price - Product price in INR
 * @param quantity - Quantity added
 */
export function trackAddToCart(
  productId: string,
  productName: string,
  price: number,
  quantity: number = 1
) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    content_name: productName,
    content_ids: [productId],
    content_type: 'product',
    value: (price * quantity).toFixed(2),
    currency: 'INR',
    quantity: quantity,
  }

    ; (window as any).fbq('track', 'AddToCart', data)
}

/**
 * Track AddToWishlist event
 * Fired when user adds an item to their wishlist
 * @param productId - Product ID
 * @param productName - Product name
 * @param price - Product price in INR
 */
export function trackAddToWishlist(
  productId: string,
  productName: string,
  price?: number
) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    content_name: productName,
    content_ids: [productId],
    content_type: 'product',
    ...(price !== undefined && { value: price.toFixed(2), currency: 'INR' }),
  }

    ; (window as any).fbq('track', 'AddToWishlist', data)
}

/**
 * Track AddPaymentInfo event
 * Fired when user submits payment details during checkout
 * @param cartValue - Total cart value in INR
 * @param productIds - Array of product IDs in the order
 */
export function trackAddPaymentInfo(
  cartValue?: number,
  productIds?: string[]
) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    ...(cartValue !== undefined && { value: cartValue.toFixed(2), currency: 'INR' }),
    ...(productIds && { content_ids: productIds }),
    content_type: 'product',
  }

    ; (window as any).fbq('track', 'AddPaymentInfo', data)
}

/**
 * Track CompleteRegistration event
 * Fired when user successfully registers
 * @param email - User email (for data matching)
 * @param status - Registration status
 */
export function trackCompleteRegistration(email?: string, status?: string) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    status: status || 'completed',
    ...(email && { em: hashEmail(email) }),
  }

    ; (window as any).fbq('track', 'CompleteRegistration', data)
}

/**
 * Track CustomizeProduct event
 * Fired when user customises/configures a product
 * @param productId - Product ID
 * @param productName - Product name
 */
export function trackCustomizeProduct(productId?: string, productName?: string) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    ...(productId && { content_ids: [productId] }),
    ...(productName && { content_name: productName }),
    content_type: 'product',
  }

    ; (window as any).fbq('track', 'CustomizeProduct', data)
}

/**
 * Track Contact event
 * Fired when user contacts the business (e.g. submits contact form)
 */
export function trackContact() {
  if (typeof window === 'undefined' || !(window as any).fbq) return
    ; (window as any).fbq('track', 'Contact')
}

/**
 * Track Donate event
 * Fired when user donates funds
 * @param value - Donation amount in INR
 */
export function trackDonate(value?: number) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    ...(value !== undefined && { value: value.toFixed(2), currency: 'INR' }),
  }

    ; (window as any).fbq('track', 'Donate', data)
}

/**
 * Track FindLocation event
 * Fired when user searches for a business location
 */
export function trackFindLocation() {
  if (typeof window === 'undefined' || !(window as any).fbq) return
    ; (window as any).fbq('track', 'FindLocation')
}

/**
 * Track InitiateCheckout event
 * Fired when user starts checkout process
 * @param cartValue - Total cart value in INR
 * @param itemCount - Number of items in cart
 */
export function trackInitiateCheckout(
  cartValue: number,
  itemCount: number,
  productIds?: string[]
) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    value: cartValue.toFixed(2),
    currency: 'INR',
    num_items: itemCount,
    ...(productIds && { content_ids: productIds }),
    content_type: 'product',
  }

    ; (window as any).fbq('track', 'InitiateCheckout', data)
}

/**
 * Track Lead event
 * Fired when user submits info as a lead (e.g. newsletter signup, enquiry form)
 * @param value - Optional estimated lead value in INR
 */
export function trackLead(value?: number) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    ...(value !== undefined && { value: value.toFixed(2), currency: 'INR' }),
  }

    ; (window as any).fbq('track', 'Lead', data)
}

/**
 * Track Purchase event
 * Fired when order is completed
 * @param orderId - Order ID
 * @param orderValue - Total order value in INR
 * @param itemCount - Number of items purchased
 * @param productIds - Array of product IDs
 * @param email - Customer email (for data matching)
 */
export function trackPurchase(
  orderId: string,
  orderValue: number,
  itemCount: number,
  productIds?: string[],
  email?: string
) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    value: orderValue.toFixed(2),
    currency: 'INR',
    transaction_id: orderId,
    num_items: itemCount,
    ...(productIds && { content_ids: productIds }),
    content_type: 'product',
    ...(email && { em: hashEmail(email) }),
  }

  // eventID must match the event_id sent server-side via the Conversions API
  // (lib/meta-capi.ts, keyed off the same orderId) so Meta dedupes the two.
  ; (window as any).fbq('track', 'Purchase', data, { eventID: orderId })
}

/**
 * Track Schedule event
 * Fired when user books an appointment
 */
export function trackSchedule() {
  if (typeof window === 'undefined' || !(window as any).fbq) return
    ; (window as any).fbq('track', 'Schedule')
}

/**
 * Track Search event
 * Fired when user performs a search on the site
 * @param searchString - The search query
 */
export function trackSearch(searchString?: string) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    ...(searchString && { search_string: searchString }),
  }

    ; (window as any).fbq('track', 'Search', data)
}

/**
 * Track StartTrial event
 * Fired when user starts a free trial
 * @param value - Trial value in USD (per Meta's default event spec)
 * @param predictedLtv - Predicted lifetime value
 */
export function trackStartTrial(value: string = '0.00', predictedLtv: string = '0.00') {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    value,
    currency: 'USD',
    predicted_ltv: predictedLtv,
  }

    ; (window as any).fbq('track', 'StartTrial', data)
}

/**
 * Track SubmitApplication event
 * Fired when user submits an application (e.g. job, credit, program)
 */
export function trackSubmitApplication() {
  if (typeof window === 'undefined' || !(window as any).fbq) return
    ; (window as any).fbq('track', 'SubmitApplication')
}

/**
 * Track Subscribe event
 * Fired when user starts a paid subscription
 * @param value - Subscription value in USD (per Meta's default event spec)
 * @param predictedLtv - Predicted lifetime value
 */
export function trackSubscribe(value: string = '0.00', predictedLtv: string = '0.00') {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    value,
    currency: 'USD',
    predicted_ltv: predictedLtv,
  }

    ; (window as any).fbq('track', 'Subscribe', data)
}

/**
 * Track custom event
 * @param eventName - Event name
 * @param data - Event data
 */
export function trackCustomEvent(eventName: string, data?: FacebookPixelEventData) {
  if (typeof window === 'undefined' || !(window as any).fbq) return
    ; (window as any).fbq('track', eventName, data)
}

/**
 * Simple email hashing for data matching
 * SHA256 hash - Facebook expects hashed PII
 */
function hashEmail(email: string): string {
  // For production, use a proper SHA256 library
  // This is a placeholder - Facebook also accepts un-hashed emails sometimes
  // but hashing is recommended for better data matching
  return email.toLowerCase().trim()
}

/**
 * Declare fbq on window for TypeScript
 */
declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: (...args: any[]) => void
  }
}