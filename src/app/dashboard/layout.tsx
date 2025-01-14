'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react'
import { format } from 'date-fns'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [username, setUsername] = useState('')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/')
    } else {
      setUsername(user)
    }
    // 讀取深色模式設置
    setDarkMode(localStorage.getItem('darkMode') === 'true')
  }, [router])

  // 更新時間
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 切換深色模式
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', String(newDarkMode))
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className="flex h-screen dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`relative ${isSidebarCollapsed ? 'w-8 h-8' : 'w-10 h-10'}`}>
              <Image
                src="/logo.jpg"
                alt="Logo"
                fill
                className="object-contain"
              />
            </div>
            {!isSidebarCollapsed && (
              <h2 className="text-xl font-semibold dark:text-white">維修資產追蹤</h2>
            )}
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-5 h-5 dark:text-gray-200" />
            ) : (
              <ChevronLeft className="w-5 h-5 dark:text-gray-200" />
            )}
          </button>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded-md ${
                  isSidebarCollapsed ? 'justify-center' : ''
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                {!isSidebarCollapsed && <span>資產追蹤</span>}
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between h-10">
              <div className="flex items-center gap-6">
                <div className="text-lg dark:text-white">
                  <span className="font-bold">使用者：</span>
                  <span className="text-gray-700 dark:text-gray-200">{username}</span>
                </div>
                <div className="text-lg dark:text-white">
                  <span className="font-bold">現在時間：</span>
                  <span className="text-gray-700 dark:text-gray-200">{format(currentTime, 'yyyy/MM/dd HH:mm:ss')}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={darkMode ? '切換淺色模式' : '切換深色模式'}
                >
                  {darkMode ? (
                    <Sun className="w-5 h-5 text-gray-600 dark:text-gray-200" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('user')
                    router.push('/')
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-200 hover:text-gray-800 dark:hover:text-white"
                >
                  登出
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
} 