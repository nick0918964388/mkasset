'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachWeekOfInterval, eachMonthOfInterval, eachQuarterOfInterval, eachYearOfInterval } from 'date-fns'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

// 註冊 ChartJS 組件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

// 初始化 Supabase 客戶端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type TimeRange = 'week' | 'month' | 'quarter' | 'year'

interface StatData {
  period: string
  count: number
}

export default function StatisticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('year')
  const [statData, setStatData] = useState<StatData[]>([])

  const fetchStatistics = async () => {
    const now = new Date()
    let startDate: Date
    let endDate: Date
    
    // 根據選擇的時間範圍設定起訖日期
    switch (timeRange) {
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 })
        endDate = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'month':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        endDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0)
        break
      case 'year':
        startDate = startOfYear(now)
        endDate = endOfYear(now)
        break
    }

    // 從 Supabase 獲取資料
    const { data, error } = await supabase
      .from('assets')
      .select('completion_date')
      .eq('status', 'completed')
      .gte('completion_date', startDate.toISOString())
      .lte('completion_date', endDate.toISOString())

    if (error) {
      console.error('Error fetching statistics:', error)
      return
    }

    // 處理資料以生成統計
    let periods: Date[]
    switch (timeRange) {
      case 'week':
        periods = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 })
        break
      case 'month':
        periods = eachMonthOfInterval({ start: startDate, end: endDate })
        break
      case 'quarter':
        periods = eachQuarterOfInterval({ start: startDate, end: endDate })
        break
      case 'year':
        periods = eachYearOfInterval({ start: startDate, end: endDate })
        break
    }

    // 計算每個時期的維修數量
    const stats = periods.map(period => {
      let nextPeriod: Date
      switch (timeRange) {
        case 'week':
          nextPeriod = endOfWeek(period, { weekStartsOn: 1 })
          break
        case 'month':
          nextPeriod = endOfMonth(period)
          break
        case 'quarter':
          nextPeriod = new Date(period.getFullYear(), Math.floor(period.getMonth() / 3) * 3 + 3, 0)
          break
        case 'year':
          nextPeriod = endOfYear(period)
          break
      }

      const count = data.filter(item => {
        const date = new Date(item.completion_date)
        return date >= period && date <= nextPeriod
      }).length

      return {
        period: format(period, getPeriodFormat(timeRange)),
        count
      }
    })

    setStatData(stats)
  }

  // 根據時間範圍獲取日期格式
  const getPeriodFormat = (range: TimeRange): string => {
    switch (range) {
      case 'week':
        return 'MM/dd'
      case 'month':
        return 'MM月'
      case 'quarter':
        return 'yyyy年Q季'
      case 'year':
        return 'yyyy年'
    }
  }

  useEffect(() => {
    fetchStatistics()
  }, [timeRange])

  // 圖表配置
  const chartData = {
    labels: statData.map(d => d.period),
    datasets: [
      {
        label: '已維修數量',
        data: statData.map(d => d.count),
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.5)',
        tension: 0.3
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '維修數量趨勢'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-extrabold dark:text-white">維修統計</h2>
        <div className="flex gap-2">
          {(['week', 'month', 'quarter', 'year'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md ${
                timeRange === range
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {range === 'week' && '週'}
              {range === 'month' && '月'}
              {range === 'quarter' && '季'}
              {range === 'year' && '年'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  )
} 