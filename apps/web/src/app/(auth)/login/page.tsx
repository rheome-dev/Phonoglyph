import { LoginForm } from "@/components/auth/login-form"
import { RayboxLogo } from "@/components/ui/phonoglyph-logo"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <RayboxLogo size="lg" className="text-gray-900" />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Visualize your MIDI files with beautiful animations
          </p>
        </div>
        
        <LoginForm />
      </div>
    </div>
  )
} 