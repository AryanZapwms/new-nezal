// app/refund-policy/page.tsx
import Link from "next/link"

export const metadata = {
  title: "Refund Policy | Nezal Herbocare",
  description: "Refund and Return Policy for Nezal Herbocare",
}

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-[#f9f6f1] border-b border-border py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <span>Refund Policy</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Refund Policy</h1>
          <p className="text-sm text-muted-foreground mt-3">Last updated: 1 July 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="space-y-10">

          <div>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              At Nezal Herbocare, every product is manufactured to exacting quality standards. We stand behind the quality of our formulations. This Refund Policy sets out the terms under which refunds may be requested and processed. It is intended to be fair to you as a customer while protecting the integrity and safety of our products.
            </p>
            <p className="text-muted-foreground leading-relaxed text-[15px] mt-3">
              This Policy is in compliance with the Consumer Protection Act, 2019, the Consumer Protection (E-Commerce) Rules, 2020, and applicable provisions of the Sale of Goods Act, 1930. Nothing in this Policy is intended to limit your statutory rights as a consumer.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Refund Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`You are eligible to request a refund in the following circumstances only:\n\n• You received a product that is defective or damaged at the time of delivery\n• You received the wrong product (different from what you ordered)\n• The product is significantly not as described on our website\n• The product is missing from your order (partial delivery)\n\nRefund requests must be raised within 3 (three) days of receiving your order. Requests raised after this period will not be eligible for a refund except in cases of latent defects or as required under applicable law.`}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Conditions for Refund</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`To be eligible for a refund, the following conditions must be met:\n\n• The product must be unused, unopened (excluding the outer cardboard box), and in its original condition\n• The product must be in its original packaging with all labels, seals, and tags intact\n• The original invoice or proof of purchase must be provided\n• A clear photograph or video of the defective, damaged, or incorrect product must be submitted at the time of raising the request\n\nWe reserve the right to reject a refund request if the product shows signs of use, tampering, or damage caused after delivery.`}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Non-Refundable Items and Situations</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`The following are not eligible for a refund:\n\n• Products that have been opened, used, or partially consumed — for hygiene and safety reasons\n• Products purchased under a sale, discount, promotional offer, or with a coupon code, unless defective\n• Gift cards, digital vouchers, or bundled promotional items\n• Products returned without prior written authorisation from us\n• Refund requests raised after 3 (three) days of delivery, except where required by law\n• Products where the customer simply changes their mind ('buyer's remorse'), subject to applicable consumer law\n• Products that have been damaged due to improper storage or use by the customer`}
            </p>
            <p className="text-muted-foreground leading-relaxed text-[14px] mt-3 italic">
              Note: As personal care and skincare products are applied to the body, we are unable to accept returns of opened or used products for hygiene and safety reasons. We encourage you to review product descriptions, ingredient lists, and skin type recommendations carefully before purchase.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. How to Request a Refund</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`To initiate a refund request, please follow these steps:\n\n1. Email us at info@nezalherbocare.com within 3 days of receiving your order\n2. Use the subject line: 'Refund Request – Order #[Your Order Number]'\n3. Include the following in your email: (a) your order number and date; (b) the product(s) for which you are requesting a refund; (c) the reason for the refund request; (d) clear photographs or video of the product, packaging, and the defect or issue\n4. Our customer support team will acknowledge your request within 2 (two) business days and communicate the next steps\n\nDo not return any product without receiving written authorisation from us. Unauthorised returns will not be accepted and will be returned at your cost.`}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Refund Processing</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`Once your refund request is received and verified:\n\n• We will inspect the returned product (where applicable) and notify you of our decision within 5 (five) business days of receiving the returned item\n• If the refund is approved, it will be credited to your original payment method within 7–10 (seven to ten) business days, subject to processing timelines of your bank or payment provider\n• If the refund is rejected, we will communicate the reasons in writing\n\nWe are not responsible for delays caused by your bank or payment provider in processing the refund. The timeline of 7–10 business days is estimated from the date of our refund initiation.`}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Exchanges</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              We do not offer direct product exchanges. If you wish to exchange a product, please: (a) raise a refund request under Section 4 above; (b) once the refund is approved and processed, place a fresh order for the replacement product on our website. This process ensures inventory accuracy and order tracking. We regret any inconvenience this may cause.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Shipping Costs for Returns</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              Where a return is required: (a) if the return is due to a defect, damage, or incorrect product on our part, we will bear the return shipping cost; (b) if the return is for any other eligible reason, the cost of return shipping shall be borne by the customer. We will provide a return shipping label only in cases where the return is due to our error.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Damaged in Transit</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`Please inspect your order immediately upon delivery. If your order arrives visibly damaged — even if the outer packaging appears intact — please: (a) take clear photographs of the outer packaging and the product before opening; (b) note any damage on the courier's delivery receipt/POD; (c) contact us within 24 (twenty-four) hours of delivery with photographs. Failure to report transit damage within 24 hours may affect your eligibility for a refund.`}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Consumer Grievance Redressal</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              If your refund request is not resolved to your satisfaction, you have the right under the Consumer Protection Act, 2019 to approach the appropriate Consumer Forum or the National Consumer Disputes Redressal Commission (NCDRC). We are committed to resolving all genuine customer complaints fairly and promptly.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Governing Law and Jurisdiction</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`This Refund Policy shall be governed by and construed in accordance with the laws of India.\n\nPrior to initiating arbitration proceedings, the parties agree to attempt to resolve any dispute through good-faith negotiation for a period of 30 (thirty) days from the date of written notice of the dispute.\n\nIf the mediation attempt fails, any dispute arising out of or in connection with the performance, interpretation, and validity of this Policy shall be resolved finally through arbitration in accordance with the Arbitration and Conciliation Act, 1996 (as amended from time to time). The seat of arbitration shall be Mumbai, Maharashtra, and the arbitration shall be conducted in the English language by a sole arbitrator appointed mutually by the parties. If the parties fail to appoint an arbitrator within thirty (30) days of initiating the dispute, the arbitrator shall be appointed in accordance with the Arbitration and Conciliation Act, 1996.`}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact for Refund Queries</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
              {`Email: info@nezalherbocare.com\nAddress: Nezal Herbocare Pvt.Ltd, S-28, Whispering Palms, Lokhandwala Complex, Akurli Road, Kandivali East, Mumbai – 400 101, Maharashtra, India\n\nAll disputes arising from this Refund Policy shall be subject to the exclusive jurisdiction of the courts at Mumbai, Maharashtra, India.`}
            </p>
          </div>

        </div>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Questions about returns? Email us at{" "}
            <a href="mailto:info@nezalherbocare.com" className="underline hover:text-foreground transition-colors">
              info@nezalherbocare.com
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}