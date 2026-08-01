"use client"
// app/orders-returns/marketplace-policy-accordion.tsx
//
// Collapsible "Part 2" of the Orders & Returns Policy — the Marketplace
// Seller Policy (Amazon.in, Flipkart, Meesho, and other platforms).
// Kept collapsed by default since it's aimed at marketplace buyers/sellers,
// not the typical website customer.

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const marketplaceSections = [
  {
    title: "1. Nature of Our Products and Why Returns Are Restricted",
    content: `Nezal Herbocare manufactures and sells premium skincare, hair care, bath, body care, and personal hygiene products, including soaps, face serums, shampoos, conditioners, body lotions, bath salts, massage oils, shower gels, hand washes, and intimate hygiene formulations.\n\nPersonal care and cosmetic products are in direct contact with the human body — skin, hair, and mucous membranes. Once opened, the hygiene integrity of the product cannot be verified or guaranteed if returned. Indian and international regulatory standards (including the Drugs and Cosmetics Act and relevant BIS guidelines) classify such products as hygiene-sensitive.\n\nImportant: Opened, used, or partially consumed personal care products cannot be returned or exchanged under any circumstances — regardless of the Marketplace's general return policy — except where the product is proven to be defective, damaged, or materially mis-described. This restriction exists to protect all customers from products that may have been contaminated, tampered with, or adulterated after the seal was broken.`,
  },
  {
    title: "2. Platform-Specific Return Windows — Personal Care Category",
    content: `Return policies differ by Marketplace and product sub-category. Platform policies are subject to change at any time — always check the product page for the current policy.\n\nAmazon.in: Standard return window for Beauty, Health & Personal Care is 10 days from delivery, but only for products that are physically damaged, missing parts, defective, or different from description. Opened/used personal care products are not eligible for return. Nezal must respond to return requests within 3 business days or risk an A-to-Z Guarantee Claim.\n\nFlipkart: Personal care items (shampoos, lotions, soaps, face wash, etc.) are classified as non-returnable, but a Refund-Only claim is allowed for defective, damaged, incorrect, or unusable products without needing to return the item, reported within the window shown on the product page (typically 2–7 days).\n\nMeesho: Nezal's personal care listings use the Wrong/Defective Return Option only — returns permitted solely for defective, damaged, wrong, or incomplete products due to seller fault. The All-Return option (allowing change-of-mind returns) is not activated for personal care items.\n\nOther Marketplaces (Myntra, JioMart, Nykaa, Snapdeal, etc.): Nezal's default position across all platforms is that personal care and hygiene products are non-returnable for change of mind; returns are accepted only for defective, damaged, wrong, or missing products, raised through the relevant platform within its stated return window.`,
  },
  {
    title: "3. When Nezal Will Accept a Return or Refund — All Platforms",
    content: `Regardless of the Marketplace, Nezal will accept a return or issue a refund in the following circumstances, with the same evidence standards applying across all platforms:\n\n• Defective Product — a manufacturing defect, contamination, or abnormal texture/colour/odour. Report within 48 hours of delivery with photo/video evidence.\n• Physically Damaged on Delivery — broken packaging, cracked bottles, crushed bars, or leaking containers due to transit damage. Report within 24 hours with photographs of outer packaging and product.\n• Wrong Product Delivered — a different variant, fragrance, product name, or SKU than ordered. Report within 48 hours with a photo of the product alongside the order confirmation.\n• Missing Item — an item ordered and paid for but not included in delivery. Report within 24 hours.\n• Significantly Not As Described — material differences such as incorrect weight/volume, missing ingredients, or wrong product category. Minor batch-to-batch variations in fragrance, colour, or texture are within acceptable manufacturing tolerances and are not grounds for return.\n\nNezal reserves the right to request photographic or video evidence, including an unboxing video where applicable, before accepting any return or approving any refund. Evidence must be clear, unedited, and submitted within the timeframes above.`,
  },
  {
    title: "4. What Nezal Cannot Accept as a Return",
    content: `The following do not qualify for a return or refund, regardless of platform:\n\n• Products that have been opened, used, or partially consumed — this applies to all personal care products without exception\n• Products returned without original packaging, seals, labels, or batch codes intact\n• Change of mind, personal preference, or 'buyer's remorse' returns\n• Products where fragrance, colour, or texture varies from a previous batch (normal batch-to-batch variation in herbal formulations)\n• Products purchased under promotional prices, clearance sales, or platform-specific special offers, unless defective\n• Reports of allergic reactions or skin sensitivity — these are not manufacturing defects. Customers should conduct a patch test before full application\n• Products damaged due to improper storage, exposure to extreme heat/cold, or misuse after delivery\n• Returns reported beyond the platform's stipulated return window, or initiated without following the Marketplace's prescribed return process\n\nImportant: Nezal is not liable for individual skin reactions. Customers with known allergies, sensitive skin, or medical skin conditions should consult a dermatologist before use and conduct a patch test 24 hours before full application. The full ingredient list is displayed on every product page and physical label.`,
  },
  {
    title: "5. Evidence Requirements for Return Claims",
    content: `For Damaged/Defective Products: (1) a clear photograph of the outer delivery packaging before opening; (2) a clear photograph showing the damage or defect; (3) a photograph of the product label showing batch number and MRP; (4) the order ID/invoice number.\n\nFor Wrong Product Claims: (1) a photograph of the product received alongside the order confirmation or invoice; (2) a photograph of the product label; (3) the order ID.\n\nFor Missing Item Claims: (1) a photograph or video showing all items received; (2) the order invoice showing the missing item.\n\nUnboxing Video: Amazon, Meesho, and certain other platforms may require an unboxing video for high-value claims. Nezal strongly recommends recording an unboxing video for every order, unedited and continuous from first opening, as this provides the clearest evidence in any dispute.\n\nFailure to provide required evidence within the platform's stipulated timeframe may result in automatic closure of the claim by the Marketplace. Nezal is unable to process claims without adequate evidence.`,
  },
  {
    title: "6. Refund Process and Timelines",
    content: `6.1 How Refunds Are Processed: All refunds for Marketplace purchases are processed by the Marketplace, not directly by Nezal, credited to the original payment method as per that Marketplace's own refund policy — Amazon.in typically within 3–5 business days, Flipkart within 5–7 business days, and Meesho within 3–7 business days (to original payment method, or Meesho Wallet for COD orders).\n\n6.2 Nezal's Role in the Refund: For seller-fulfilled orders, Nezal must approve or dispute the return/refund within the timeframe set by the Marketplace (typically 2–3 business days). Valid claims are approved promptly; claims that appear fraudulent, incomplete, or outside policy are disputed through the Marketplace's seller tools.\n\n6.3 No Direct Refunds: Nezal does not process refunds directly for Marketplace purchases. Do not approach Nezal directly for a refund on a Marketplace purchase — the claim must be raised through the Marketplace platform first.`,
  },
  {
    title: "7. Nezal's Rights as a Seller — Protecting Against Fraudulent Claims",
    content: `All return claims are reviewed and verified before approval, assessed for consistency, authenticity, and compliance with the claim reason. Nezal will dispute return claims where the product received back differs from what was shipped, shows signs of use or tampering, has inconsistent packaging or batch numbers, or where the claim reason doesn't match the evidence provided.\n\nNezal records product batch details, packaging photographs, and dispatch records for all orders to verify return claims and dispute incorrect ones. Customers found engaging in repeated fraudulent return activity will be reported to the respective Marketplace's seller abuse team. Where applicable, Nezal may invoke the SAFE-T Claim process on Amazon for damaged or fraudulent returns. All disputes are pursued through the relevant Marketplace's seller dispute process; if unresolved, Nezal reserves the right to escalate through legal channels under the Consumer Protection Act, 2019 and the Indian Penal Code where fraud is involved.`,
  },
  {
    title: "8. Order Cancellations on Marketplaces",
    content: `8.1 Customer-Initiated Cancellations: Amazon.in orders can be cancelled before shipment via 'Your Orders'; Flipkart orders before dispatch (refusal at doorstep possible once out for delivery); Meesho orders before dispatch (refusal after dispatch results in RTO).\n\n8.2 Seller-Initiated Cancellations: Nezal may cancel an order due to stock unavailability, unserviceable delivery address, suspected fraud or abnormally large quantities, or a pricing error on the listing. In all such cases, Nezal initiates a full refund through the Marketplace within the platform's prescribed timeline.`,
  },
  {
    title: "9. Nezal's Quality Commitment on Marketplaces",
    content: `Every Nezal Herbocare product sold on any Marketplace is: (a) manufactured in technical collaboration with Highbrow Healthcare at our facility in Navsari, Gujarat, to exacting quality and hygiene standards; (b) compliant with applicable provisions of the Drugs and Cosmetics Act, 1940 and BIS standards; (c) labelled in compliance with the Legal Metrology (Packaged Commodities) Rules, 2011, displaying MRP, net quantity, batch number, manufacturing date, best-before date, manufacturer details, and ingredient list; (d) verified for quality before dispatch.\n\nIf you suspect a product from a Marketplace listing bearing the Nezal Herbocare brand may be counterfeit or from an unauthorised seller: (1) check the seller name is authorised by Nezal; (2) check the batch number and MRP against the listing; (3) report suspected counterfeit products immediately to both the Marketplace and Nezal at info@nezalherbocare.com. Nezal pursues all available legal remedies under the Trade Marks Act, 1999 against counterfeiting.`,
  },
  {
    title: "10. Consumer Rights and Grievance Redressal",
    content: `Nothing in this Policy limits your statutory rights as a consumer under the Consumer Protection Act, 2019, the Consumer Protection (E-Commerce) Rules, 2020, the Legal Metrology (Packaged Commodities) Rules, 2011, or other applicable Indian consumer protection legislation.\n\nIf you are not satisfied with the resolution provided by the Marketplace or by Nezal, you may: file a complaint with the National Consumer Helpline (www.consumerhelpline.gov.in or 1800-11-4000); approach the appropriate Consumer Disputes Redressal Commission; or file a complaint on the government's E-Daakhil portal (https://edaakhil.nic.in).\n\nNezal's Grievance Officer for Marketplace-related complaints: Email info@nezalherbocare.com, Address: Nezal Herbocare Pvt.Ltd, S-28, Whispering Palms, Lokhandwala Complex, Akurli Road, Kandivali East, Mumbai – 400 101, Maharashtra, India. All complaints are acknowledged within 48 hours and resolved within 30 (thirty) days of receipt.`,
  },
  {
    title: "11. Governing Law and Jurisdiction",
    content: `This Marketplace Orders & Returns Policy shall be governed by and construed in accordance with the laws of India.\n\nPrior to initiating arbitration proceedings, the parties agree to attempt to resolve any dispute through good-faith negotiation for a period of 30 (thirty) days from the date of written notice of the dispute.\n\nIf the mediation attempt fails, any dispute arising out of or in connection with the performance, interpretation, and validity of this Policy — or any order or return related to Nezal's products sold on a Marketplace — shall, to the extent not resolved through the Marketplace's own dispute resolution process or consumer forums, be resolved finally through arbitration under the Arbitration and Conciliation Act, 1996, with the seat of arbitration in Mumbai, Maharashtra, conducted in English by a sole arbitrator appointed mutually by the parties, or otherwise be subject to the exclusive jurisdiction of the competent courts in Mumbai, Maharashtra, India.`,
  },
]

