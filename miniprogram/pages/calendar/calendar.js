const dates = require('../../utils/dates')
const store = require('../../utils/store')
const eventsStore = require('../../utils/events')
const auth = require('../../utils/auth')
const cal = require('../../utils/calendar')
const { colorOf } = cal

Page({
  data: {
    loggedOut: false,
    loading: true,
    anchorIso: '',
    rangeTitle: '',
    days: [],
    hourLabels: [],
    gridHeight: 0,
  },

  onLoad() {
    const hourLabels = []
    for (let h = cal.CAL_START_HOUR; h < cal.CAL_END_HOUR; h++) {
      hourLabels.push((h < 10 ? '0' + h : h) + ':00')
    }
    this.setData({
      anchorIso: dates.today(),
      hourLabels,
      gridHeight: (cal.CAL_END_HOUR - cal.CAL_START_HOUR) * cal.CAL_HOUR_H,
    })
  },

  onShow() {
    this.refresh()
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
      this._todos = todos
      this._events = events
      this.render()
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: this.errText(e), icon: 'none' })
    }
  },

  render() {
    const days = cal.weekDates(this.data.anchorIso)
    const view = cal.buildWeekView(days, this._todos || [], this._events || [])
    const rendered = view.map(day => ({
      ...day,
      allDay: day.allDay.map(item => ({
        ...item,
        style: item.kind === 'event'
          ? 'background:' + colorOf(item.color).bg + ';color:' + colorOf(item.color).fg
          : '',
      })),
      timed: day.timed.map(item => {
        const c = colorOf(item.color)
        return {
          ...item,
          style: 'top:' + item.top + 'px;height:' + item.height + 'px;background:' + c.bg + ';color:' + c.fg + ';border-left-color:' + c.border,
        }
      }),
    }))
    const first = days[0]
    const last = days[6]
    const rangeTitle = Number(first.iso.slice(5, 7)) + '月' + Number(first.iso.slice(8, 10)) + '日 – ' + Number(last.iso.slice(5, 7)) + '月' + Number(last.iso.slice(8, 10)) + '日'
    this.setData({ days: rendered, rangeTitle, loading: false })
  },

  errText(e) {
    const msg = (e && (e.message || e.errMsg)) || ''
    if (/401|unauthenticated|invalid_grant/i.test(msg)) return '登录已过期，请到「我的」重新登录'
    if (/network|timeout|fail/i.test(msg)) return '网络异常，请稍后重试'
    return '加载失败，下拉重试'
  },

  onPrevWeek() {
    this.setData({ anchorIso: cal.shiftWeek(this.data.anchorIso, -1) })
    this.render()
  },

  onNextWeek() {
    this.setData({ anchorIso: cal.shiftWeek(this.data.anchorIso, 1) })
    this.render()
  },

  onToday() {
    this.setData({ anchorIso: dates.today() })
    this.render()
  },

  onEventTap(e) {
    const { kind, id } = e.currentTarget.dataset
    if (kind === 'event') {
      wx.navigateTo({ url: '/pages/event-edit/event-edit?id=' + id })
    } else {
      wx.navigateTo({ url: '/pages/edit/edit?id=' + id })
    }
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/event-edit/event-edit' })
  },

  onPullDownRefresh() {
    this.refresh().then(() => wx.stopPullDownRefresh())
  },
})
