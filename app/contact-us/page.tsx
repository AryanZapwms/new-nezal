// app/contact-us/page.tsx (Redesigned)
"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Clock, ArrowRight, Sparkles, Shield, Leaf } from "lucide-react";
import { BRAND } from "@/lib/config";

export default function ContactUs() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#fafaf5] to-white">
      {/* Hero Section – immersive gradient + glow */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#1e3a28] to-[#2a5c3a] pt-24 pb-20 md:pt-32 md:pb-28">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container-nezal relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-6xl">
              Get in{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                Touch
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-100 md:text-xl">
              We’re here to guide you on your natural skincare journey. Reach out for
              personalised advice or product support.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                Expert consultation
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm">
                <Shield className="h-4 w-4 text-emerald-300" />
                100% natural
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main content */}
      <div className="container-nezal py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Contact cards – animated staggered grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="space-y-6"
          >
            {/* Address card */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="group rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl md:p-8"
            >
              <div className="flex items-start gap-5">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 transition-colors group-hover:bg-emerald-100">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1e3a28]">Visit Our Clinic</h3>
                  <address className="not-italic mt-2 text-[#4a5e50] leading-relaxed">
                    Healthcare Medical Center, S-55,<br />
                    Whispering Palms Shopping Center,<br />
                    Akurli road, Lokhandwala Township,<br />
                    Kandivali (E), Mumbai – 400101
                  </address>
                </div>
              </div>
            </motion.div>

            {/* Phone card */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="group rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl md:p-8"
            >
              <div className="flex items-start gap-5">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 transition-colors group-hover:bg-emerald-100">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1e3a28]">Call Us</h3>
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-sm text-[#6b7c70]">Mobile</p>
                      <a
                        href={`tel:${BRAND.whatsapp.secondary}`}
                        className="text-lg font-medium text-[#1e3a28] transition-colors hover:text-emerald-600"
                      >
                        +91 {BRAND.whatsapp.secondary}
                      </a>
                    </div>
                    <div>
                      <p className="text-sm text-[#6b7c70]">Office</p>
                      <a
                        href={`tel:${BRAND.whatsapp.primary}`}
                        className="text-lg font-medium text-[#1e3a28] transition-colors hover:text-emerald-600"
                      >
                        +91 {BRAND.whatsapp.primary}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Email card */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="group rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl md:p-8"
            >
              <div className="flex items-start gap-5">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 transition-colors group-hover:bg-emerald-100">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1e3a28]">Email Us</h3>
                  <a
                    href={`mailto:${BRAND.supportEmail}`}
                    className="mt-2 inline-block text-lg font-medium text-[#1e3a28] transition-colors hover:text-emerald-600"
                  >
                    {BRAND.supportEmail}
                  </a>
                  <p className="mt-2 text-sm text-[#6b7c70]">We respond within 24 hours</p>
                </div>
              </div>
            </motion.div>

            {/* Business hours card – gradient accent */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a28] to-[#2a5c3a] p-6 shadow-lg md:p-8"
            >
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
              <div className="flex items-start gap-5">
                <div className="rounded-2xl bg-white/20 p-3 text-white backdrop-blur-sm">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Business Hours</h3>
                  <div className="mt-3 space-y-1 text-emerald-100">
                    <p>Monday – Saturday: 10:00 AM – 7:00 PM</p>
                    <p>Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right column: Map + CTA */}
          <div className="space-y-8 lg:sticky lg:top-24">
            {/* Map card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm"
            >
              <div className="bg-gradient-to-r from-[#1e3a28] to-[#2a5c3a] px-6 py-5">
                <h3 className="text-xl font-semibold text-white">Find Us Here</h3>
                <p className="mt-1 text-sm text-emerald-200">
                  Visit our clinic for a personal skin consultation
                </p>
              </div>
              <div className="aspect-video w-full md:aspect-auto md:h-[420px]">
                <iframe
                  loading="lazy"
                  src="https://maps.google.com/maps?q=Healthcare%20Medical%20Center%2C%20S-95%2C%20whispering%20plains%2C%20shopping%20Corner%2C%20Mumbra%2C%20Kandiwali%20road%2C%20Kandivali%20%28E%29%2C%20Mumbai%20Maharashtra%20India%2C%20400101&t=m&z=16&output=embed&iwloc=near"
                  title="Healthcare Medical Center Location"
                  aria-label="Map showing Healthcare Medical Center in Kandivali East, Mumbai"
                  className="h-full w-full border-0"
                  allowFullScreen
                />
              </div>
            </motion.div>

            {/* Call to action card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm"
            >
              <h4 className="text-xl font-semibold text-[#1e3a28]">Need immediate help?</h4>
              <p className="mt-2 text-[#4a5e50]">
                Our skincare experts are ready to assist you in choosing the perfect
                natural products for your skin type.
              </p>
              <a
                href={`tel:${BRAND.whatsapp.secondary}`}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a28] py-4 font-semibold text-white transition-all hover:bg-[#2a5c3a] hover:shadow-md"
              >
                Call Now <ArrowRight className="h-5 w-5" />
              </a>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Brand promise – full-width with leaf icon */}
      <section className="relative mt-8 bg-[#f0f6f0] py-16">
        <div className="container-nezal text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl"
          >
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-white p-3 shadow-sm">
                <Leaf className="h-8 w-8 text-[#1e3a28]" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[#1e3a28] md:text-3xl">
              India’s First Home-Use{" "}
              <span className="text-emerald-600">Natural Skincare</span>
            </h3>
            <p className="mt-4 text-[#4a5e50] leading-relaxed md:text-lg">
              {BRAND.name} brings professional‑grade natural skincare to your home,
              adhering to international safety standards. Experience the confidence of
              clinical results with the goodness of nature.
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}