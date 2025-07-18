"use client"

import React from 'react'
import { AutoSaveProvider } from './auto-save-provider'

interface CreativeVisualizerWithAutoSaveProps {
  projectId: string
  children: React.ReactNode
}

export function CreativeVisualizerWithAutoSave({ 
  projectId, 
  children 
}: CreativeVisualizerWithAutoSaveProps) {
  return (
    <AutoSaveProvider projectId={projectId}>
      {children}
    </AutoSaveProvider>
  )
} 