const quickReference = [
  {
    scenario: "Received a damaged product",
    guidance: "Photograph packaging and product before unpacking. Raise a return/refund request on the Marketplace app within 24 hours, selecting 'Damaged' as the reason, with photographs attached.",
  },
  {
    scenario: "Received the wrong product",
    guidance: "Photograph the product received alongside your order confirmation. Raise a return request on the Marketplace within 48 hours, selecting 'Wrong Item' as the reason.",
  },
  {
    scenario: "Product appears defective (abnormal smell, texture, or colour)",
    guidance: "Do not use the product. Photograph the product and label. Raise a defective item complaint on the Marketplace within 48 hours without opening the seal further.",
  },
  {
    scenario: "Item missing from your order",
    guidance: "Photograph all items received and check the invoice to confirm the missing item. Raise a missing item complaint on the Marketplace within 24 hours.",
  },
  {
    scenario: "Want to return because you changed your mind",
    guidance: "Nezal's personal care products are non-returnable for change of mind on all platforms. Please review ingredient lists and skin type suitability carefully before ordering.",
  },
  {
    scenario: "Experienced a skin reaction",
    guidance: "Discontinue use immediately. A 24-hour patch test is recommended before using any new personal care product. Skin reactions are not manufacturing defects and do not qualify for a return — consult a dermatologist if the reaction is severe.",
  },
  {
    scenario: "Believe you received a counterfeit Nezal product",
    guidance: "Report immediately to the Marketplace and to Nezal at info@nezalherbocare.com, with photographs of the product, packaging, and label.",
  },
  {
    scenario: "Marketplace returned a product to you as undelivered (RTO)",
    guidance: "Contact us at info@nezalherbocare.com with your order ID. We will assess whether re-dispatch or a refund is appropriate.",
  },
]

