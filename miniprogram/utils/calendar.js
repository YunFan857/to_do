const { pad, today, todayParts, isDateKey } = require('./dates')

const CAL_START_HOUR = 6
const CAL_END_HOUR = 24
const CAL_HOUR_H = 88
const CAL_EVENT_H = 56

const CAL_COLORS = [
  { key: 'teal', label: '薄荷', bg: '#dff2ea', fg: '#0f766e', border: '#0f766e' },
  { key: 'blue', label: '雾蓝', bg: '#e3edfa', fg: '#2f6cb3', border: '#3f7dcc' },
  { key: 'indigo', label: '靛蓝', bg: '#e6e8f9', fg: '#3f4a9e', border: '#4f5db8' },
  { key: 'purple', label: '淡紫', bg: '#ecebfc', fg: '#534ab7', border: '#6f63d9' },
  { key: 'pink', label: '粉红', bg: '#fbe7ef', fg: '#b23a68', border: '#cf4f81' },
  { key: 'orange', label: '橙红', bg: '#fae9e1', fg: '#b04522', border: '#d85a30' },
  { key: 'amber', label: '鹅黄', bg: '#f9edd2', fg: '#93590a', border: '#b47a10' },
]

function colorOf(key) {
  return CAL_COLORS.find(c => c.key === key) || CAL_COLORS[0]
}

function ymdParts(iso) {
  const p = String(iso || '').split('-')
  return { y: Number(p[0]) || 0, m: Number(p[1]) || 0, d: Number(p[2]) || 0 }
}

function isoOfYMD(y, m, d) {
  return y + '-' + pad(m) + '-' + pad(d)
}

function minutesFromHHMM(s) {
  const p = String(s || '').split(':')
  return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0)
}

function hhmmFromMinutes(m) {
  m = ((m % 1440) + 1440) % 1440
  return pad(Math.floor(m / 60)) + ':' + pad(m % 60)
}

function nowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function weekDates(anchorIso) {
  const anchor = anchorIso || today()
  const p = ymdParts(anchor)
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d))
  const wd = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - wd)
  const days = []
  for (let i = 0; i < 7; i++) {
    const iso = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate())
    days.push({
      iso,
      dom: d.getUTCDate(),
      dow: i,
      isToday: iso === today(),
    })
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return days
}

function shiftWeek(anchorIso, weeks) {
  const p = ymdParts(anchorIso || today())
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d))
  d.setUTCDate(d.getUTCDate() + weeks * 7)
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate())
}

function todoOccursOn(todo, iso) {
  const p = ymdParts(iso)
  const wd = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()
  if (todo.type === 'daily') return true
  if (todo.type === 'once') return !!(todo.due_date && todo.due_date <= iso && !todo.completed)
  if (todo.type === 'weekly') return (todo.week_day == null ? 1 : todo.week_day) === wd
  if (todo.type === 'monthly') return (todo.month_day || 1) === p.d
  if (todo.type === 'annual') return (todo.annual_month || 1) === p.m && (todo.annual_day || 1) === p.d
  return false
}

function eventOccursOnDay(ev, iso) {
  const from = ev.date
  const to = ev.end_date || ev.date
  return from <= iso && to >= iso
}

function buildWeekView(days, todos, events) {
  const TD = today()
  const nowMin = nowMinutes()
  return days.map(day => {
    const allDay = []
    events.forEach(ev => {
      if (ev.all_day && eventOccursOnDay(ev, day.iso)) {
        allDay.push({ kind: 'event', id: ev.id, title: ev.title, color: ev.color || 'teal' })
      }
    })
    todos.forEach(t => {
      if (todoOccursOn(t, day.iso)) {
        allDay.push({ kind: 'todo', id: t.id, title: t.title, type: t.type })
      }
    })
    const timed = []
    events.forEach(ev => {
      if (ev.all_day) return
      if (!eventOccursOnDay(ev, day.iso)) return
      const sm = minutesFromHHMM(ev.start)
      if (sm < CAL_START_HOUR * 60 || sm >= CAL_END_HOUR * 60) return
      timed.push({
        kind: 'event',
        id: ev.id,
        title: ev.title,
        startMin: sm,
        top: (sm - CAL_START_HOUR * 60) / 60 * CAL_HOUR_H,
        height: CAL_EVENT_H,
        color: ev.color || 'teal',
      })
    })
    todos.forEach(t => {
      if (!t.reminder || !t.reminder.time) return
      if (!todoOccursOn(t, day.iso)) return
      const sm = minutesFromHHMM(t.reminder.time)
      if (sm < CAL_START_HOUR * 60 || sm >= CAL_END_HOUR * 60) return
      timed.push({
        kind: 'todo',
        id: t.id,
        title: t.title,
        type: t.type,
        startMin: sm,
        top: (sm - CAL_START_HOUR * 60) / 60 * CAL_HOUR_H,
        height: CAL_EVENT_H,
        color: 'amber',
      })
    })
    const nowLineTop = day.isToday && nowMin >= CAL_START_HOUR * 60 && nowMin < CAL_END_HOUR * 60
      ? (nowMin - CAL_START_HOUR * 60) / 60 * CAL_HOUR_H
      : null
    return { ...day, allDay, timed, nowLineTop }
  })
}

function dayDiff(fromDate, toDate) {
  const from = new Date(fromDate + 'T00:00:00Z')
  const to = new Date(toDate + 'T00:00:00Z')
  return Math.round((to - from) / 86400000)
}

function shortDate(dateKey) {
  if (!isDateKey(dateKey)) return dateKey || ''
  const p = ymdParts(dateKey)
  return p.m + '/' + p.d
}

function buildTimeline(project) {
  const currentDate = today()
  const elapsed = Math.max(0, dayDiff(project.start_date, currentDate))
  const milestones = (project.milestones || []).slice().sort((a, b) =>
    a.date.localeCompare(b.date) || String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
  )
  const points = [{
    kind: 'start',
    date: project.start_date,
    title: '项目正式开始',
    kicker: '项目起点',
    elapsed,
    isToday: false,
  }]
  let previousDate = project.start_date
  milestones.forEach((m, i) => {
    points.push({
      kind: 'milestone',
      date: m.date,
      title: m.title,
      description: m.description || '',
      kicker: '进展节点 ' + (i + 1),
      gapFromPrev: dayDiff(previousDate, m.date),
      gapLabel: i === 0 ? '开始后 ' + dayDiff(previousDate, m.date) + ' 天' : '间隔 ' + dayDiff(previousDate, m.date) + ' 天',
      isToday: m.date === currentDate,
      isPast: m.date < currentDate,
      isFuture: m.date > currentDate,
    })
    previousDate = m.date
  })
  const currentGap = dayDiff(previousDate, currentDate)
  points.push({
    kind: 'today',
    date: currentDate,
    title: '项目进行中',
    kicker: '当前状态',
    gapFromPrev: currentGap,
    gapLabel: (milestones.length ? '间隔 ' : '开始后 ') + currentGap + ' 天',
    elapsed,
    isToday: true,
  })
  return { points, elapsed, day: elapsed + 1 }
}

module.exports = {
  CAL_START_HOUR,
  CAL_END_HOUR,
  CAL_HOUR_H,
  CAL_EVENT_H,
  CAL_COLORS,
  colorOf,
  ymdParts,
  isoOfYMD,
  minutesFromHHMM,
  hhmmFromMinutes,
  nowMinutes,
  weekDates,
  shiftWeek,
  todoOccursOn,
  eventOccursOnDay,
  buildWeekView,
  dayDiff,
  shortDate,
  buildTimeline,
}
