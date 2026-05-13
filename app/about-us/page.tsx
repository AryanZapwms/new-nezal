// app/about-us/page.tsx (Redesigned)
"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  Award,
  Shield,
  Heart,
  Users,
  Microscope,
  Globe,
  Target,
  Star,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Leaf,
  Clock,
  Quote,
} from "lucide-react";
import { BRAND } from "@/lib/config";

// ––––– Data (unchanged content, only presentation will be refreshed) –––––
const values = [
  {
    icon: Microscope,
    title: "Scientific Excellence",
    description:
      "Formulated with pharmaceutical-grade natural ingredients following international guidelines and safety standards",
  },
  {
    icon: Shield,
    title: "Safety First",
    description:
      "Every product undergoes rigorous testing to ensure safe home use without compromising on professional results",
  },
  {
    icon: Heart,
    title: "Customer‑Centric",
    description:
      "Your skin health and satisfaction drive everything we do, from formulation to customer support",
  },
  {
    icon: Award,
    title: "Quality Assured",
    description:
      "Made in India with pride, adhering to the highest quality control standards in skincare manufacturing",
  },
];

const milestones = [
  {
    year: "Founded",
    title: "A Revolutionary Vision",
    description: `${BRAND.name} was founded with a mission to democratize professional skincare by bringing natural, clinical‑grade products to homes across India for the first time.`,
  },
  {
    year: "Innovation",
    title: "Breaking Barriers",
    description:
      "We pioneered the development of safe, effective home‑use skincare formulations that previously required professional administration.",
  },
  {
    year: "Expansion",
    title: "Growing Reach",
    description: `From Mumbai to pan‑India, ${BRAND.name} now serves thousands of customers seeking professional skincare results at home.`,
  },
  {
    year: "Today",
    title: "Leading the Market",
    description:
      "India's first and most trusted brand for home‑use natural skincare, helping people achieve radiant, healthy skin with confidence.",
  },
];

const features = [
  {
    icon: Globe,
    title: "International Standards",
    description: "Formulations that meet global skincare guidelines",
  },
  {
    icon: Users,
    title: "Expert Guidance",
    description: "Professional support for your skincare journey",
  },
  {
    icon: Target,
    title: "Targeted Solutions",
    description: "Specialized products for every skin concern",
  },
  {
    icon: Sparkles,
    title: "Proven Results",
    description: "Visible improvements in skin texture and tone",
  },
];

const team = [
  {
    name: "Dr. Aditi Sharma",
    role: "Co‑founder & Chief Dermatologist",
    image: "/images/team/aditi.jpg",
    bio: "15+ years in clinical dermatology",
  },
  {
    name: "Rohan Mehta",
    role: "Co‑founder & Formulation Scientist",
    image: "/images/team/rohan.jpg",
    bio: "Ex‑L'Oréal, IIT Delhi alumnus",
  },
  {
    name: "Priya Nair",
    role: "Head of Product Innovation",
    image: "/images/team/priya.jpg",
    bio: "Natural skincare specialist",
  },
];

const testimonials = [
  {
    name: "Ritika S.",
    location: "Mumbai",
    rating: 5,
    text: "Finally a brand that brings clinic‑quality results home. My pigmentation has visibly reduced in 4 weeks!",
    avatar: "/images/testimonials/ritika.jpg",
  },
  {
    name: "Ankit K.",
    location: "Delhi",
    rating: 5,
    text: "The acne control serum is a game changer. No more breakouts, and my skin feels healthier than ever.",
    avatar: "/images/testimonials/ankit.jpg",
  },
  {
    name: "Sneha R.",
    location: "Bangalore",
    rating: 5,
    text: "I love that it's natural yet so effective. Customer support is also super responsive.",
    avatar: "/images/testimonials/sneha.jpg",
  },
];

const stats = [
  { value: "50,000+", label: "Happy Customers" },
  { value: "4.9★", label: "Average Rating" },
  { value: "15+", label: "Years of R&D" },
  { value: "24/7", label: "Expert Support" },
];

