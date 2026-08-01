// app/privacy-policy/page.tsx
import Link from "next/link"

export const metadata = {
  title: "Privacy Policy | Nezal Herbocare",
  description: "Privacy Policy for Nezal Herbocare",
}

const sections = [
  {
    title: "Collecting Personal Information",
    content: `When you visit the Site, we collect certain information about your device, your interaction with the Site, and information necessary to process your purchases. We may also collect additional information if you contact us for customer support.`,
    subsections: [
      {
        title: "Device Information",
        content: `We collect: version of web browser, IP address, time zone, cookie information, what sites or products you view, search terms, and how you interact with the Site. This is collected automatically when you access our Site using cookies, log files, web beacons, tags, or pixels — to load the Site accurately and perform analytics to optimize our Site.`,
      },
      {
        title: "Order Information",
        content: `We collect: name, billing address, shipping address, payment information (including credit card numbers), email address, and phone number — to provide products or services to you, process your payment, arrange shipping, and provide invoices or order confirmations.`,
      },
      {
        title: "Customer Support Information",
        content: `Information collected from you for the purpose of providing customer support.`,
      },
      {
        title: "Minors",
        content: `We do not intentionally collect Personal Information from children. If you are a parent or guardian and believe your child has provided us with Personal Information, please contact us to request deletion.`,
      },
    ],
  },
  {
    title: "Sharing Personal Information",
    content: `We share your Personal Information with service providers to help us provide our services and fulfill our contracts with you. We may share your Personal Information to comply with applicable laws and regulations, to respond to a subpoena, search warrant or other lawful request for information we receive, or to otherwise protect our rights.`,
  },
  {
    title: "Behavioral Advertising",
    content: `We use your Personal Information to provide you with targeted advertisements or marketing communications we believe may be of interest to you. We use Google Analytics to help us understand how our customers use the Site.\n\nYou can opt-out of targeted advertising via:\n• Facebook: https://www.facebook.com/settings/?tab=ads\n• Google: https://www.google.com/settings/ads/anonymous\n• Digital Advertising Alliance: http://optout.aboutads.info/`,
  },
  {
    title: "Using Personal Information",
    content: `We use your personal information to provide our services to you, which includes: offering products for sale, processing payments, shipping and fulfillment of your order, and keeping you up to date on new products, services, and offers.`,
  },
  {
    title: "Retention",
    content: `When you place an order through the Site, we will retain your Personal Information for our records unless and until you ask us to erase this information.`,
  },
  {
    title: "Cookies",
    content: `A cookie is a small amount of information that's downloaded to your computer or device when you visit our Site. We use functional, performance, advertising, and social media cookies. Cookies make your browsing experience better by allowing the website to remember your actions and preferences.\n\nMost browsers automatically accept cookies, but you can choose whether or not to accept cookies through your browser controls. Please keep in mind that removing or blocking cookies can negatively impact your user experience.`,
  },
  {
    title: "Do Not Track",
    content: `Because there is no consistent industry understanding of how to respond to "Do Not Track" signals, we do not alter our data collection and usage practices when we detect such a signal from your browser.`,
  },
  {
    title: "Changes",
    content: `We may update this Privacy Policy from time to time in order to reflect changes to our practices or for other operational, legal, or regulatory reasons.`,
  },
  {
    title: "Contact",
    content: `For more information about our privacy practices, questions, or complaints, please contact us:\n\nEmail: info@nezalherbocare.com\n\nHealthcare Medical Centre\nS-28, Whispering Palms, Lokhandwala Complex\nAkurli Road, Kandivali East\nMumbai Suburban, MH, India – 400 101`,
  },
]

export default function PrivacyPolicyPage() {
  return <PolicyPage title="Privacy Policy" sections={sections} lastUpdated="September 14, 2020" />
}

// ─── Shared layout used by all policy pages ───────────────────────────────────

interface Subsection {
  title: string
  content: string
}

interface Section {
  title: string
  content: string
  subsections?: Subsection[]
}

function PolicyPage({
  title,
  sections,
  lastUpdated,
}: {
  title: string
  sections: Section[]
  lastUpdated?: string
}) {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-[#f9f6f1] border-b border-border py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <span>{title}</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground">{title}</h1>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-3">Last updated: {lastUpdated}</p>
          )}
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
              {section.subsections && (
                <div className="mt-4 space-y-4 pl-4 border-l-2 border-border">
                  {section.subsections.map((sub, j) => (
                    <div key={j}>
                      <h3 className="font-medium text-foreground mb-1">{sub.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-[14px] whitespace-pre-line">
                        {sub.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
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