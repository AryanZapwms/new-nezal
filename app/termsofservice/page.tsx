// app/termsofservice/page.tsx
import Link from "next/link"

export const metadata = {
  title: "Terms of Service | Nezal Herbocare",
  description: "Terms of Service for Nezal Herbocare",
}

const sections = [
  {
    id: "section-1",
    title: "1. Eligibility",
    content: `By using this website, you represent and warrant that: (a) you are at least 18 years of age, or are accessing the website under the supervision of a parent or legal guardian; (b) you have the legal capacity to enter into a binding agreement under the Indian Contract Act, 1872; (c) you are not barred from receiving services under applicable law; and (d) the information you provide is accurate, complete, and current.\n\nWe reserve the right to refuse service, terminate accounts, or cancel orders at our sole discretion, including if we believe a user is under 18 years of age or has provided false information.`,
  },
  {
    id: "section-2",
    title: "2. Use of Website",
    content: `You agree to use this website only for lawful purposes and in a manner that does not infringe the rights of others or restrict or inhibit their use. You must not:\n\n• Use the site for any unlawful purpose or in violation of any applicable Indian law or regulation\n• Reproduce, duplicate, copy, sell, resell, or exploit any portion of the website or its content without express written permission\n• Transmit any malicious code, viruses, worms, or other harmful software\n• Collect or harvest personal information of other users\n• Use the website to impersonate any person or entity or misrepresent your affiliation\n• Engage in any conduct that could damage, disable, or impair the website or servers\n• Attempt to gain unauthorized access to any part of the website or its related systems\n\nViolation of any of these terms may result in immediate termination of your access and may expose you to civil or criminal liability under applicable Indian law, including but not limited to the Information Technology Act 2000, the Information Technology (Amendment) Act, 2008, the Digital Personal Data Protection Act 2023, and any rules, regulations, or amendments made thereunder.`,
  },
  {
    id: "section-3",
    title: "3. Products and Services",
    content: `All products listed on this website are subject to availability. We reserve the right to modify product descriptions, prices, and availability without prior notice. Product images are for illustrative purposes only — actual colour may vary due to monitor settings. All ingredients displayed are subject to formulation updates; the physical label on the product shall be the final reference for ingredient information.\n\nWe reserve the right to limit the quantities of any product available for purchase, to discontinue any product, and to refuse any order at our sole discretion. Any offer made on this site is void where prohibited by law.\n\nCosmetic and skincare products are for external use only unless otherwise stated. Results may vary between individual users. We do not make therapeutic, medical, or disease-cure claims for any product. If you have a medical condition, allergy, or skin sensitivity, please consult a qualified healthcare professional before use.`,
  },
  {
    id: "section-4",
    title: "4. Pricing, Orders and Payment",
    content: `All prices displayed on the website are in Indian Rupees (INR) and include applicable taxes unless otherwise stated. Prices are subject to change without prior notice. The price applicable to your order is the price displayed at the time you place the order.\n\nBy placing an order, you make an offer to purchase the product at the listed price. We reserve the right to accept or reject any order. An order is confirmed only upon receipt of our written confirmation via email. We reserve the right to cancel an order even after confirmation if: (a) the product is unavailable; (b) there is a pricing error; (c) payment cannot be processed; or (d) we suspect fraud or abuse.\n\nYou agree to provide accurate, complete, and current billing and shipping information. We use third-party payment processors and do not store your full payment card details. Payment security is governed by the terms of the relevant payment gateway provider.\n\nAll orders are subject to our Refund Policy and Shipping Policy, which form part of these Terms.`,
  },
  {
    id: "section-5",
    title: "5. Intellectual Property",
    content: `All content on this website — including but not limited to text, graphics, logos, product images, write-ups, brand names, slogans, and the overall look and feel of the site — is the exclusive property of Nezal Herbocare or its licensors and is protected under the Trade Marks Act, 1999, the Copyright Act, 1957, the Patents Act, 1970, and any other laws applicable to intellectual property in India.\n\nNo content from this website may be reproduced, republished, uploaded, posted, transmitted, or distributed in any form without prior written permission from us. Unauthorised use may constitute an infringement of intellectual property rights and may result in civil and criminal liability.`,
  },
  {
    id: "section-6",
    title: "6. Third-Party Links and Tools",
    content: `This website may contain links to third-party websites or tools (such as payment gateways, logistics partners, or social media platforms). These links are provided for convenience only. We do not endorse, control, or assume responsibility for the content, privacy practices, or accuracy of any third-party website. Your interaction with any third-party website is governed by that website's own terms and policies.\n\nWe shall not be liable for any loss or damage arising from your use of third-party websites or tools accessible through or in connection with this website.`,
  },
  {
    id: "section-7",
    title: "7. User Submissions and Content",
    content: `If you submit reviews, feedback, comments, or any other content to this website, you grant us a non-exclusive, royalty-free, perpetual, irrevocable, and fully sub-licensable right to use, reproduce, modify, adapt, publish, translate, and distribute such content in any medium. You represent that your submission does not infringe any third-party rights and is not defamatory, obscene, or unlawful.\n\nWe reserve the right to remove any user-generated content that we determine, at our sole discretion, violates these Terms, applicable law, or community standards — without notice or liability.`,
  },
  {
    id: "section-8",
    title: "8. Limitation of Liability",
    content: `To the fullest extent permitted by applicable law, Nezal Herbocare, its directors, officers, employees, partners, agents, licensors, and service providers shall not be liable for any indirect, incidental, special, consequential, punitive, or exemplary damages — including but not limited to loss of profits, goodwill, data, or business — arising out of or in connection with your use of or inability to use this website or its products.\n\nOur total liability to you for any claim arising out of or related to these Terms or any purchase shall not exceed the amount paid by you for the specific product giving rise to the claim.\n\nNothing in these Terms shall limit or exclude liability for death or personal injury caused by negligence, fraud, or any liability that cannot be excluded under applicable Indian law, including the Consumer Protection Act, 2019.`,
  },
  {
    id: "section-9",
    title: "9. Indemnification",
    content: `You agree to indemnify, defend, and hold harmless Nezal Herbocare and its parent company, subsidiaries, affiliates, officers, directors, agents, contractors, licensors, service providers, and employees from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable legal fees) arising, directly or indirectly, out of: (a) your breach of these Terms; (b) your use of the website; (c) your violation of any law or the rights of any third party; or (d) any content you submit to this website.`,
  },
  {
    id: "section-10",
    title: "10. Consumer Rights Under the Consumer Protection Act, 2019",
    content: `Nothing in these Terms is intended to limit, exclude, or modify the rights available to consumers under the Consumer Protection Act, 2019, the Consumer Protection (E-Commerce) Rules, 2020, or any other applicable Indian consumer protection legislation.\n\nAs a consumer, you have the right to: (a) seek redressal against unfair trade practices; (b) be informed about the quality, quantity, purity, and price of products; (c) file a complaint with the relevant Consumer Forum or the National Consumer Disputes Redressal Commission if your complaint is not resolved to your satisfaction.`,
  },
  {
    id: "section-11",
    title: "11. Disclaimer of Warranties",
    content: `This website and its content are provided on an 'as is' and 'as available' basis without any representations, warranties, or conditions of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement, to the extent permitted under applicable Indian law.\n\nWe do not warrant that the website will be uninterrupted, error-free, or free from viruses or other harmful components. Use of the website is entirely at your own risk.`,
  },
  {
    id: "section-12",
    title: "12. Modification of Terms",
    content: `We reserve the right to update or modify these Terms at any time without prior notice. Changes will be effective immediately upon posting on this page. Your continued use of the website after any changes constitutes your acceptance of the revised Terms. We recommend reviewing this page periodically.`,
  },
  {
    id: "section-13",
    title: "13. Governing Law and Jurisdiction",
    content: `These Terms of Service shall be governed by and construed in accordance with the laws of India.\n\nPrior to initiating arbitration proceedings, the parties agree to attempt to resolve any dispute through good-faith negotiation for a period of 30 (thirty) days from the date of written notice of the dispute.\n\nIf the mediation attempt fails, any dispute arising out of or in connection with the performance, interpretation, and validity of these Terms shall be resolved finally through arbitration in accordance with the Arbitration and Conciliation Act, 1996 (as amended from time to time). The seat of arbitration shall be Mumbai, Maharashtra, conducted in the English language by a sole arbitrator appointed mutually by the parties. If the parties fail to appoint an arbitrator within thirty (30) days of initiating the dispute, the arbitrator shall be appointed in accordance with the Arbitration and Conciliation Act, 1996.`,
  },
  {
    id: "section-14",
    title: "14. Contact Information",
    content: `For any questions, concerns, or notices regarding these Terms of Service, please contact us at:\n\nEmail: info@nezalherbocare.com\nAddress: Nezal Herbocare Pvt.Ltd, S-28, Whispering Palms, Lokhandwala Complex, Akurli Road, Kandivali East, Mumbai – 400 101, Maharashtra, India\nWebsite: www.nezalherbocare.com`,
  },
]

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-[#f9f6f1] border-b border-border py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <span>Terms of Service</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mt-3">Last updated: 1 July 2026</p>
        </div>
      </div>

      {/* Overview */}
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-0">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-10">
          <h2 className="font-semibold text-foreground mb-2">Overview</h2>
          <p className="text-muted-foreground text-[14px] leading-relaxed">
            This website (www.nezalherbocare.com) is owned and operated by Nezal Herbocare, a skincare and personal care brand manufactured in technical collaboration with Highbrow Healthcare, with its principal place of business at Nezal Herbocare Pvt.Ltd, S-28, Whispering Palms, Lokhandwala Complex, Akurli Road, Kandivali East, Mumbai – 400 101, Maharashtra, India ("Company", "we", "us", "our"). By accessing or using this website, browsing its content, or placing an order, you ("User", "Customer", "you") agree to be bound by these Terms of Service ("Terms"). If you do not agree, please do not access or use this website.
          </p>
          <p className="text-muted-foreground text-[14px] leading-relaxed mt-2">
            These Terms constitute a legally binding agreement between you and the Company and are governed by the laws of India. All disputes shall be subject to the exclusive jurisdiction of the courts at Mumbai, Maharashtra, India.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.id} id={section.id}>
              <h2 className="text-xl font-semibold text-foreground mb-3">{section.title}</h2>
              <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}
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