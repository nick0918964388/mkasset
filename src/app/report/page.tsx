'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { format, addDays, addMonths } from 'date-fns'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Camera } from 'lucide-react'

const quickDates = [
  { label: '明日追蹤', days: 1 },
  { label: '一週後', days: 7 },
  { label: '兩週後', days: 14 },
  { label: '一個月', months: 1 },
  { label: '一個半月', months: 1.5 },
]

export default function ReportPage() {
  const [assetNumber, setAssetNumber] = useState('')
  const [name, setName] = useState('')
  const [trackingDate, setTrackingDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear()
      }
    }
  }, [scanner])

  useEffect(() => {
    if (showScanner && scannerRef.current) {
      try {
        const html5QrcodeScanner = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          false
        )
        
        html5QrcodeScanner.render((decodedText) => {
          setAssetNumber(decodedText)
          html5QrcodeScanner.clear()
          setShowScanner(false)
        }, () => {})

        setScanner(html5QrcodeScanner)
      } catch (err) {
        console.error('Error starting scanner:', err)
        alert('無法啟動相機，請確認是否已授權相機權限')
        setShowScanner(false)
      }
    }
  }, [showScanner])

  const startScanner = () => {
    setShowScanner(true)
  }

  const stopScanner = () => {
    if (scanner) {
      scanner.clear()
      setScanner(null)
    }
    setShowScanner(false)
  }

  const handleQuickDate = (quickDate: { days?: number; months?: number }) => {
    let newDate = new Date()
    if (quickDate.days) {
      newDate = addDays(newDate, quickDate.days)
    } else if (quickDate.months) {
      if (quickDate.months === 1.5) {
        newDate = addDays(addMonths(newDate, 1), 15)
      } else {
        newDate = addMonths(newDate, quickDate.months)
      }
    }
    setTrackingDate(format(newDate, 'yyyy-MM-dd'))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('assets')
        .insert([
          {
            asset_number: assetNumber,
            name,
            tracking_date: trackingDate,
            status: 'pending'
          }
        ])

      if (error) throw error

      // 清空表單
      setAssetNumber('')
      setName('')
      setTrackingDate(format(new Date(), 'yyyy-MM-dd'))
      
      alert('回報成功！')
    } catch (error) {
      alert('回報失敗，請稍後再試')
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">快速回報資產</h1>
        
        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg w-[90%] max-w-md">
              <div className="relative">
                <div id="qr-reader" ref={scannerRef} className="w-full"></div>
                <button
                  onClick={stopScanner}
                  className="absolute top-2 right-2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-600 active:bg-red-700"
                >
                  關閉掃描
                </button>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          <div>
            <label className="block text-base font-semibold text-gray-900 mb-2">
              財產編號
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={assetNumber}
                onChange={(e) => setAssetNumber(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                placeholder="請輸入財產編號"
                required
              />
              <button
                type="button"
                onClick={startScanner}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 shadow-md flex items-center justify-center"
                title="掃描 QR Code"
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-900 mb-2">
              品項名稱
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              placeholder="請輸入品項名稱"
              required
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-900 mb-2">
              預計追蹤日期
            </label>
            <input
              type="date"
              value={trackingDate}
              onChange={(e) => setTrackingDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              required
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {quickDates.map((quickDate) => (
                <button
                  key={quickDate.label}
                  type="button"
                  onClick={() => handleQuickDate(quickDate)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 shadow-sm font-medium text-sm"
                >
                  {quickDate.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 text-white font-semibold py-4 px-4 rounded-lg shadow-lg hover:bg-blue-600 active:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 text-lg"
          >
            {isSubmitting ? '提交中...' : '提交回報'}
          </button>
        </form>
      </div>
    </div>
  )
} 