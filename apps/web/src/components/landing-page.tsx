"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Activity,
  Zap,
  Palette,
  Film,
  Music,
  Users,
  Sparkles,
  Play,
  ArrowRight
} from "lucide-react"
import { RayboxLogo } from "@/components/ui/phonoglyph-logo"

export interface LandingPageProps {
  user: any | null
}

const LandingPage = React.forwardRef<HTMLDivElement, LandingPageProps>(
  ({ user }, ref) => {
    const features = [
      {
        title: "Audio Analysis",
        description: "Real-time tempo, frequency bands, amplitude dynamics, and onset detection. Your music drives every visual.",
        icon: Activity,
        gradient: "from-purple-500 to-indigo-500"
      },
      {
        title: "Generative Engine",
        description: "Procedural Three.js + GLSL shaders create rich, layered visuals that feel alive and unique to your sound.",
        icon: Sparkles,
        gradient: "from-indigo-500 to-blue-500"
      },
      {
        title: "Creative Controls",
        description: "Palettes, camera motion, modulation depth, timing curves, layer blending. Make visuals that are distinctly yours.",
        icon: Palette,
        gradient: "from-blue-500 to-cyan-500"
      },
      {
        title: "Beat-Synced Export",
        description: "Export rhythm-aligned videos in 9:16, 1:1, or 16:9. Ready for TikTok, Instagram, and YouTube.",
        icon: Film,
        gradient: "from-pink-500 to-purple-500"
      }
    ]

    const userTypes = [
      {
        icon: Music,
        title: "Producers & Artists",
        description: "Preview tracks and release-ready visuals for social"
      },
      {
        icon: Users,
        title: "Labels & Collectives",
        description: "Consistent visual identity across your roster"
      },
      {
        icon: Zap,
        title: "Promoters & Venues",
        description: "Eye-catching assets for lineups and campaigns"
      }
    ]

    // Load Unicorn Studio script on mount
    React.useEffect(() => {
      if (typeof window !== 'undefined' && !(window as any).UnicornStudio) {
        (window as any).UnicornStudio = { isInitialized: false };
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.0/dist/unicornStudio.umd.js';
        script.onload = () => {
          if (!(window as any).UnicornStudio.isInitialized) {
            (window as any).UnicornStudio.init();
            (window as any).UnicornStudio.isInitialized = true;
          }
        };
        document.body.appendChild(script);
      }
    }, []);

    return (
      <div ref={ref} className="min-h-screen bg-gradient-mesh">
        {/* Hero Section */}
        <section className="relative min-h-screen overflow-hidden">
          {/* Unicorn Studio Embed Background */}
          <div className="absolute inset-0 z-0">
            <div
              data-us-project="VVD55LuzRG0rB9MdZAq7"
              className="w-full h-full"
              style={{ minWidth: '100%', minHeight: '100%' }}
            />
          </div>

          {/* Ambient glow overlay */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
            <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px]" />
          </div>

          {/* Hero Content - Left Aligned */}
          <div className="container mx-auto px-4 lg:px-8 relative z-10 min-h-screen flex items-center">
            <motion.div
              className="text-left max-w-2xl py-24 lg:py-32"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-dark mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-gray-300 font-sans">Now in Early Access</span>
              </motion.div>

              <motion.h1
                className="text-5xl lg:text-7xl font-display font-bold text-white mb-6 leading-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Music to Motion.
                <br />
                <span className="text-gradient">Your Sound, Visualized.</span>
              </motion.h1>

              <motion.p
                className="text-xl lg:text-2xl text-gray-400 mb-10 max-w-xl font-sans leading-relaxed"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Raybox turns audio into stunning, beat-synced visuals.
                No TouchDesigner. No After Effects. Just upload and create.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 items-start"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                {user ? (
                  <Link href="/dashboard">
                    <button className="btn-gradient px-8 py-4 text-lg flex items-center gap-2">
                      Go to Dashboard
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </Link>
                ) : (
                  <>
                    <Link href="/signup">
                      <button className="btn-gradient px-8 py-4 text-lg flex items-center gap-2">
                        Start Creating
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </Link>
                    <Link href="/creative-visualizer">
                      <button className="btn-ghost-dark px-8 py-4 text-lg flex items-center gap-2">
                        <Play className="w-5 h-5" />
                        Try Demo
                      </button>
                    </Link>
                  </>
                )}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 lg:py-32 relative">
          <div className="container mx-auto px-4 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-5xl font-display font-bold text-white mb-4">
                The full music-to-motion pipeline
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto font-sans">
                Everything you need to create visually distinctive content for release
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="feature-card group"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 font-sans leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Who It's For Section */}
        <section className="py-24 lg:py-32 relative">
          <div className="container mx-auto px-4 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-5xl font-display font-bold text-white mb-4">
                Built for creators who want more
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto font-sans">
                If you've outgrown template-based visualizers but don't want to learn a node graph, Raybox is built for you.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {userTypes.map((type, index) => (
                <motion.div
                  key={type.title}
                  className="text-center p-8 glass-dark rounded-2xl"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <type.icon className="w-7 h-7 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-white mb-2">
                    {type.title}
                  </h3>
                  <p className="text-gray-400 font-sans text-sm">
                    {type.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Differentiator Section */}
        <section className="py-24 lg:py-32 relative">
          <div className="container mx-auto px-4 lg:px-8">
            <motion.div
              className="max-w-4xl mx-auto text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="glass-dark-strong p-12 lg:p-16 rounded-3xl">
                <h2 className="text-3xl lg:text-4xl font-display font-bold text-white mb-6">
                  Your own look, without the grind.
                </h2>
                <p className="text-lg text-gray-400 font-sans mb-8 max-w-2xl mx-auto leading-relaxed">
                  Where template visualizers lock you into one look and TouchDesigner demands weeks of learning,
                  Raybox gives you the creative control of professional tools with the speed and simplicity of a modern web app.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {user ? (
                    <Link href="/dashboard">
                      <button className="btn-gradient px-8 py-4 text-lg flex items-center gap-2 mx-auto">
                        Continue Creating
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/signup">
                        <button className="btn-gradient px-8 py-4 text-lg flex items-center gap-2">
                          Get Started Free
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </Link>
                      <Link href="/creative-visualizer">
                        <button className="btn-ghost-dark px-8 py-4 text-lg flex items-center gap-2">
                          <Play className="w-5 h-5" />
                          Explore Demo
                        </button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-white/5">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <RayboxLogo size="sm" className="text-white" />
              </div>
              <div className="flex items-center gap-8 text-sm text-gray-500 font-sans">
                <Link href="/privacy" className="hover:text-gray-300 transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-gray-300 transition-colors">
                  Terms
                </Link>
                <a
                  href="mailto:hello@raybox.io"
                  className="hover:text-gray-300 transition-colors"
                >
                  Contact
                </a>
              </div>
              <p className="text-sm text-gray-600 font-sans">
                © 2026 Raybox. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    )
  }
)
LandingPage.displayName = "LandingPage"

export { LandingPage }