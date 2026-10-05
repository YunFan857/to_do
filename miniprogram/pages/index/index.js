const dates = require('../../utils/dates')
const store = require('../../utils/store')
const eventsStore = require('../../utils/events')
const auth = require('../../utils/auth')
const { makeTicker } = require('../../utils/reminder')
const { colorOf } = require('../../utils/calendar')

const ticker = makeTicker()

Page({
  data: {
    loading: true,
    loggedOut: false,
    todayLabel: '',
    todayItems: [],
    doneCount: 0,
    totalCount: 0,
    percent: 0,
    memoList: [],
    todayEvents: [],
    stats: [],
    banner: null,
  },

  onLoad() {
    const d = new Date()
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
    this.setData({
      todayLabel: (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + week,
    })
  },

  onShow() {
    this.refresh()
  },

  onHide() {
    ticker.stop()
  },

  onUnload() {
    ticker.stop()
  },

  async refresh() {
    const session = await auth.getSession()
    if (!session) {
      this.setData({ loggedOut: true, loading: false })
      return
    }
    this.setData({ loggedOut: false, loading: true })
    try {
      const [todos, events] = await Promise.all([store.listTodos(), eventsStore.listEvents()])
      const td = dates.today()

      const items = todos.filter(dates.occursToday).sort(dates.sortTodos)
      const doneCount = items.filter(dates.isDone).length
      const totalCount = items.length

      const memoList = todos
        .filter(t => t.type === 'once' && !t.completed && t.due_date)
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .slice(0, 3)
        .map(t => ({ id: t.id, title: t.title, dateLabel: dates.friendlyDate(t.due_date), overdue: dates.isOverdue(t) }))

      const todayEvents = events
        .filter(ev => ev.date <= td && (ev.end_date || ev.date) >= td && !ev.all_day)
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 3)
        .map(ev => ({ id: ev.id, title: ev.title, start: ev.start, color: colorOf(ev.color) }))

      const stats = dates.TYPE_LIST.map(k => {
        const list = todos.filter(t => t.type === k)
        const done = list.filter(dates.isDone).length
        return { key: k, label: dates.TYPE_META[k].label, icon: dates.TYPE_META[k].icon, total: list.length, done }
      })

      this.setData({
        loading: false,
        todayItems: items,
        doneCount,
        totalCount,
        percent: totalCount ? Math.round(doneCount / totalCount * 100) : 0,
        memoList,
        todayEvents,
        stats,
      })
      this._eventsCache = events
      ticker.start(this)
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: this.errText(e), icon: 'none' })
    }
  },

  fireReminders(toFire) {
    const first = toFire[0]
    const ev = first.ev
    wx.vibrateShort({ type: 'medium' })
    this._eventsCache = (this._eventsCache || []).map(x =>
      x.id === ev.id ? { ...x, reminder: { ...x.reminder, last_fired: first.key } } : x
    )
    this.setData({ banner: { id: ev.id, title: ev.title, start: ev.start } })
  },

  onBannerView() {
    const id = this.data.banner && this.data.banner.id
    this.setData({ banner: null })
    if (id) wx.navigateTo({ url: '/pages/event-edit/event-edit?id=' + id })
  },

  onBannerDismiss() {
    this.setData({ banner: null })
  },

  errText(e) {
    const msg = (e && (e.message || e.errMsg)) || ''
    if (/401|unauthenticated|invalid_grant/i.test(msg)) return '登录已过期，请到「我的」重新登录'
    if (/network|timeout|fail/i.test(msg)) return '网络异常，请稍后重试'
    if (/quota|额度/i.test(msg)) return '云端额度不足'
    return '加载失败，下拉重试'
  },

  async onToggle(e) {
    const id = e.detail.id
    const todo = this.data.todayItems.find(t => t.id === id)
    if (!todo) return
    const done = dates.isDone(todo)
    try {
      if (todo.type === 'once') {
        await store.updateTodo(id, { completed: !done, completions: todo.completions })
      } else {
        const k = dates.periodKey(todo.type)
        const completions = { ...todo.completions }
        if (done) delete completions[k]
        else completions[k] = new Date().toISOString()
        await store.updateTodo(id, { completions, completed: todo.completed })
      }
      this.refresh()
    } catch (err) {
      wx.showToast({ title: this.errText(err), icon: 'none' })
    }
  },

  onEdit(e) {
    wx.navigateTo({ url: '/pages/edit/edit?id=' + e.detail.id })
  },

  onEventTap(e) {
    wx.navigateTo({ url: '/pages/event-edit/event-edit?id=' + e.currentTarget.dataset.id })
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/edit/edit' })
  },

  onPullDownRefresh() {
    this.refresh().then(() => wx.stopPullDownRefresh())
  },
})
