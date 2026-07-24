// ===== 季度工具 =====

import type { SeasonInfo } from '@/types'

const SEASON_MONTHS = [1, 4, 7, 10] as const

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function makeSeason(year: number, month: number): SeasonInfo {
  const endMonth = month + 2
  return {
    id: `${year}-${pad(month)}`,
    year,
    month: month as SeasonInfo['month'],
    label: `${year}年${month}月`,
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(endMonth)}-${pad(lastDayOfMonth(year, endMonth))}`,
  }
}

/** 当前日期所属季度 */
export function currentSeason(): SeasonInfo {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const seasonMonth = month <= 3 ? 1 : month <= 6 ? 4 : month <= 9 ? 7 : 10
  return makeSeason(year, seasonMonth)
}

/**
 * 季度列表：以当前季度为中心，给出「过去 past 个季度 + 当前 + 未来 future 个季度」，
 * 按时间倒序排列（最新在前）。
 */
export function seasonList(past = 5, future = 1): SeasonInfo[] {
  const cur = currentSeason()
  const idx = SEASON_MONTHS.indexOf(cur.month as (typeof SEASON_MONTHS)[number])
  const curIndex = cur.year * 4 + idx
  const result: SeasonInfo[] = []
  for (let i = curIndex + future; i >= curIndex - past; i--) {
    const year = Math.floor(i / 4)
    const month = SEASON_MONTHS[i % 4]
    result.push(makeSeason(year, month))
  }
  return result
}

/** Date → 放送星期（1=周一 … 7=周日） */
export function weekdayOf(dateStr?: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const day = d.getDay() // 0=周日 … 6=周六
  return day === 0 ? 7 : day
}

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function weekdayLabel(w: number | null): string {
  if (!w || w < 1 || w > 7) return '周?'
  return WEEKDAY_LABELS[w - 1]
}
