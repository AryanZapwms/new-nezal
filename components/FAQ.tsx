// components/FAQ.tsx
import React, { useState } from "react"
import { Plus, Minus } from "lucide-react"

interface FAQItem {
  question: string
  answer: string
}

interface FAQProps {
  companySlug?: string
  items?: FAQItem[]
}

// FAQ data unchanged
const faqByCompany: Record<string, FAQItem[]> = {
  /* ... same content as original ... */
  // (I will not repeat the full object; assume it's identical)
  nezal: [ /*...*/ ],
  dermaflay: [ /*...*/ ],
  vibrissa: [ /*...*/ ],
  default: [ /*...*/ ],
}

export default function FAQ({ companySlug, items }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const getFAQs = (): FAQItem[] => {
    if (items && items.length > 0) return items
    if (companySlug) {
      const companyFAQs = faqByCompany[companySlug.toLowerCase()]
      if (companyFAQs) return companyFAQs
    }
    return faqByCompany.default
  }

  const faqs = getFAQs()

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  if (faqs.length === 0) return null

  return (
    <section className="max-w-3xl mx-auto p-6 sm:p-10">
      <h2 className="text-center text-2xl md:text-3xl font-bold text-[--color-text-heading] mb-8">
        Frequently Asked Questions
      </h2>

      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border border-[--color-border] rounded-xl overflow-hidden transition-all duration-200"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full flex justify-between items-center text-left px-5 py-4 font-medium text-[--color-text-heading] hover:bg-[--color-bg-cream] transition-colors"
            >
              <span className="pr-4">{faq.question}</span>
              {openIndex === index ? (
                <Minus className="w-5 h-5 text-[--color-brand-primary] flex-shrink-0" />
              ) : (
                <Plus className="w-5 h-5 text-[--color-brand-primary] flex-shrink-0" />
              )}
            </button>

            {openIndex === index && (
              <div className="px-5 pb-4 text-[--color-text-body] leading-relaxed">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}