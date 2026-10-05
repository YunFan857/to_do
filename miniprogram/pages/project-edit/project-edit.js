const dates = require('../../utils/dates')
const projectsStore = require('../../utils/projects')
const auth = require('../../utils/auth')

Page({
  data: {
    isEdit: false,
    id: null,
    name: '',
    startDate: '',
    milestones: [],
    saving: false,
    todayStr: '',
  },

  onLoad(options) {
    const todayStr = dates.today()
    this.setData({ todayStr })
    if (options && options.id) {
      const id = Number(options.id)
      this.setData({ isEdit: true, id })
      this.loadProject(id)
    } else {
      this.setData({ startDate: todayStr })
    }
  },

  async loadProject(id) {
    try {
      const projects = await projectsStore.listProjects()
      const p = projects.find(x => x.id === id)
      if (!p) {
        wx.showToast({ title: '项目不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 800)
        return
      }
      const milestones = (p.milestones || [])
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(m => ({ ...m, description: m.description || '' }))
      this.setData({ name: p.name, startDate: p.start_date, milestones })
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

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value })
  },

  onAddMilestone() {
    const milestones = this.data.milestones.concat([{
      id: 'new_' + Date.now(),
      title: '',
      date: dates.today(),
      description: '',
      isNew: true,
    }])
    this.setData({ milestones })
  },

  onMilestoneTitle(e) {
    const idx = Number(e.currentTarget.dataset.index)
    this.setData({ ['milestones[' + idx + '].title']: e.detail.value })
  },

  onMilestoneDate(e) {
    const idx = Number(e.currentTarget.dataset.index)
    this.setData({ ['milestones[' + idx + '].date']: e.detail.value })
  },

  onMilestoneDesc(e) {
    const idx = Number(e.currentTarget.dataset.index)
    this.setData({ ['milestones[' + idx + '].description']: e.detail.value })
  },

  onRemoveMilestone(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const milestones = this.data.milestones.filter((_, i) => i !== idx)
    this.setData({ milestones })
  },

  async onSave() {
    if (this.data.saving) return
    const session = await auth.getSession()
    if (!session) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const d = this.data
    const name = d.name.trim()
    if (!name) {
      wx.showToast({ title: '请填写项目名称', icon: 'none' })
      return
    }
    const milestones = d.milestones.filter(m => m.title.trim() && m.date)
    this.setData({ saving: true })
    try {
      const project = { name, start_date: d.startDate, milestones }
      if (d.isEdit) {
        await projectsStore.updateProject(d.id, project)
      } else {
        await projectsStore.createProject(project)
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
        title: '删除项目',
        content: '确定删除这个项目和全部节点吗？删除后无法恢复。',
        confirmColor: '#C0392B',
        success: r => resolve(r.confirm),
      })
    })
    if (!res) return
    try {
      await projectsStore.deleteProject(this.data.id)
      wx.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (e) {
      wx.showToast({ title: this.errText(e), icon: 'none' })
    }
  },
})
