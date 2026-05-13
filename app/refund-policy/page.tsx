// app/refund-policy/page.tsx
"use client"

import React from "react"
import { Package, RefreshCw, Shield, AlertCircle, CheckCircle, Mail } from "lucide-react"
import { BRAND } from "@/lib/config"

const policySteps = [
  {
    step: 1,
    title: "3-Day Return Window",
    icon: Package,
    description: "You have 3 days after receiving your item to request a return. This ensures you have time to inspect our natural skincare products upon arrival."
  },
  {
    step: 2,
    title: "Product Condition",
    icon: Shield,
    description: "Items must be in the same condition as received - unopened, unused, with tags, and in original packaging. You'll need the receipt or proof of purchase."
  },
  {
    step: 3,
    title: "Return Request",
    icon: Mail,
    description: `Contact us at ${BRAND.supportEmail} to initiate a return. We'll send you a return shipping label and instructions on where to send your package.`
  },
  {
    step: 4,
    title: "Refund Processing",
    icon: RefreshCw,
    description: "Once we receive and inspect your return, we'll notify you about refund approval. Approved refunds are processed to your original payment method."
  }
]

const keyPoints = [
  {
    icon: CheckCircle,
    title: "Eligible Returns",
    items: [
      "Unopened and unused products",
      "Items with original packaging intact",
      "Products with tags still attached",
      "Valid proof of purchase provided"
    ]
  },
  {
    icon: AlertCircle,
    title: "Non-Returnable Items",
    items: [
      "Products on sale or clearance",
      "Gift cards and promotional items",
      "Opened skincare products (for safety)",
      "Items without return authorization"
    ]
  }
]

export default function RefundPolicy() {
  return (
    <section className="bg-[--color-bg-page] min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-[--color-bg-dark] py-20 px-6">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[--color-brand-primary] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[--color-brand-primary] rounded-full blur-3xl"></div>
        </div>
        
        <div className="container-nezal text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[--color-brand-primary]/20 rounded-2xl mb-6">
            <RefreshCw className="w-10 h-10 text-[--color-brand-primary]" />
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Refund & <span className="text-[--color-brand-primary]">Return Policy</span>
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Your satisfaction is our priority. Review our straightforward return and refund process for {BRAND.name} natural skincare products.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-nezal py-16 md:py-24">
        {/* Policy Highlight */}
        <div className="bg-gradient-to-r from-[--color-brand-primary] to-[--color-brand-primary-dark] rounded-2xl p-8 md:p-12 text-center mb-16 shadow-sm">
          <h2 className="text-4xl font-bold text-white mb-4">3-Day Return Policy</h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            We stand behind the quality of our natural skincare products. If you're not completely satisfied, we're here to help.
          </p>
        </div>

        {/* Return Process Steps */}
        <div className="mb-20">
          <h3 className="text-3xl font-bold text-[--color-text-heading] mb-12 text-center">How Returns Work</h3>
          <div className="grid md:grid-cols-2 gap-8">
            {policySteps.map((item) => {
              const Icon = item.icon
              return (
                <div 
                  key={item.step}
                  className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 border border-[--color-border]"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-[--color-brand-primary]/10 p-4 rounded-xl flex-shrink-0">
                      <Icon className="w-8 h-8 text-[--color-brand-primary]" />
                    </div>
                    <div>
                      <div className="inline-block bg-[--color-brand-primary] text-white text-sm font-bold px-3 py-1 rounded-full mb-2">
                        Step {item.step}
                      </div>
                      <h4 className="text-xl font-semibold text-[--color-text-heading] mb-2">
                        {item.title}
                      </h4>
                    </div>
                  </div>
                  <p className="text-[--color-text-body] leading-relaxed ml-20">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Eligible vs Non-Eligible */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {keyPoints.map((section) => {
            const Icon = section.icon
            return (
              <div 
                key={section.title}
                className="bg-white rounded-2xl p-8 shadow-sm border border-[--color-border]"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-4 rounded-xl ${
                    section.title === "Eligible Returns" 
                      ? 'bg-green-100' 
                      : 'bg-orange-100'
                  }`}>
                    <Icon className={`w-8 h-8 ${
                      section.title === "Eligible Returns" 
                        ? 'text-green-600' 
                        : 'text-orange-600'
                    }`} />
                  </div>
                  <h4 className="text-2xl font-bold text-[--color-text-heading]">
                    {section.title}
                  </h4>
                </div>
                <ul className="space-y-3">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        section.title === "Eligible Returns" 
                          ? 'bg-green-600' 
                          : 'bg-orange-600'
                      }`}></div>
                      <span className="text-[--color-text-body]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Additional Information */}
        <div className="bg-[--color-bg-cream] rounded-2xl p-8 md:p-12 mb-16 border border-[--color-border]">
          <h3 className="text-2xl font-bold text-[--color-text-heading] mb-6">Important Information</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-[--color-text-heading] mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-[--color-brand-primary]" />
                Damages & Issues
              </h4>
              <p className="text-[--color-text-body] leading-relaxed">
                Please inspect your order upon reception. Contact us immediately if the item is defective, damaged, or if you receive the wrong item, so we can evaluate the issue and make it right.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-[--color-text-heading] mb-3 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[--color-brand-primary]" />
                Exchanges
              </h4>
              <p className="text-[--color-text-body] leading-relaxed">
                The fastest way to ensure you get what you want is to return the item you have, and once the return is accepted, make a separate purchase for the new item.
              </p>
            </div>
          </div>
        </div>

        {/* Refund Timeline */}
        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-[--color-border] mb-16">
          <h3 className="text-2xl font-bold text-[--color-text-heading] mb-6 text-center">Refund Processing Timeline</h3>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-[--color-brand-primary] text-white font-bold w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold text-[--color-text-heading]">We Receive Your Return</h4>
                <p className="text-[--color-text-muted]">Within 1-2 business days after you ship it</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-[--color-brand-primary] text-white font-bold w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold text-[--color-text-heading]">Inspection & Approval</h4>
                <p className="text-[--color-text-muted]">We'll notify you via email within 1-2 business days</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[--color-brand-primary] text-white font-bold w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold text-[--color-text-heading]">Refund Credited</h4>
                <p className="text-[--color-text-muted]">Processed to your original payment method. Bank processing may take 5-10 business days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-[--color-bg-dark] rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[--color-brand-primary] rounded-full blur-3xl"></div>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-white mb-4">Need Help with a Return?</h3>
            <p className="text-white/60 text-lg mb-8 max-w-2xl mx-auto">
              Our customer support team is ready to assist you with any questions about returns, refunds, or exchanges.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href={`mailto:${BRAND.supportEmail}`}
                className="inline-flex items-center justify-center gap-2 bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <Mail className="w-5 h-5" />
                Email Support
              </a>
              <a 
                href={`tel:${BRAND.whatsapp.secondary}`}
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-[--color-text-heading] font-semibold py-4 px-8 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <Package className="w-5 h-5" />
                Call Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}