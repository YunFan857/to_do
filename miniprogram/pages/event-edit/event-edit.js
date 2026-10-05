const dates = require('../../utils/dates')
const eventsStore = require('../../utils/events')
const auth = require('../../utils/auth')
const { CAL_COLORS, minutesFromHHMM, hhmmFromMinutes, nowMinutes } = require('../../utils/calendar')

Page({
  data: {
    isEdit: false,
    id: null,
    title: '',
    date: '',
    endDate: '',
    allDay: false,
    start: '09:00',
    colorIndex: 0,
    colors: CAL_COLORS,
    reminderOn: false,
    reminderMin: 10,
    saving: false,
    todayStr: '',
  },

  onLoad(options) {
    const todayStr = dates.today()
    this.setData({ todayStr })
    if (options && options.id) {
      const id = Number(options.id)
      this.setData({ isEdit: true, id })
      this.loadEvent(id)
    } else {
      let start = '09:00'
      if (options && options.date === todayStr) {
        const nm = nowMinutes()
        const snapped = Math.min(Math.max(Math.round(nm / 30) * 30, 6 * 60), 23 * 60 + 30)
        start = hhmmFromMinutes(snapped)
      }
      this.setData({ date: (options && options.date) || todayStr, start })
    }
  },

  async loadEvent(id) {
    try {
      const events = await eventsStore.listEvents()
      const ev = events.find(e => e.id === id)
      if (!ev) {
        wx.showToast({ title: '日程不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 800)
        return
      }
      const colorIndex = Math.max(0, CAL_COLORS.findIndex(c => c.key === ev.color))
      this.setData({
        title: ev.title,
        date: ev.date,
        endDate: ev.end_date || '',
        allDay: ev.all_day,
        start: ev.start,
        colorIndex,
        reminderOn: !!(ev.reminder && ev.reminder.enabled),
        reminderMin: ev.reminder && ev.reminder.minutes != null ? ev.reminder.minutes : 10,
      })
    } catch (e) {
      wx.showToast({ title: this.errText(e), icon: 'none' })
    }
  },

  errText(e) {
    const msg = (e && (e.message || e.errMsg)) || ''
    if (/401|unauthenticated|invalid_grant/i.test(msg)) return '登录已过期，请重新登录'
    if (/network|timeout|fail/i.test(msg)) return '网络异常，请稍后重试'
    return '操作失败，请重试'
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value })
  },

  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value })
  },

  onStartChange(e) {
    this.setData({ start: e.detail.value })
  },

  onAllDayChange(e) {
    this.setData({ allDay: e.detail.value })
  },

  onColorTap(e) {
    this.setData({ colorIndex: Number(e.currentTarget.dataset.index) })
  },

  onReminderToggle(e) {
    this.setData({ reminderOn: e.detail.value })
  },

  onReminderMinChange(e) {
    this.setData({ reminderMin: Number(e.detail.value) || 0 })
  },

  async onSave() {
    if (this.data.saving) return
    const session = await auth.getSession()
    if (!session) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const d = this.data
    const title = d.title.trim()
    if (!title) {
      wx.showToast({ title: '请填写标题', icon: 'none' })
      return
    }
    if (d.endDate && d.endDate < d.date) {
      wx.showToast({ title: '结束日期不能早于开始日期', icon: 'none' })
      return
    }
    const minutes = Math.max(0, Math.min(1440, d.reminderMin || 0))
    const ev = {
      title,
      date: d.date,
      end_date: d.endDate || null,
      start: d.allDay ? '00:00' : d.start,
      all_day: d.allDay,
      color: CAL_COLORS[d.colorIndex].key,
      reminder: d.reminderOn ? { enabled: true, minutes, last_fired: null } : null,
    }
    this.setData({ saving: true })
    try {
      if (d.isEdit) {
        await eventsStore.updateEvent(d.id, ev)
      } else {
        await eventsStore.createEvent(ev)
      }
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (e) {
      this.setData({ saving: false })
      wx.showToast({ title: this.errText(e), icon: 'none' })
    }
  },

  async onDelete() {
    if (!this.data.isEdit) return
    const res = await new Promise(resolve => {
      wx.showModal({
        title: '删除日程',
        content: '确定删除这条日程吗？删除后无法恢复。',
        confirmColor: '#C0392B',
        success: r => resolve(r.confirm),
      })
    })
    if (!res) return
    try {
      await eventsStore.deleteEvent(this.data.id)
      wx.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (e) {
      wx.showToast({ title: this.errText(e), icon: 'none' })
    }
  },
})
