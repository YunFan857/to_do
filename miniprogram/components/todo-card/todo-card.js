Component({
  options: {
    addGlobalClass: true,
  },
  properties: {
    todo: { type: Object, value: {} },
  },
  data: {
    done: false,
    meta: '',
    overdue: false,
  },
  observers: {
    todo(todo) {
      if (!todo || !todo.id) return
      const dates = require('../../utils/dates')
      let meta = ''
      if (todo.type === 'once') {
        meta = todo.due_date ? dates.friendlyDate(todo.due_date) : ''
      } else if (todo.type === 'weekly') {
        meta = dates.wdName(todo.week_day == null ? 1 : todo.week_day)
      } else if (todo.type === 'monthly') {
        meta = '每月 ' + (todo.month_day || 1) + ' 日'
      } else if (todo.type === 'annual') {
        meta = (todo.annual_month || 1) + '月' + (todo.annual_day || 1) + '日'
      } else if (todo.type === 'daily') {
        const streak = dates.dailyStreak(todo)
        meta = streak > 0 ? '连续 ' + streak + ' 天' : ''
      }
      this.setData({
        done: dates.isDone(todo),
        meta,
        overdue: dates.isOverdue(todo),
      })
    },
  },
  methods: {
    onToggle() {
      this.triggerEvent('toggle', { id: this.data.todo.id })
    },
    onTap() {
      this.triggerEvent('edit', { id: this.data.todo.id })
    },
  },
})
