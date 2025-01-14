'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { createClient } from '@supabase/supabase-js'
import { format, addDays, addMonths, isSameDay } from 'date-fns'
import { Search,  Wrench, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

// 初始化 Supabase 客戶端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface Asset {
  id: number
  asset_number: string
  name: string
  tracking_date: string
  status: 'pending' | 'completed'
  completion_date?: string
  completed_by?: string
}

interface QuickDate {
  label: string
  days?: number
  months?: number
}

const quickDates: QuickDate[] = [
  { label: '明日追蹤', days: 1 },
  { label: '一週後', days: 7 },
  { label: '兩週後', days: 14 },
  { label: '一個月', months: 1 },
  { label: '一個半月', months: 1.5 },
]

interface SortConfig {
  key: keyof Asset | null
  direction: 'asc' | 'desc'
}

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [showTomorrowOnly, setShowTomorrowOnly] = useState(false)
  const [showAllStatus, setShowAllStatus] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [assetSuggestions, setAssetSuggestions] = useState<{
    numbers: string[]
    names: string[]
  }>({ numbers: [], names: [] })
  const [showSuggestions, setShowSuggestions] = useState<{
    numbers: boolean
    names: boolean
  }>({ numbers: false, names: false })
  const [newAsset, setNewAsset] = useState({
    asset_number: '',
    name: '',
    tracking_date: format(new Date(), 'yyyy-MM-dd'),
  })
  const assetNumberInputRef = useRef<HTMLInputElement>(null)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<{
    numbers: number
    names: number
  }>({ numbers: -1, names: -1 })
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc'
  })

  // 當表單打開時自動聚焦到財產編號輸入框
  useEffect(() => {
    if (showAddForm && assetNumberInputRef.current) {
      assetNumberInputRef.current.focus()
    }
  }, [showAddForm])

  // 載入資產數據和建議選項
  const loadAssets = async () => {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('tracking_date', { ascending: true })

    if (error) {
      console.error('Error loading assets:', error)
      return
    }

    setAssets(data || [])

    // 更新建議選項
    const uniqueNumbers = [...new Set(data?.map(a => a.asset_number) || [])]
    const uniqueNames = [...new Set(data?.map(a => a.name) || [])]
    setAssetSuggestions({
      numbers: uniqueNumbers,
      names: uniqueNames
    })
  }

  useEffect(() => {
    loadAssets()
  }, [])

  // 篩選資產
  const filteredAssets = assets
    .filter((asset) => {
      // 狀態篩選
      if (!showAllStatus && asset.status === 'completed') {
        return false
      }
      
      // 明日追蹤篩選
      if (showTomorrowOnly && !isSameDay(new Date(asset.tracking_date), addDays(new Date(), 1))) {
        return false
      }

      // 搜尋關鍵字篩選
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          asset.asset_number.toLowerCase().includes(query) ||
          asset.name.toLowerCase().includes(query)
        )
      }

      return true
    })

  // 排序功能
  const handleSort = (key: keyof Asset) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // 獲取排序圖標
  const getSortIcon = (key: keyof Asset) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 ml-1" />
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1" /> : 
      <ArrowDown className="w-4 h-4 ml-1" />
  }

  // 排序資產
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    if (!sortConfig.key) return 0

    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]

    if (aValue === undefined || bValue === undefined) return 0

    let comparison = 0
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue)
    } else {
      comparison = aValue > bValue ? 1 : -1
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison
  })

  // 處理快速日期選擇
  const handleQuickDate = (quickDate: QuickDate) => {
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
    setNewAsset({
      ...newAsset,
      tracking_date: format(newDate, 'yyyy-MM-dd'),
    })
  }

  // 新增資產
  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('assets').insert([
      {
        ...newAsset,
        status: 'pending',
      },
    ])

    if (error) {
      console.error('Error adding asset:', error)
      return
    }

    setShowAddForm(false)
    setNewAsset({
      asset_number: '',
      name: '',
      tracking_date: format(new Date(), 'yyyy-MM-dd'),
    })
    loadAssets()
  }

  // 更新資產狀態為已修復
  const handleComplete = async (id: number) => {
    try {
      const user = localStorage.getItem('user')
      const { error } = await supabase
        .from('assets')
        .update({
          status: 'completed',
          completion_date: new Date().toISOString(),
          completed_by: user
        })
        .eq('id', id)

      if (error) {
        console.error('Error updating asset:', error.message)
        return
      }

      await loadAssets()
    } catch (err) {
      console.error('Error in handleComplete:', err)
    }
  }

  // 更新資產狀態為待維修
  const handleRevertToPending = async (id: number) => {
    try {
      const { error } = await supabase
        .from('assets')
        .update({
          status: 'pending',
          completion_date: null,
          completed_by: null
        })
        .eq('id', id)

      if (error) {
        console.error('Error reverting asset:', error.message)
        return
      }

      await loadAssets()
    } catch (err) {
      console.error('Error in handleRevertToPending:', err)
    }
  }

  // 過濾建議選項
  const filterSuggestions = (type: 'numbers' | 'names', value: string) => {
    return assetSuggestions[type].filter(item =>
      item.toLowerCase().includes(value.toLowerCase())
    )
  }

  // 處理鍵盤事件
  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    type: 'numbers' | 'names',
    suggestions: string[]
  ) => {
    if (!showSuggestions[type] || !suggestions.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => ({
          ...prev,
          [type]: Math.min(prev[type] + 1, suggestions.length - 1)
        }))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => ({
          ...prev,
          [type]: Math.max(prev[type] - 1, -1)
        }))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex[type] >= 0) {
          const selectedValue = suggestions[selectedSuggestionIndex[type]]
          setNewAsset(prev => ({ ...prev, [type === 'numbers' ? 'asset_number' : 'name']: selectedValue }))
          setShowSuggestions(prev => ({ ...prev, [type]: false }))
          setSelectedSuggestionIndex(prev => ({ ...prev, [type]: -1 }))
        }
        break
      case 'Escape':
        setShowSuggestions(prev => ({ ...prev, [type]: false }))
        setSelectedSuggestionIndex(prev => ({ ...prev, [type]: -1 }))
        break
    }
  }

  // 當建議列表關閉時重置選中索引
  useEffect(() => {
    if (!showSuggestions.numbers) {
      setSelectedSuggestionIndex(prev => ({ ...prev, numbers: -1 }))
    }
    if (!showSuggestions.names) {
      setSelectedSuggestionIndex(prev => ({ ...prev, names: -1 }))
    }
  }, [showSuggestions])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-extrabold dark:text-white">待修資產列表</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            新增資產
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* 搜尋框 */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋財產編號或品項名稱..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm"
            />
          </div>

          {/* 篩選開關 */}
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={showTomorrowOnly}
                  onChange={(e) => setShowTomorrowOnly(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </div>
              <span className="ms-3 text-sm font-medium text-gray-700">
                {showTomorrowOnly ? '僅顯示明日追蹤項目' : '顯示全部日期'}
              </span>
            </label>

            <label className="inline-flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={showAllStatus}
                  onChange={(e) => setShowAllStatus(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </div>
              <span className="ms-3 text-sm font-medium text-gray-700">
                {showAllStatus ? '顯示所有狀態' : '僅顯示待維修項目'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 新增資產表單 */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg w-[500px]">
            <h3 className="text-xl font-semibold mb-6">新增資產</h3>
            <form onSubmit={handleAddAsset} className="space-y-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  財產編號
                </label>
                <input
                  ref={assetNumberInputRef}
                  type="text"
                  value={newAsset.asset_number}
                  onChange={(e) => {
                    setNewAsset({ ...newAsset, asset_number: e.target.value })
                    setShowSuggestions({ ...showSuggestions, numbers: true })
                    setSelectedSuggestionIndex(prev => ({ ...prev, numbers: -1 }))
                  }}
                  onKeyDown={(e) => handleKeyDown(e, 'numbers', filterSuggestions('numbers', newAsset.asset_number))}
                  onFocus={() => setShowSuggestions({ ...showSuggestions, numbers: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3"
                  required
                />
                {showSuggestions.numbers && newAsset.asset_number && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-auto">
                    {filterSuggestions('numbers', newAsset.asset_number).map((number, index) => (
                      <div
                        key={number}
                        className={`px-4 py-2 cursor-pointer ${
                          index === selectedSuggestionIndex.numbers
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          setNewAsset({ ...newAsset, asset_number: number })
                          setShowSuggestions({ ...showSuggestions, numbers: false })
                        }}
                      >
                        {number}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  品項名稱
                </label>
                <input
                  type="text"
                  value={newAsset.name}
                  onChange={(e) => {
                    setNewAsset({ ...newAsset, name: e.target.value })
                    setShowSuggestions({ ...showSuggestions, names: true })
                    setSelectedSuggestionIndex(prev => ({ ...prev, names: -1 }))
                  }}
                  onKeyDown={(e) => handleKeyDown(e, 'names', filterSuggestions('names', newAsset.name))}
                  onFocus={() => setShowSuggestions({ ...showSuggestions, names: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3"
                  required
                />
                {showSuggestions.names && newAsset.name && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-auto">
                    {filterSuggestions('names', newAsset.name).map((name, index) => (
                      <div
                        key={name}
                        className={`px-4 py-2 cursor-pointer ${
                          index === selectedSuggestionIndex.names
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          setNewAsset({ ...newAsset, name: name })
                          setShowSuggestions({ ...showSuggestions, names: false })
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  預計追蹤日期
                </label>
                <div className="mt-1 space-y-2">
                  <input
                    type="date"
                    value={newAsset.tracking_date}
                    onChange={(e) =>
                      setNewAsset({ ...newAsset, tracking_date: e.target.value })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3"
                    required
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {quickDates.map((quickDate) => (
                      <button
                        key={quickDate.label}
                        type="button"
                        onClick={() => handleQuickDate(quickDate)}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                      >
                        {quickDate.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 資產列表 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[150px] cursor-pointer group"
                onClick={() => handleSort('asset_number')}
              >
                <div className="flex items-center">
                  財產編號
                  <span className="text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {getSortIcon('asset_number')}
                  </span>
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[500px] cursor-pointer group"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  品項名稱
                  <span className="text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {getSortIcon('name')}
                  </span>
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[120px] cursor-pointer group"
                onClick={() => handleSort('tracking_date')}
              >
                <div className="flex items-center">
                  預計追蹤日期
                  <span className="text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {getSortIcon('tracking_date')}
                  </span>
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[100px] cursor-pointer group"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  狀態
                  <span className="text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {getSortIcon('status')}
                  </span>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[300px]">
                修復資訊
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedAssets.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {asset.asset_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {asset.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {format(new Date(asset.tracking_date), 'yyyy-MM-dd')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      asset.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}
                  >
                    {asset.status === 'completed' ? '已修復' : '待維修'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {asset.status === 'pending' ? (
                    <button
                      onClick={() => handleComplete(asset.id)}
                      className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 group transition-colors"
                      title="標記為已修復"
                    >
                      <Wrench className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:text-gray-500 dark:group-hover:text-indigo-400 transition-colors" />
                    </button>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <div className="font-medium">
                          <span className="font-bold dark:text-gray-200">修復時間：</span>
                          {format(new Date(asset.completion_date!), 'yyyy/MM/dd HH:mm:ss')}
                        </div>
                        <div className="font-medium">
                          <span className="font-bold dark:text-gray-200">處理人員：</span>
                          {asset.completed_by}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevertToPending(asset.id)}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 group transition-colors ml-4"
                        title="轉為待維修"
                      >
                        <RotateCcw className="w-5 h-5 text-gray-400 group-hover:text-yellow-600 dark:text-gray-500 dark:group-hover:text-yellow-400 transition-colors" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 