// app/contact-us/page.tsx (Redesigned)
"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Clock, ArrowRight, Leaf } from "lucide-react";
import { BRAND } from "@/lib/config";
import { trackContact } from "@/lib/facebook-pixel";

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

      {/* Main content */}
      <div className="container-nezal py-16 md:py-24">
        <div className="space-y-10">

          {/* Contact cards – animated staggered grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
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
                  <h3 className="text-xl font-semibold text-[#1e3a28]">Visit Our Office</h3>
                  <address className="not-italic mt-2 text-[#4a5e50] leading-relaxed">
                    Nezal Herobcare Pvt. Ltd., S-28,<br />
                    Whispering Palms Shopping Complex,<br />
                    Lokhandwala Township, Akurli road,<br />
                    Kandivali (E), Mumbai – 400101, Maharastra, India.
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
                  <h3 className="text-xl font-semibold text-[#1e3a28]">Our Contact</h3>
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-sm text-[#6b7c70]">Office</p>
                      <a
                       href={`mailto:${BRAND.supportEmail}`}
                    onClick={() => trackContact()}
                    className="mt-2 inline-block text-lg font-medium text-[#1e3a28] transition-colors hover:text-emerald-600"
                  >
                    {BRAND.supportEmail}
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

            {/* Business hours card */}
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
                  <div className="mt-3 space-y-1">
                    <p className="text-white">Monday – Saturday: 10:00 AM – 7:00 PM</p>
                    <p className="text-white">Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Map ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm"
          >
            {/* Map header */}
            <div className="bg-gradient-to-r from-[#1e3a28] to-[#2a5c3a] px-6 py-5">
              <h3 className="text-xl font-semibold text-white">Find Us Here</h3>
              <p className="mt-1 text-sm text-emerald-200">
                S-28, Whispering Palms Shopping Complex, Kandivali (E), Mumbai
              </p>
            </div>

            {/* Embedded Google Map */}
            <div className="aspect-video w-full md:aspect-auto md:h-[420px]">
              <iframe
                loading="lazy"
                src="https://maps.google.com/maps?q=Whispering+Palms+Shopping+Complex+Lokhandwala+Township+Akurli+Road+Kandivali+East+Mumbai+400101&t=m&z=16&output=embed&iwloc=near"
                title="Nezal Herbcare Office Location"
                aria-label="Map showing Nezal Herbcare office in Kandivali East, Mumbai"
                className="h-full w-full border-0"
                allowFullScreen
              />
            </div>

            {/* Get directions link */}
            <div className="px-6 py-4 border-t border-emerald-50 flex items-center justify-between">
              <p className="text-sm text-[#6b7c70]">Kandivali (E), Mumbai – 400101</p>
              <a
                href="https://maps.google.com/maps?q=Whispering+Palms+Shopping+Complex+Lokhandwala+Township+Akurli+Road+Kandivali+East+Mumbai+400101"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
              >
                Get Directions <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Brand promise */}
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
          
              <span className="text-emerald-600">Professional Skincare.</span>
              <p className="text-lg">Botanical Expertise</p>
            </h3>
            <p className="mt-4 text-[#4a5e50] leading-relaxed md:text-lg">
              At {BRAND.name} we combine carefully selected natural active ingredients with thoughtfully
              developed formulations for everyday use. With own manufacturing and quality tested for
              consistency, every product reflects our commitment to quality, safety, and exceptional care.
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}