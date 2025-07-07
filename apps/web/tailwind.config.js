/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))'
  		},
  		backdropBlur: {
  			xs: '2px',
  			'4xl': '72px',
  		},
  		animation: {
  			'glass-pulse': 'glassPulse 2s ease-in-out infinite',
  			'fade-in': 'fadeIn 0.5s ease-in-out',
  			'slide-up': 'slideUp 0.3s ease-out',
  			'pulse': 'pulse 2s infinite',
  		},
  		boxShadow: {
  			'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
  			'glass-strong': '0 12px 40px rgba(0, 0, 0, 0.15)',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			// Design System Colors
  			stone: {
  				'50': 'var(--stone-50)',
  				'100': 'var(--stone-100)',
  				'200': 'var(--stone-200)',
  				'300': 'var(--stone-300)',
  				'400': 'var(--stone-400)',
  				'500': 'var(--stone-500)',
  				'600': 'var(--stone-600)',
  				'700': 'var(--stone-700)',
  				'800': 'var(--stone-800)',
  				'900': 'var(--stone-900)',
  			},
  			slate: {
  				primary: 'var(--color-slate-primary)',
  				light: 'var(--color-slate-light)',
  			},
  			sage: {
  				accent: 'var(--color-sage-accent)',
  				viz: 'var(--color-sage-viz)',
  			},
  			terracotta: {
  				accent: 'var(--color-terracotta-accent)',
  			},
  			amber: {
  				muted: 'var(--color-amber-muted)',
  			},
  			lavender: {
  				accent: 'var(--color-lavender-accent)',
  			},
  			viz: {
  				slate: 'var(--color-slate-viz)',
  				'dusty-rose': 'var(--color-dusty-rose-viz)',
  				'warm-gray': 'var(--color-warm-gray-viz)',
  				'soft-blue': 'var(--color-soft-blue-viz)',
  			},
  			'lcd-green': '#b6fcb6',
  			'lcd-dark': '#232b22',
  		},
  		fontFamily: {
  			mono: ['var(--font-mono)'],
  			sans: ['var(--font-sans)'],
  			display: ['var(--font-display)'],
  		},
  		fontSize: {
  			xs: ['var(--text-xs)', { lineHeight: '1.4' }],
  			sm: ['var(--text-sm)', { lineHeight: '1.4' }],
  			base: ['var(--text-base)', { lineHeight: '1.6' }],
  			lg: ['var(--text-lg)', { lineHeight: '1.6' }],
  			xl: ['var(--text-xl)', { lineHeight: '1.4' }],
  			'2xl': ['var(--text-2xl)', { lineHeight: '1.2' }],
  			'3xl': ['var(--text-3xl)', { lineHeight: '1.1' }],
  			'4xl': ['var(--text-4xl)', { lineHeight: '1.1' }],
  			'5xl': ['var(--text-5xl)', { lineHeight: '1.0' }],
  			'6xl': ['var(--text-6xl)', { lineHeight: '1.0' }],
  		},
  		spacing: {
  			xs: 'var(--spacing-xs)',
  			sm: 'var(--spacing-sm)',
  			md: 'var(--spacing-md)',
  			lg: 'var(--spacing-lg)',
  			xl: 'var(--spacing-xl)',
  			'2xl': 'var(--spacing-2xl)',
  			'3xl': 'var(--spacing-3xl)',
  		},
  		dropShadow: {
  			lcd: '0 0 2px #b6fcb6, 0 0 4px #b6fcb6',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
} 