// ––––– Animation variants –––––
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function AboutUs() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#fafaf5] to-white">
      {/* ––– Hero Section (Immersive Gradient) ––– */}
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
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-emerald-100 backdrop-blur-sm">
              <Leaf className="h-4 w-4" />
              India's First Home‑Use Natural Skincare
            </div>
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-white md:text-7xl">
              Redefining{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                Skincare
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-100 md:text-xl">
              Bringing professional‑grade natural skincare treatments from clinical
              settings to the comfort and privacy of your home.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ––– Mission Statement (Floating Card) ––– */}
      <div className="container-nezal -mt-16 relative z-10 mb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl border border-emerald-100 bg-white/80 p-8 shadow-xl backdrop-blur-sm md:p-12"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-2xl bg-emerald-50 p-3">
              <Sparkles className="h-8 w-8 text-emerald-700" />
            </div>
            <h2 className="text-3xl font-bold text-[#1e3a28] md:text-4xl">Our Mission</h2>
            <p className="max-w-4xl text-lg leading-relaxed text-[#4a5e50] md:text-xl">
              {BRAND.name} was founded to produce innovative natural skincare products
              that can be used safely at home. We make professional‑grade formulations
              that adhere to international guidelines, providing the first home‑use
              natural skincare solutions in India. Our goal is to empower individuals
              to achieve clinical‑quality skincare results without the need for
              expensive salon visits.
            </p>
          </div>
        </motion.div>
      </div>

      {/* ––– Story Section (with image) ––– */}
      <div className="container-nezal py-12 mb-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-[#1e3a28] md:text-5xl">
              The {BRAND.name} Story
            </h2>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-[#4a5e50]">
              <p>
                The journey of {BRAND.name} began with a simple yet powerful question:
                Why should professional‑quality skincare be limited to expensive
                clinics?
              </p>
              <p>
                Our founders, a team of dermatologists and skincare scientists,
                recognized that with the right formulation and proper guidance, natural
                skincare could be safely and effectively administered at home. This
                insight led to years of research and development.
              </p>
              <p>
                Today, {BRAND.name} stands as a testament to innovation in skincare.
                We've successfully created a range of products that maintain the
                efficacy of professional treatments while ensuring safety for home use.
                Our formulations follow strict international guidelines and undergo
                rigorous testing.
              </p>
              <div className="flex items-center gap-2 font-semibold text-[#1e3a28]">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
                We're not just selling products – we're pioneering a new era of
                accessible, professional natural skincare in India.
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl shadow-2xl"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src="/aboutus.png"
                alt={`${BRAND.name} Laboratory`}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a28]/60 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <p className="text-lg font-semibold text-white drop-shadow-md md:text-xl">
                Developed with precision, delivered with care
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ––– Stats Section (Social Proof) ––– */}
      <div className="border-y border-emerald-100 bg-emerald-50/50 py-16 mb-20">
        <div className="container-nezal">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-8 text-center md:grid-cols-4"
          >
            {stats.map((stat, idx) => (
              <motion.div key={idx} variants={itemVariants} className="space-y-2">
                <div className="text-4xl font-bold text-emerald-700 md:text-5xl">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-[#4a5e50]">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ––– Core Values (Cards with Hover) ––– */}
      <div className="container-nezal mb-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#1e3a28] md:text-5xl">
            Our Core <span className="text-emerald-600">Values</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#4a5e50]">
            The principles that guide every decision we make and every product we
            create.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-4"
        >
          {values.map((value, idx) => {
            const Icon = value.icon;
            return (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="group rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl"
              >
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 w-fit group-hover:bg-emerald-100">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-[#1e3a28]">{value.title}</h3>
                <p className="mt-2 leading-relaxed text-[#4a5e50]">
                  {value.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ––– Meet the Experts (Team) ––– */}
      <div className="container-nezal mb-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#1e3a28] md:text-5xl">
            Meet the <span className="text-emerald-600">Experts</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#4a5e50]">
            The passionate minds behind your skincare transformation.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-8 md:grid-cols-3"
        >
          {team.map((member, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="group overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition-all duration-300 hover:shadow-xl"
            >
              <div className="aspect-square overflow-hidden bg-gray-100">
                <img
                  src={member.image}
                  alt={member.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold text-[#1e3a28]">{member.name}</h3>
                <p className="text-sm font-medium text-emerald-600">{member.role}</p>
                <p className="mt-2 text-sm text-[#4a5e50]">{member.bio}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ––– Our Journey (Timeline) ––– */}
      <div className="container-nezal mb-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#1e3a28] md:text-5xl">
            Our <span className="text-emerald-600">Journey</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#4a5e50]">
            From a revolutionary idea to India's leading home‑use natural skincare
            brand.
          </p>
        </div>

        <div className="space-y-8">
          {milestones.map((milestone, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="relative pl-8 border-l-4 border-emerald-600 md:pl-12"
            >
              <div className="absolute left-0 -translate-x-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-bold shadow-md">
                {idx + 1}
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="text-sm font-bold text-emerald-600">
                  {milestone.year}
                </div>
                <h3 className="mt-1 text-2xl font-bold text-[#1e3a28]">
                  {milestone.title}
                </h3>
                <p className="mt-3 text-[#4a5e50]">{milestone.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ––– Customer Testimonials ––– */}
      <div className="bg-emerald-50/50 py-20 mb-20">
        <div className="container-nezal">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#1e3a28] md:text-5xl">
              What Our <span className="text-emerald-600">Customers Say</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[#4a5e50]">
              Real stories from real people who transformed their skin with{" "}
              {BRAND.name}.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-8 md:grid-cols-3"
          >
            {testimonials.map((t, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition-all hover:shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="h-14 w-14 rounded-full border-2 border-emerald-200 object-cover"
                  />
                  <div>
                    <p className="font-bold text-[#1e3a28]">{t.name}</p>
                    <p className="text-sm text-[#4a5e50]">{t.location}</p>
                    <div className="mt-1 flex gap-0.5">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <Quote className="mt-4 h-6 w-6 text-emerald-200" />
                <p className="mt-2 italic text-[#4a5e50]">"{t.text}"</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ––– Why Choose Us (Features) ––– */}
      <div className="container-nezal mb-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#1e3a28] md:text-5xl">
            Why Choose <span className="text-emerald-600">{BRAND.name}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#4a5e50]">
            We combine scientific rigor with practical accessibility.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-sm transition-all hover:shadow-xl"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-[#1e3a28]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-[#4a5e50]">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ––– Complete Skincare Solutions (Categories Highlight) ––– */}
      <div className="container-nezal mb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1e3a28] to-[#2a5c3a] p-8 shadow-xl md:p-12">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative z-10 text-center text-white">
            <h2 className="text-3xl font-bold md:text-4xl">Complete Skincare Solutions</h2>
            <p className="mx-auto mt-4 max-w-2xl text-emerald-100">
              From natural face care to acne control and pigmentation treatment – we
              offer specialized products for every skin concern.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm transition hover:bg-white/20">
                <h3 className="font-bold">Natural Face Care</h3>
                <p className="text-sm text-emerald-100">Exfoliation & renewal</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm transition hover:bg-white/20">
                <h3 className="font-bold">Acne Control</h3>
                <p className="text-sm text-emerald-100">Clear, blemish‑free skin</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm transition hover:bg-white/20">
                <h3 className="font-bold">Pigmentation</h3>
                <p className="text-sm text-emerald-100">Even tone & brightness</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm transition hover:bg-white/20">
                <h3 className="font-bold">Daily Care</h3>
                <p className="text-sm text-emerald-100">Maintain healthy skin</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ––– Final CTA ––– */}
      <div className="container-nezal pb-20">
        <div className="rounded-3xl bg-emerald-50 p-8 text-center shadow-sm md:p-16">
          <h2 className="text-3xl font-bold text-[#1e3a28] md:text-4xl">
            Ready to Transform Your Skin?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#4a5e50]">
            Experience the power of natural skincare in the comfort of your home. Join
            thousands of satisfied customers across India.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/shop"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-8 py-4 font-semibold text-white transition hover:bg-emerald-800 hover:shadow-md"
            >
              Shop Now
            </a>
            <a
              href="/contact-us"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-8 py-4 font-semibold text-[#1e3a28] transition hover:bg-emerald-50 hover:shadow-md"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}