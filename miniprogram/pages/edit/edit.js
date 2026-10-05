const dates = require('../../utils/dates')
const store = require('../../utils/store')
const auth = require('../../utils/auth')

const TYPE_OPTIONS = dates.TYPE_LIST.map(k => ({ value: k, label: dates.TYPE_META[k].label }))
const WEEK_OPTIONS = [0, 1, 2, 3, 4, 5, 6].map(n => ({ value: n, label: dates.wdName(n) }))
const MONTH_DAY_OPTIONS = []
for (let d = 1; d <= 31; d++) MONTH_DAY_OPTIONS.push({ value: d, label: d + ' 日' })
const ANNUAL_MONTH_OPTIONS = []
for (let m = 1; m <= 12; m++) ANNUAL_MONTH_OPTIONS.push({ value: m, label: m + '月' })
const ANNUAL_DAY_OPTIONS = []
for (let d = 1; d <= 31; d++) ANNUAL_DAY_OPTIONS.push({ value: d, label: d + '日' })

Page({
  data: {
    isEdit: false,
    id: null,
    title: '',
    type: 'once',
    dueDate: '',
    weekDay: 1,
    monthDay: 1,
    annualMonth: 1,
    annualDay: 1,
    note: '',
    typeOptions: TYPE_OPTIONS,
    typeIndex: 0,
    weekOptions: WEEK_OPTIONS,
    weekIndex: 1,
    monthDayOptions: MONTH_DAY_OPTIONS,
    monthDayIndex: 0,
    annualMonthOptions: ANNUAL_MONTH_OPTIONS,
    annualMonthIndex: 0,
    annualDayOptions: ANNUAL_DAY_OPTIONS,
    annualDayIndex: 0,
    todayStr: '',
    saving: false,
  },

  onLoad(options) {
    const todayStr = dates.today()
    if (options && options.id) {
      const id = Number(options.id)
      this.setData({ isEdit: true, id, todayStr })
      this.loadTodo(id)
    } else {
      this.setData({ todayStr })
    }
  },

  async loadTodo(id) {
    try {
      const todos = await store.listTodos()
      const todo = todos.find(t => t.id === id)
      if (!todo) {
        wx.showToast({ title: '待办不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 800)
        return
      }
      const typeIndex = TYPE_OPTIONS.findIndex(o => o.value === todo.type)
      this.setData({
        title: todo.title,
        type: todo.type,
        typeIndex: typeIndex < 0 ? 0 : typeIndex,
        dueDate: todo.due_date || '',
        weekDay: todo.week_day == null ? 1 : todo.week_day,
        weekIndex: todo.week_day == null ? 1 : todo.week_day,
        monthDay: todo.month_day || 1,
        monthDayIndex: (todo.month_day || 1) - 1,
        annualMonth: todo.annual_month || 1,
        annualMonthIndex: (todo.annual_month || 1) - 1,
        annualDay: todo.annual_day || 1,
        annualDayIndex: (todo.annual_day || 1) - 1,
        note: todo.note || '',
        _todo: todo,
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

  onTypeChange(e) {
    const index = Number(e.detail.value)
    this.setData({ typeIndex: index, type: TYPE_OPTIONS[index].value })
  },

  onDueDateChange(e) {
    this.setData({ dueDate: e.detail.value })
  },

  onWeekChange(e) {
    this.setData({ weekIndex: Number(e.detail.value), weekDay: WEEK_OPTIONS[Number(e.detail.value)].value })
  },

  onMonthDayChange(e) {
    this.setData({ monthDayIndex: Number(e.detail.value), monthDay: MONTH_DAY_OPTIONS[Number(e.detail.value)].value })
  },

  onAnnualMonthChange(e) {
    this.setData({ annualMonthIndex: Number(e.detail.value), annualMonth: ANNUAL_MONTH_OPTIONS[Number(e.detail.value)].value })
  },

  onAnnualDayChange(e) {
    this.setData({ annualDayIndex: Number(e.detail.value), annualDay: ANNUAL_DAY_OPTIONS[Number(e.detail.value)].value })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  buildTodo() {
    const d = this.data
    const todo = {
      title: d.title.trim(),
      type: d.type,
      note: d.note,
    }
    if (d.type === 'once') {
      todo.due_date = d.dueDate || null
    } else if (d.type === 'weekly') {
      todo.week_day = d.weekDay
    } else if (d.type === 'monthly') {
      todo.month_day = d.monthDay
    } else if (d.type === 'annual') {
      todo.annual_month = d.annualMonth
      todo.annual_day = d.annualDay
    }
    return todo
  },

  validate(todo) {
    if (!todo.title) return '请填写标题'
    if (todo.type === 'once' && !todo.due_date) return '请选择截止日期'
    if (todo.type === 'annual') {
      const maxDay = dates.daysInMonth(todo.annual_month, todo.annual_day)
      if (todo.annual_day > maxDay) return '该月没有这一天，请重新选择'
    }
    return ''
  },

  async onSave() {
    if (this.data.saving) return
    const session = await auth.getSession()
    if (!session) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const todo = this.buildTodo()
    const err = this.validate(todo)
    if (err) {
      wx.showToast({ title: err, icon: 'none' })
      return
    }
    this.setData({ saving: true })
    try {
      if (this.data.isEdit) {
        const prev = this.data._todo || {}
        await store.updateTodo(this.data.id, {
          ...todo,
          completed: prev.completed || false,
          completions: prev.completions || {},
          sort_key: prev.sort_key == null ? 1000 : prev.sort_key,
        })
      } else {
        await store.createTodo({ ...todo, completed: false, completions: {}, sort_key: 1000 })
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
        title: '删除待办',
        content: '确定删除这条待办吗？删除后无法恢复。',
        confirmColor: '#C0392B',
        success: r => resolve(r.confirm),
      })
    })
    if (!res) return
    try {
      await store.deleteTodo(this.data.id)
      wx.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (e) {
      wx.showToast({ title: this.errText(e), icon: 'none' })
    }
  },
})
