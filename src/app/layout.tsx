'use client'

import { useState, useEffect } from 'react'
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // 從 localStorage 讀取主題設置
    const isDark = localStorage.getItem('darkMode') === 'true'
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  // 切換深色模式
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', String(newDarkMode))
    document.documentElement.classList.toggle('dark')
  }

  return (
    <html lang="zh-TW" className={darkMode ? 'dark' : ''}>
      <body className={`${inter.className} dark:bg-gray-900`}>
        <main className="min-h-screen bg-gray-100 dark:bg-gray-900">
          {children}
        </main>
      </body>
    </html>
  )
}
