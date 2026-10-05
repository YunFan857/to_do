const { cloud } = require('./cloud')

async function getSession() {
  const { data, error } = await cloud.auth.getSession()
  if (error) return null
  return data || null
}

async function wechatLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      async success({ code }) {
        try {
          const appid = wx.getAccountInfoSync().miniProgram.appId
          const { data: session, error } = await cloud.auth.signInWithWechat(code, appid)
          if (error) {
            console.error('[WorkBuddy Cloud] login failed', JSON.stringify({
              stage: 'wechat-login-handler',
              message: error instanceof Error ? error.message : '微信登录失败，请重试',
            }))
            reject(new Error('微信登录失败，请重试'))
            return
          }
          resolve(session)
        } catch (error) {
          console.error('[WorkBuddy Cloud] login failed', JSON.stringify({
            stage: 'wechat-login-handler',
            message: error instanceof Error ? error.message : '微信登录失败，请重试',
          }))
          reject(new Error('微信登录失败，请重试'))
        }
      },
      fail(error) {
        console.error('[WorkBuddy Cloud] login failed', JSON.stringify({
          stage: 'wx.login',
          message: error.errMsg,
        }))
        reject(new Error('微信登录失败：' + (error.errMsg || '未知错误')))
      },
    })
  })
}

async function signOut() {
  const { error } = await cloud.auth.signOut()
  if (error) throw error
}

module.exports = { getSession, wechatLogin, signOut }
