// app/orders-returns/page.tsx
import Link from "next/link"
import { MarketplacePolicyAccordion } from "./marketplace-policy-accordion"

export const metadata = {
  title: "Orders & Returns | Nezal Herbocare",
  description: "Orders and Returns Policy for Nezal Herbocare",
}

export default function OrdersReturnsPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-[#f9f6f1] border-b border-border py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <span>Orders & Returns</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Orders & Returns Policy</h1>
          <p className="text-sm text-muted-foreground mt-3">
            Part 1 — Everything you need to know about placing orders, tracking, and returning products purchased on our website. Last updated: 1 July 2026.
          </p>
        </div>
      </div>

      {/* Part 1 — Website Orders & Returns */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="space-y-10">

          <div>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              This Policy governs all orders placed on www.nezalherbocare.com with Nezal Herbocare. By placing an order, you agree to the terms set out below. This Policy is intended to be read alongside our Refund Policy, Shipping Policy, and Terms of Service.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Placing an Order</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`To place an order on our website:\n\n1. Browse our product catalogue and add items to your cart\n2. Review your cart and proceed to checkout\n3. Provide your delivery address, contact details, and payment information\n4. Review and confirm your order\n5. Complete payment through our secure payment gateway\n\nBy submitting your order, you make an offer to purchase the selected products at the displayed price. Your order is accepted by us only when we send you a written order confirmation via email. We reserve the right to reject any order at our discretion, including due to stock unavailability, pricing errors, or fraud suspicion.\n\nPlease ensure that all information provided at checkout — including your name, delivery address, phone number, and email — is accurate and complete. We are not responsible for non-delivery or delays caused by incorrect information provided by you.`}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Order Confirmation and Invoice</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              Upon successful placement of your order, you will receive: (a) an automated order confirmation email with your order number and summary; and (b) an invoice for the amount paid, shared via email or included with your shipment. Please retain your order confirmation and invoice, as you will need these for any return, refund, or warranty claims.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Order Cancellation</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`3.1 Cancellation by Customer: You may request cancellation of your order within 2 (two) hours of placing it, provided the order has not yet been dispatched. To cancel, email us immediately at info@nezalherbocare.com with your order number. Once an order is dispatched, it cannot be cancelled — you will need to follow the return process after delivery.\n\n3.2 Cancellation by Nezal: We reserve the right to cancel any order at our discretion, including due to: (a) product unavailability or stock shortage; (b) a pricing error on our website; (c) inability to verify payment; (d) suspicion of fraudulent activity or abuse. In such cases, a full refund will be initiated to your original payment method within 5–7 (five to seven) business days.`}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Order Fulfilment and Packaging</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              All Nezal products are carefully packaged to ensure they arrive in perfect condition. We use tamper-evident seals and protective packaging appropriate to the product type. Please inspect your order immediately upon delivery. We process orders on business days (Monday to Saturday, excluding public holidays). Orders placed on Sundays or public holidays will be processed on the next business day.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Returns — Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`We accept returns only in the following circumstances:\n\n• The product received is defective or damaged (manufacturing defect, broken seal, or physical damage)\n• The wrong product was delivered (different SKU, variant, or product from your order)\n• A product is missing from your order\n• The product is materially not as described on our website\n\nReturns must be requested within 3 (three) days of delivery. We are unable to accept returns of products that have been used, opened, or had their seals broken, for hygiene and safety reasons.`}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Returns — Process</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`To initiate a return:\n\n1. Email info@nezalherbocare.com with subject 'Return Request – Order #[Order Number]' within 3 days of delivery\n2. Include photographs/video clearly showing the defect, damage, or incorrect product, along with the order number and invoice\n3. Our team will review your request and respond within 2 (two) business days\n4. If approved, we will provide return instructions including the return address and, where applicable, a prepaid return shipping label\n5. Pack the product securely in its original packaging with all contents and labels intact\n6. Ship the product as instructed and share the tracking number with us\n\nProducts sent back to us without prior written authorisation will not be accepted and will be returned to the sender at their cost.`}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Returns — What We Cannot Accept</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`• Used, opened, or unsealed personal care products (for hygiene and safety)\n• Products not in their original packaging or missing labels/seals\n• Products returned more than 3 days after delivery without our written approval\n• Products damaged due to misuse, improper storage, or customer handling\n• Products purchased under sale or promotional offers (unless defective)\n• Gift cards or promotional items`}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Damaged or Missing Items</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`Please inspect your order thoroughly upon delivery. If your package arrives damaged or any item is missing:\n\n• Photograph the outer packaging and all items before and during unpacking. Photographs must be clear and unedited — AI-generated images will not be accepted, and we reserve the right to pursue legal action against fraudulent claims\n• Contact us within 24 (twenty-four) hours of delivery with photographs and your order number\n• For transit damage, note the damage on the courier's proof of delivery if possible\n\nClaims for damaged or missing items reported after 24 hours of delivery may not be eligible for resolution.`}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Refunds for Accepted Returns</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              Once we receive and inspect the returned product, we will notify you of the outcome within 5 (five) business days. If the return is approved, a refund will be credited to your original payment method within 7–10 (seven to ten) business days. Please see our Refund Policy for full details.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Consumer Rights</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              Nothing in this Policy limits or overrides your rights as a consumer under the Consumer Protection Act, 2019, the Consumer Protection (E-Commerce) Rules, 2020, or any other applicable Indian law. If you are not satisfied with our resolution, you may approach the appropriate Consumer Forum in accordance with the Consumer Protection Act, 2019.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`Email: info@nezalherbocare.com\nAddress: Nezal Herbocare Pvt.Ltd, S-28, Whispering Palms, Lokhandwala Complex, Akurli Road, Kandivali East, Mumbai – 400 101, Maharashtra, India\n\nAll disputes arising out of this Policy shall be subject to the exclusive jurisdiction of the courts at Mumbai, Maharashtra, India.`}
            </p>
          </div>

        </div>

        {/* Part 2 — collapsible Marketplace Seller Policy */}
        <div className="mt-16 pt-10 border-t border-border">
          <MarketplacePolicyAccordion />
        </div>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Questions? Email us at{" "}
            <a href="mailto:info@nezalherbocare.com" className="underline hover:text-foreground transition-colors">
              info@nezalherbocare.com
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}