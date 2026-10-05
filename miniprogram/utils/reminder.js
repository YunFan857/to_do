const { nowMinutes } = require('./calendar')
const { today } = require('./dates')

function makeTicker() {
  let timer = null
  let page = null

  function tick() {
    if (!page || !page._eventsCache) return
    const nowMin = nowMinutes()
    const todayIso = today()
    const toFire = []
    for (const ev of page._eventsCache) {
      if (!ev.reminder || !ev.reminder.enabled || ev.all_day) continue
      if (ev.date !== todayIso) continue
      const startMin = ev.start ? Number(ev.start.slice(0, 2)) * 60 + Number(ev.start.slice(3, 5)) : 540
      const fireMin = startMin - (ev.reminder.minutes || 0)
      if (nowMin >= fireMin && nowMin < startMin) {
        const key = ev.date + 'T' + fireMin
        if (ev.reminder.last_fired !== key) {
          toFire.push({ ev, key })
        }
      }
    }
    if (toFire.length) {
      page.fireReminders(toFire)
    }
  }

  return {
    start(p) {
      page = p
      if (timer) clearInterval(timer)
      timer = setInterval(tick, 30000)
      tick()
    },
    stop() {
      if (timer) clearInterval(timer)
      timer = null
      page = null
    },
  }
}

module.exports = { makeTicker }
