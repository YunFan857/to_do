const dates = require('../../utils/dates')
const projectsStore = require('../../utils/projects')
const auth = require('../../utils/auth')
const cal = require('../../utils/calendar')

Page({
  data: {
    loggedOut: false,
    loading: true,
    projects: [],
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
      const raw = await projectsStore.listProjects()
      const projects = raw.map(p => {
        const timeline = cal.buildTimeline(p)
        return {
          id: p.id,
          name: p.name,
          elapsed: timeline.elapsed,
          day: timeline.day,
          points: timeline.points.map((pt, i) => ({
            ...pt,
            key: pt.kind + '-' + i,
            dateLabel: pt.kind === 'today' ? '今天' : cal.shortDate(pt.date),
          })),
        }
      })
      this.setData({ projects, loading: false })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: this.errText(e), icon: 'none' })
    }
  },

  errText(e) {
    const msg = (e && (e.message || e.errMsg)) || ''
    if (/401|unauthenticated|invalid_grant/i.test(msg)) return '登录已过期，请到「我的」重新登录'
    if (/network|timeout|fail/i.test(msg)) return '网络异常，请稍后重试'
    return '加载失败，下拉重试'
  },

  onProjectTap(e) {
    wx.navigateTo({ url: '/pages/project-edit/project-edit?id=' + e.currentTarget.dataset.id })
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/project-edit/project-edit' })
  },

  onPullDownRefresh() {
    this.refresh().then(() => wx.stopPullDownRefresh())
  },
})
