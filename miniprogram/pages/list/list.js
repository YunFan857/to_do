const dates = require('../../utils/dates')
const store = require('../../utils/store')
const auth = require('../../utils/auth')

Page({
  data: {
    loading: true,
    loggedOut: false,
    tabs: [],
    activeTab: 'all',
    items: [],
  },

  onShow() {
    this.refresh()
  },

  async refresh() {
    const session = await auth.getSession()
    if (!session) {
      this.setData({ loggedOut: true, loading: false, items: [] })
      return
    }
    this.setData({ loggedOut: false, loading: true })
    try {
      const todos = await store.listTodos()
      this._todos = todos
      const counts = {}
      dates.TYPE_LIST.forEach(k => { counts[k] = 0 })
      todos.forEach(t => { if (counts[t.type] != null) counts[t.type]++ })
      const tabs = [
        { key: 'all', label: '全部', count: todos.length },
      ].concat(dates.TYPE_LIST.map(k => ({
        key: k,
        label: dates.TYPE_META[k].label,
        count: counts[k],
      })))
      const activeTab = this.data.activeTab
      this.setData({ tabs, loading: false })
      this.applyFilter(activeTab)
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: this.errText(e), icon: 'none' })
    }
  },

  applyFilter(tab) {
    let items = this._todos || []
    if (tab !== 'all') items = items.filter(t => t.type === tab)
    items = items.slice().sort(dates.sortTodos)
    this.setData({ activeTab: tab, items })
  },

  onTabTap(e) {
    this.applyFilter(e.currentTarget.dataset.key)
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
    const todo = (this._todos || []).find(t => t.id === id)
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

  onCreate() {
    wx.navigateTo({ url: '/pages/edit/edit' })
  },

  onPullDownRefresh() {
    this.refresh().then(() => wx.stopPullDownRefresh())
  },
})
