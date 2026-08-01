// app/shipping-policy/page.tsx
import Link from "next/link"

export const metadata = {
  title: "Shipping Policy | Nezal Herbocare",
  description: "Shipping Policy for Nezal Herbocare",
}

const sections = [
  {
    title: "1. Order Processing Time",
    content: `All orders are processed within 1–2 (one to two) business days of payment confirmation, subject to stock availability. Business days are Monday to Saturday, excluding public holidays. Orders placed on Sundays or public holidays will be processed on the following business day.\n\nYou will receive an email/SMS/WhatsApp confirmation with a tracking number once your order has been dispatched. Please allow up to 24 hours for the tracking link to become active.`,
  },
  {
    title: "2. Shipping Destinations",
    content: `2.1 Domestic Shipping (India): We currently ship to all PIN codes within India that are serviceable by our logistics partners. Serviceability is subject to change. If your PIN code is not serviceable at checkout, please contact us at info@nezalherbocare.com and we will endeavour to find a suitable delivery arrangement.\n\n2.2 International Shipping: At present, we do not offer international shipping. We hope to extend our services to international customers in the future.`,
  },
  {
    title: "3. Shipping Charges",
    content: `Shipping charges, if applicable, are calculated at checkout based on the order value, delivery location, and weight of the package. The applicable shipping charge will be displayed clearly before you confirm your order.\n\n• Free shipping may be offered on orders above a specified order value, as displayed on our website at the time of checkout\n• Shipping charges are non-refundable, except in cases where the return is due to our error (defective, damaged, or wrong product)\n• We reserve the right to modify our shipping charges and free shipping thresholds at any time without prior notice`,
  },
  {
    title: "4. Estimated Delivery Timelines",
    content: `Delivery timelines are estimates and are not guaranteed. Actual delivery may vary depending on your location, the logistics partner, and external factors beyond our control.\n\n• Metro cities (Mumbai, Delhi NCR, Bengaluru, Hyderabad, Chennai, Pune, Kolkata): 2–4 business days\n• Tier 2 and Tier 3 cities: 4–6 business days\n• Remote or rural areas: 6–10 business days\n\nAll timelines are from the date of dispatch (not the date of order placement). We are not responsible for delays caused by logistics partners, weather conditions, natural calamities, civil unrest, government restrictions, or other circumstances beyond our reasonable control.`,
  },
  {
    title: "5. Logistics Partners",
    content: `We partner with third-party courier and logistics service providers to deliver your orders. The logistics partner assigned to your order may vary based on your delivery location and availability. We will use reasonable endeavours to ensure timely and safe delivery, but we are not liable for delays, losses, or damages caused by our logistics partners once the shipment has been handed over to them.\n\nYou will be provided with a tracking number to monitor your shipment. In the event of a delivery failure, the logistics partner will attempt re-delivery as per their standard procedures, or the package may be held at a local facility for collection.`,
  },
  {
    title: "6. Tracking Your Order",
    content: `Once your order is dispatched, you will receive a shipping confirmation by email/WhatsApp/SMS containing your tracking number and a link to track your shipment in real time. You may also track your order by contacting us at info@nezalherbocare.com.`,
  },
  {
    title: "7. Failed Delivery Attempts",
    content: `If the logistics partner is unable to deliver your order after reasonable attempts (typically 2–3 attempts), the package may be returned to us. In such cases:\n\n• We will contact you at the phone number or email provided at checkout\n• If the delivery failure was due to an incorrect or incomplete address provided by you, re-shipping charges may apply\n• If the delivery failure was not due to your error, we will re-ship the order at no additional cost or provide a full refund at your request\n• If the package is returned to us and you request a refund instead of re-delivery, the original shipping charges (if any) will not be refunded`,
  },
  {
    title: "8. Delivery Inspection",
    content: `Please inspect your package at the time of delivery before signing the proof of delivery (POD). If the outer packaging appears visibly damaged, tampered with, or if the seal is broken:\n\n• Note the damage on the delivery receipt before accepting\n• Take photographs of the package before and during opening\n• Contact us within 24 (twenty-four) hours at info@nezalherbocare.com with photographs and your order number\n\nAccepting a damaged package without noting the damage on the POD may affect your ability to raise a damage claim.`,
  },
  {
    title: "9. Lost or Stolen Shipments",
    content: `In the rare event that your shipment is lost in transit, please contact us at info@nezalherbocare.com with your order number. We will raise a complaint with the logistics partner and investigate the matter. If the shipment is confirmed lost, we will offer a replacement order or a full refund at your choice. We are not responsible for packages stolen from your premises after successful delivery (as confirmed by the logistics partner's records).`,
  },
  {
    title: "10. Force Majeure",
    content: `We shall not be held liable for any delay in shipping or delivery caused by circumstances beyond our reasonable control, including but not limited to natural disasters, epidemics or pandemics, government orders or restrictions, strikes, lockdowns, civil unrest, extreme weather conditions, or failure of third-party logistics providers. We will endeavour to keep you informed of any such delays and will work to deliver your order as soon as reasonably possible.`,
  },
  {
    title: "11. Governing Law and Jurisdiction",
    content: `This Shipping Policy shall be governed by and construed in accordance with the laws of India.\n\nPrior to initiating arbitration proceedings, the parties agree to attempt to resolve any dispute through good-faith negotiation for a period of 30 (thirty) days from the date of written notice of the dispute.\n\nIf the mediation attempt fails, any dispute arising out of or in connection with the performance, interpretation, and validity of this Policy shall be resolved finally through arbitration in accordance with the Arbitration and Conciliation Act, 1996 (as amended from time to time). The seat of arbitration shall be Mumbai, Maharashtra, conducted in the English language by a sole arbitrator appointed mutually by the parties. If the parties fail to appoint an arbitrator within thirty (30) days of initiating the dispute, the arbitrator shall be appointed in accordance with the Arbitration and Conciliation Act, 1996.`,
  },
  {
    title: "12. COD (Cash on Delivery) Orders",
    content: `Where Cash on Delivery (COD) is available as a payment option, it will be displayed at checkout. COD may not be available for all locations or order values. For COD orders, payment must be made in full at the time of delivery. We reserve the right to withdraw the COD option for any customer or location at our discretion.`,
  },
  {
    title: "13. Contact for Shipping Queries",
    content: `Email: info@nezalherbocare.com\nAddress: Nezal Herbocare Pvt.Ltd, S-28, Whispering Palms, Lokhandwala Complex, Akurli Road, Kandivali East, Mumbai – 400 101, Maharashtra, India\n\nAll disputes arising out of this Shipping Policy shall be subject to the exclusive jurisdiction of the courts at Mumbai, Maharashtra, India.`,
  },
]

export default function ShippingPolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-[#f9f6f1] border-b border-border py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <span>Shipping Policy</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Shipping Policy</h1>
          <p className="text-sm text-muted-foreground mt-3">Last updated: 1 July 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="space-y-10">
          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-xl font-semibold text-foreground mb-3">{section.title}</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-[15px]">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Questions about shipping? Email us at{" "}
            <a href="mailto:info@nezalherbocare.com" className="underline hover:text-foreground transition-colors">
              info@nezalherbocare.com
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}