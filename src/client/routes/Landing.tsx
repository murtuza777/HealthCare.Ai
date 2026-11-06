import { motion } from "framer-motion";
import { Activity, ArrowRight, BellRing, ChevronDown, FileHeart, HeartPulse, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router";
import { MedicalAnimation } from "../components/MedicalAnimation";

// Ported from legacy/app/page.tsx + HomeClient.tsx. Removed: the artificial 2-second loading
// screen. Added: the "Learn more" section the old button pointed to.

const FEATURES = [
  {
    icon: HeartPulse,
    title: "Your heart health in one place",
    body: "Log blood pressure, heart rate, oxygen and glucose. Every reading is checked against clinical ranges and charted over time.",
  },
  {
    icon: BellRing,
    title: "Never miss a dose",
    body: "Medication schedules with reminders, so you and your family know the important ones were taken.",
  },
  {
    icon: FileHeart,
    title: "Reports, ready for your doctor",
    body: "Keep lab results and prescriptions together and share them with a time-limited QR code.",
  },
  {
    icon: Users,
    title: "Family in the loop",
    body: "Invite a caretaker to see what you choose, and alert them when a reading needs attention.",
  },
  {
    icon: Activity,
    title: "An assistant that knows your history",
    body: "Ask questions about your readings, medicines and reports, with clear guidance on when to seek care.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Your data is visible only to you and the people you invite. No passwords to leak: sign in with a one-time code.",
  },
];

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-red-600/20 blur-3xl filter" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-red-600/20 blur-3xl filter" />
      </div>

      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-red-900/30 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-2xl font-bold">
            Healthcare<span className="text-red-600">.AI</span>
          </span>
          <Link
            to="/login"
            className="inline-flex items-center rounded-full border border-red-600 px-4 py-2 text-sm font-medium transition-all duration-300 hover:bg-red-600/10"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="relative pb-16 pt-32 text-center sm:pt-40">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <MedicalAnimation />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 mx-auto max-w-6xl space-y-12 px-4 pt-20"
        >
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-red-500 md:text-base">
              Heart health, managed together
            </p>
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-8xl">
              Healthcare
              <span className="animate-pulse-glow ml-2 inline-block text-red-600 sm:ml-4">.AI</span>
            </h1>
          </div>

          <p className="glass-effect mx-auto max-w-3xl rounded-2xl border border-white/10 p-6 text-lg leading-relaxed text-gray-300 backdrop-blur-lg sm:p-8 md:text-2xl">
            A companion for people living with heart conditions and the family who care for them: track your readings,
            stay on top of medicines, keep reports in one place, and get{" "}
            <span className="font-semibold text-red-500">AI guidance grounded in your own data</span>.
          </p>

          <div className="flex flex-col items-center justify-center gap-6 pt-4 sm:flex-row">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/login"
                className="group inline-flex items-center rounded-full bg-gradient-to-r from-red-600 to-red-500 px-12 py-4 text-lg font-semibold shadow-lg transition-all duration-300 hover:shadow-red-500/50"
              >
                Launch platform
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </motion.div>
            <motion.a
              href="#learn-more"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group inline-flex items-center rounded-full border-2 border-red-600/50 px-12 py-4 text-lg font-semibold transition-all duration-300 hover:border-red-600 hover:bg-red-600/10"
            >
              Learn more
              <ChevronDown className="ml-2 h-5 w-5 transition-transform group-hover:translate-y-1" aria-hidden="true" />
            </motion.a>
          </div>
        </motion.div>
        </div>
      </section>

      <section id="learn-more" className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-4 pb-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">What you can do</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <Icon className="h-8 w-8 text-red-500" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-gray-300">{body}</p>
            </motion.div>
          ))}
        </div>
        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-gray-500">
          Healthcare.AI supports, but doesn't replace, your doctor. In an emergency, call your local emergency number.
        </p>
      </section>
    </div>
  );
}
