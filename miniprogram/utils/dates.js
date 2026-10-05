function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

function today() {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

function todayParts() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), weekday: d.getDay() }
}

function isoWeek() {
  const d = new Date()
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNr = (t.getUTCDay() + 6) % 7
  t.setUTCDate(t.getUTCDate() - dayNr + 3)
  const firstThu = t.valueOf()
  const isoYear = t.getUTCFullYear()
  t.setUTCMonth(0, 1)
  if (t.getUTCDay() !== 4) t.setUTCMonth(0, 1 + ((4 - t.getUTCDay()) + 7) % 7)
  const w = 1 + Math.ceil((firstThu - t) / 604800000)
  return isoYear + '-W' + pad(w)
}

function currentMonth() {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1)
}

function currentYear() {
  return String(new Date().getFullYear())
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function periodKey(type) {
  if (type === 'daily') return today()
  if (type === 'weekly') return isoWeek()
  if (type === 'monthly') return currentMonth()
  if (type === 'annual') return currentYear()
  return null
}

function isDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false
  const date = new Date(value + 'T00:00:00Z')
  return !isNaN(date) && date.toISOString().slice(0, 10) === value
}

const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function wdName(n) {
  return WD[((Number(n) % 7) + 7) % 7]
}

function friendlyDate(s) {
  if (!s) return ''
  const d = new Date(s + 'T00:00:00Z')
  if (isNaN(d)) return s
  const td = new Date(today() + 'T00:00:00Z')
  const diff = Math.round((d - td) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === -1) return '昨天'
  if (diff > 0 && diff <= 7) return diff + ' 天后'
  if (diff < 0 && diff >= -7) return (-diff) + ' 天前'
  return (d.getUTCMonth() + 1) + '月' + d.getUTCDate() + '日'
}

function isDone(todo) {
  if (todo.type === 'once') return !!todo.completed
  const k = periodKey(todo.type)
  return !!(k && todo.completions && todo.completions[k])
}

function isOverdue(todo) {
  return todo.type === 'once' && !todo.completed && todo.due_date && todo.due_date < today()
}

function dailyStreak(todo) {
  if (todo.type !== 'daily' || !todo.completions) return 0
  let n = 0
  const d = new Date()
  const anchor = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const cursor = new Date(anchor)
  for (;;) {
    const key = cursor.getUTCFullYear() + '-' + pad(cursor.getUTCMonth() + 1) + '-' + pad(cursor.getUTCDate())
    if (todo.completions[key]) {
      n++
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    } else {
      break
    }
  }
  return n
}

function occursToday(todo) {
  const td = today()
  const parts = todayParts()
  if (todo.type === 'daily') return true
  if (todo.type === 'once') return !!(todo.due_date && todo.due_date <= td && !todo.completed)
  if (todo.type === 'weekly') return (todo.week_day == null ? 1 : todo.week_day) === parts.weekday
  if (todo.type === 'monthly') return (todo.month_day || 1) === Number(td.slice(8, 10))
  if (todo.type === 'annual') {
    return (todo.annual_month || 1) === Number(td.slice(5, 7)) && (todo.annual_day || 1) === Number(td.slice(8, 10))
  }
  return false
}

function sortTodos(a, b) {
  const da = a.due_date || '9999-12-31'
  const db = b.due_date || '9999-12-31'
  if (da !== db) return da < db ? -1 : 1
  if (a.sort_key !== b.sort_key) return (a.sort_key || 1000) - (b.sort_key || 1000)
  return (a.id || 0) - (b.id || 0)
}

const TYPE_META = {
  once: { label: '备忘录', icon: '📌' },
  daily: { label: '每日待办', icon: '☀️' },
  weekly: { label: '每周待办', icon: '📅' },
  monthly: { label: '每月待办', icon: '🗓️' },
  annual: { label: '每年待办', icon: '🎂' },
}

const TYPE_LIST = ['once', 'daily', 'weekly', 'monthly', 'annual']

module.exports = {
  pad,
  today,
  todayParts,
  isoWeek,
  currentMonth,
  currentYear,
  daysInMonth,
  periodKey,
  isDateKey,
  wdName,
  friendlyDate,
  isDone,
  isOverdue,
  dailyStreak,
  occursToday,
  sortTodos,
  TYPE_META,
  TYPE_LIST,
}