export function MarketplacePolicyAccordion() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 text-left bg-[#f9f6f1] border border-border rounded-xl px-5 py-4 hover:bg-[#f3efe6] transition-colors"
        aria-expanded={open}
      >
        <div>
          <p className="font-semibold text-foreground">
            Part 2 — Marketplace Seller Policy
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Applicable to listings on Amazon.in, Flipkart, Meesho, and other third-party marketplaces
          </p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-6 space-y-10 pl-1">
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            This section sets out how Nezal Herbocare ("Nezal", "we", "us", "our") handles orders, returns, refunds, and related matters when our products are sold through third-party e-commerce marketplaces. Customers purchasing from Nezal on any Marketplace should raise all return/refund requests directly through that Marketplace's platform — this section explains Nezal's position as a seller and does not replace the Marketplace's own buyer-facing return process. Where a Marketplace's policy is more favourable to the customer, the Marketplace's policy shall prevail.
          </p>

          {marketplaceSections.map((section, i) => (
            <div key={i}>
              <h3 className="text-lg font-semibold text-foreground mb-3">{section.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Quick Reference Guide — What to Do If Something Goes Wrong
            </h3>
            <div className="space-y-4">
              {quickReference.map((item, i) => (
                <div key={i} className="border-l-2 border-border pl-4">
                  <p className="font-medium text-foreground text-[15px]">{item.scenario}</p>
                  <p className="text-muted-foreground text-[14px] leading-relaxed mt-1">{item.guidance}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}