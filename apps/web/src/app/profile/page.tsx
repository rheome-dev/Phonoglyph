'use client'

import { Suspense } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { UserDisplay } from '@/components/auth/profile-menu'

function ProfilePageContent() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <UserDisplay />
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">User Profile</h2>
            <p className="text-gray-600">
              This is a protected route that requires authentication.
              You can only see this page if you're logged in.
            </p>
            
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
              <p className="text-sm text-gray-500">
                Your account details are managed through your authentication provider.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading profile...</p>
        </div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  )
} 