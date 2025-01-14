'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { format, startOfYear, endOfYear } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart
} from 'recharts'

interface AssetStats {
  total: number
  pending: number
  completed: number
  monthlyStats: {
    month: string
    count: number
    trend: number
  }[]
  statusDistribution: {
    status: string
    count: number
  }[]
  topItems: {
    name: string
    count: number
    rank: number
  }[]
}

// 狀態映射表
const STATUS_MAP: { [key: string]: string } = {
  'pending': '待維修',
  'completed': '已完成維修'
}

// 更新配色方案
const CHART_COLORS = {
  // 狀態分布圖配色
  status: [
    '#3B82F6',    // 藍色 - 待維修
    '#22C55E',    // 綠色 - 已完成
  ],
  // 趨勢圖配色
  trend: {
    bar: '#3B82F6',          // 藍色
    line: '#EC4899'          // 粉色
  },
  // 卡片數字配色
  cards: {
    total: 'text-blue-700 dark:text-blue-400',
    pending: 'text-orange-600 dark:text-orange-400',
    completed: 'text-green-600 dark:text-green-400'
  }
}

// 自定義工具提示
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-300">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
            {entry.name === '月度數量' ? '件' : ''}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// 自定義卡片組件
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 rounded-lg ${className}`}>
    {children}
  </div>
)

// 自定義標題組件
const Title = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`text-lg font-semibold ${className}`}>
    {children}
  </h3>
)

export default function StatisticsPage() {
  const [stats, setStats] = useState<AssetStats>({
    total: 0,
    pending: 0,
    completed: 0,
    monthlyStats: [],
    statusDistribution: [],
    topItems: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        const supabase = createClient()
        
        // 獲取總數和狀態分佈
        const { data: statusData, error: statusError } = await supabase
          .from('assets')
          .select('status, name')
        
        if (statusError) throw new Error(statusError.message)
        
        if (statusData) {
          const total = statusData.length
          const pending = statusData.filter(item => item.status === 'pending').length
          const completed = statusData.filter(item => item.status === 'completed').length
          
          // 計算狀態分佈
          const statusCounts = {
            '待維修': pending,
            '已完成維修': completed
          }

          const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count
          }))

          // 計算品項排名
          const itemCounts = statusData.reduce((acc: { [key: string]: number }, item) => {
            acc[item.name] = (acc[item.name] || 0) + 1
            return acc
          }, {})

          const topItems = Object.entries(itemCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map((item, index) => ({
              ...item,
              rank: index + 1
            }))

          // 獲取本年度的資料
          const currentYear = 2025 // 設定為2025年
          const yearStart = startOfYear(new Date(currentYear, 0, 1))
          const yearEnd = endOfYear(new Date(currentYear, 0, 1))

          const { data: monthlyData, error: monthlyError } = await supabase
            .from('assets')
            .select('created_at')
            .gte('created_at', yearStart.toISOString())
            .lte('created_at', yearEnd.toISOString())
            .order('created_at')

          if (monthlyError) throw new Error(monthlyError.message)

          // 生成本年度12個月的月份列表
          const monthlyStats = Array.from({ length: 12 }, (_, i) => {
            return {
              month: format(new Date(currentYear, i, 1), 'yyyy年MM月', { locale: zhTW }),
              count: 0,
              trend: 0
            }
          })

          // 填充實際數據
          monthlyData?.forEach(item => {
            const itemDate = new Date(item.created_at)
            const monthKey = format(itemDate, 'yyyy年MM月', { locale: zhTW })
            const monthStat = monthlyStats.find(m => m.month === monthKey)
            if (monthStat) {
              monthStat.count++
            }
          })

          // 計算趨勢線
          let runningTotal = 0
          monthlyStats.forEach((stat, index) => {
            runningTotal += stat.count
            stat.trend = runningTotal / (index + 1)
          })

          setStats({
            total,
            pending,
            completed,
            monthlyStats,
            statusDistribution,
            topItems
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '發生錯誤')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-gray-600 dark:text-gray-400">
          載入中...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600 dark:text-red-400">
          錯誤：{error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">統計分析</h1>
      
      {/* 概覽卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <Title className="text-gray-800 dark:text-white">總資產數量</Title>
          <p className={`text-4xl font-bold mt-4 ${CHART_COLORS.cards.total}`}>{stats.total}</p>
        </Card>
        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <Title className="text-gray-800 dark:text-white">待維修</Title>
          <p className={`text-4xl font-bold mt-4 ${CHART_COLORS.cards.pending}`}>{stats.pending}</p>
        </Card>
        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <Title className="text-gray-800 dark:text-white">已完成維修</Title>
          <p className={`text-4xl font-bold mt-4 ${CHART_COLORS.cards.completed}`}>{stats.completed}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 狀態分佈圖表 */}
        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <Title className="text-gray-800 dark:text-white mb-4">資產狀態分佈</Title>
          <div className="mt-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name} (${value}件, ${(percent * 100).toFixed(0)}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                  >
                    {stats.statusDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS.status[index % CHART_COLORS.status.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* 月度趨勢圖表 */}
        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <Title className="text-gray-800 dark:text-white mb-4">2025年度資產趨勢</Title>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="month" 
                  className="text-gray-600 dark:text-gray-300"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  className="text-gray-600 dark:text-gray-300"
                  tick={{ fill: 'currentColor' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  name="月度數量" 
                  fill={CHART_COLORS.trend.bar} 
                  barSize={20} 
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  name="平均趨勢"
                  stroke={CHART_COLORS.trend.line}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 品項排名圖表 */}
        <Card className="bg-white dark:bg-gray-800 shadow-md lg:col-span-2">
          <Title className="text-gray-800 dark:text-white mb-4">品項維修次數排名 (Top 10)</Title>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  type="number"
                  className="text-gray-600 dark:text-gray-300"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  width={200}
                  className="text-gray-600 dark:text-gray-300"
                  tick={{ fill: 'currentColor' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-gray-600 dark:text-gray-300">
                            {`第 ${data.rank} 名：${data.name}`}
                          </p>
                          <p className="text-gray-600 dark:text-gray-300">
                            {`維修次數：${data.count} 次`}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill={CHART_COLORS.trend.bar}
                  name="維修次數"
                >
                  {stats.topItems.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={`hsl(${210 + (index * 10)}, 100%, 50%)`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
} 