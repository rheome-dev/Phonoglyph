import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { TechnicalButton } from "@/components/ui/technical-button"
import { GlassCard } from "@/components/ui/glass-card"
import { StatusIndicator } from "@/components/ui/status-indicator"

export interface LandingPageProps {
  user: any | null
}

const LandingPage = React.forwardRef<HTMLDivElement, LandingPageProps>(
  ({ user }, ref) => {
    const features = [
      {
        title: "Real-time MIDI Visualization",
        description: "Transform your MIDI files into stunning visual experiences with our advanced rendering engine.",
        icon: "🎵"
      },
      {
        title: "Technical Precision",
        description: "Built for musicians and developers who demand accuracy and control over their visualizations.",
        icon: "⚙️"
      },
      {
        title: "Glassmorphism UI",
        description: "Experience the future of interface design with our cutting-edge glassmorphism aesthetic.",
        icon: "✨"
      }
    ]

    return (
      <div ref={ref} className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
        {/* Hero Section */}
        <section className="relative py-24 lg:py-32 overflow-hidden">
          <div className="container mx-auto px-4 lg:px-8">
            <motion.div
              className="text-center max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.h1
                className="text-5xl lg:text-6xl font-display font-bold text-stone-800 mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                MIDI VISUALIZATION
                <br />
                <span className="text-sage-accent">REIMAGINED</span>
              </motion.h1>
              
              <motion.p
                className="text-xl lg:text-2xl font-mono text-stone-600 mb-8 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Transform your musical data into stunning visual experiences with our technical brutalist aesthetic
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <StatusIndicator status="live" className="mb-4 sm:mb-0">
                  LIVE DEMO AVAILABLE
                </StatusIndicator>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  {user ? (
                    <Link href="/dashboard">
                      <TechnicalButton variant="primary" size="lg">
                        Go to Dashboard
                      </TechnicalButton>
                    </Link>
                  ) : (
                    <>
                      <Link href="/signup">
                        <TechnicalButton variant="primary" size="lg">
                          Get Started
                        </TechnicalButton>
                      </Link>
                      <Link href="/creative-visualizer">
                        <TechnicalButton variant="secondary" size="lg">
                          Try Demo
                        </TechnicalButton>
                      </Link>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white/50">
          <div className="container mx-auto px-4 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-display font-bold text-stone-800 mb-4">
                TECHNICAL EXCELLENCE
              </h2>
              <p className="text-lg font-mono text-stone-600 max-w-2xl mx-auto">
                Built for precision, designed for beauty
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  <GlassCard className="p-8 h-full text-center">
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="text-xl font-display font-bold text-stone-700 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-stone-600 font-sans">
                      {feature.description}
                    </p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <GlassCard className="p-12 max-w-3xl mx-auto">
                <h2 className="text-3xl lg:text-4xl font-display font-bold text-stone-800 mb-6">
                  READY TO VISUALIZE?
                </h2>
                <p className="text-lg font-mono text-stone-600 mb-8">
                  Join the revolution in MIDI visualization technology
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {user ? (
                    <Link href="/dashboard">
                      <TechnicalButton variant="primary" size="lg">
                        Continue Creating
                      </TechnicalButton>
                    </Link>
                  ) : (
                    <>
                      <Link href="/signup">
                        <TechnicalButton variant="primary" size="lg">
                          Start Free Trial
                        </TechnicalButton>
                      </Link>
                      <Link href="/creative-visualizer">
                        <TechnicalButton variant="secondary" size="lg">
                          Explore Demo
                        </TechnicalButton>
                      </Link>
                    </>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </section>
      </div>
    )
  }
)
LandingPage.displayName = "LandingPage"

export { LandingPage } 