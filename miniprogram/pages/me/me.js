const auth = require('../../utils/auth')

Page({
  data: {
    loggedOut: true,
    loading: true,
    nickname: '',
    loggingIn: false,
  },

  onShow() {
    this.refresh()
  },

  async refresh() {
    this.setData({ loading: true })
    const session = await auth.getSession()
    if (session && session.user) {
      this.setData({
        loggedOut: false,
        loading: false,
        nickname: (session.user.user_metadata && session.user.user_metadata.nickname) || '已登录用户',
      })
    } else {
      this.setData({ loggedOut: true, loading: false, nickname: '' })
    }
  },

  async onLogin() {
    if (this.data.loggingIn) return
    this.setData({ loggingIn: true })
    try {
      const session = await auth.wechatLogin()
      this.setData({
        loggedOut: false,
        loggingIn: false,
        nickname: (session && session.user && session.user.user_metadata && session.user.user_metadata.nickname) || '已登录用户',
      })
      wx.showToast({ title: '登录成功', icon: 'success' })
    } catch (e) {
      this.setData({ loggingIn: false })
      wx.showToast({ title: (e && e.message) || '登录失败，请重试', icon: 'none' })
    }
  },

  async onLogout() {
    const res = await new Promise(resolve => {
      wx.showModal({
        title: '退出登录',
        content: '退出后需要重新登录才能同步待办。',
        success: r => resolve(r.confirm),
      })
    })
    if (!res) return
    try {
      await auth.signOut()
      this.setData({ loggedOut: true, nickname: '' })
      wx.showToast({ title: '已退出', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '退出失败', icon: 'none' })
    }
  },
})
