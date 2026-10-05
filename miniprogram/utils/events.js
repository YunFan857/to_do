const { cloud } = require('./cloud')

function genClientId(prefix) {
  return (prefix || 'x') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function rowToEvent(row) {
  if (!row) return null
  return {
    id: row.id,
    client_id: row.client_id,
    title: row.title || '',
    date: row.date,
    end_date: row.end_date || null,
    start: row.start || '09:00',
    all_day: !!row.all_day,
    color: row.color || 'teal',
    reminder: row.reminder || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function eventToRow(ev) {
  return {
    client_id: ev.client_id,
    title: String(ev.title || '').trim().slice(0, 80),
    date: ev.date,
    end_date: ev.end_date && ev.end_date !== ev.date ? ev.end_date : null,
    start: ev.all_day ? '00:00' : (ev.start || '09:00'),
    all_day: !!ev.all_day,
    color: ev.color || 'teal',
    reminder: ev.reminder || null,
  }
}

async function listEvents() {
  const { data, error } = await cloud.database.from('events').select('*').order('date', { ascending: true })
  if (error) throw error
  return (data || []).map(rowToEvent)
}

async function createEvent(ev) {
  const row = eventToRow({ ...ev, client_id: ev.client_id || genClientId('e') })
  const { data, error } = await cloud.database.from('events').insert(row).select()
  if (error) throw error
  return rowToEvent((data || [])[0])
}

async function updateEvent(id, ev) {
  const row = eventToRow(ev)
  const { data, error } = await cloud.database.from('events').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id).select()
  if (error) throw error
  const affected = Array.isArray(data) ? data : []
  if (affected.length === 0) throw new Error('没有改动：日程可能不存在或不属于当前账号')
  return rowToEvent(affected[0])
}

async function deleteEvent(id) {
  const { data, error } = await cloud.database.from('events').delete().eq('id', id).select()
  if (error) throw error
  const removed = Array.isArray(data) ? data : []
  if (removed.length === 0) throw new Error('没有删除：日程可能不存在或不属于当前账号')
  return true
}

module.exports = {
  genClientId,
  rowToEvent,
  eventToRow,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
}
