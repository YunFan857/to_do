const { cloud } = require('./cloud')

const TABLE = 'todos'

function genClientId() {
  return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function rowToTodo(row) {
  if (!row) return null
  return {
    id: row.id,
    client_id: row.client_id,
    title: row.title || '',
    type: row.type || 'once',
    due_date: row.due_date || null,
    week_day: row.week_day,
    month_day: row.month_day,
    annual_month: row.annual_month,
    annual_day: row.annual_day,
    note: row.note || '',
    completed: !!row.completed,
    completions: row.completions || {},
    sort_key: row.sort_key == null ? 1000 : row.sort_key,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function todoToRow(todo) {
  return {
    client_id: todo.client_id,
    title: String(todo.title || '').trim().slice(0, 80),
    type: todo.type || 'once',
    due_date: todo.due_date || null,
    week_day: todo.week_day == null ? null : Number(todo.week_day),
    month_day: todo.month_day == null ? null : Number(todo.month_day),
    annual_month: todo.annual_month == null ? null : Number(todo.annual_month),
    annual_day: todo.annual_day == null ? null : Number(todo.annual_day),
    note: String(todo.note || '').slice(0, 300),
    completed: !!todo.completed,
    completions: todo.completions || {},
    sort_key: todo.sort_key == null ? 1000 : Number(todo.sort_key),
  }
}

async function listTodos() {
  const { data, error } = await cloud.database.from(TABLE).select('*').order('sort_key', { ascending: true })
  if (error) throw error
  return (data || []).map(rowToTodo)
}

async function createTodo(todo) {
  const row = todoToRow({ ...todo, client_id: todo.client_id || genClientId() })
  const { data, error } = await cloud.database.from(TABLE).insert(row).select()
  if (error) throw error
  return rowToTodo((data || [])[0])
}

async function updateTodo(id, patch) {
  const base = { ...patch }
  delete base.id
  delete base.client_id
  const row = todoToRow({ ...base, client_id: 'x' })
  delete row.client_id
  const { data, error } = await cloud.database.from(TABLE).update({ ...row, updated_at: new Date().toISOString() }).eq('id', id).select()
  if (error) throw error
  const affected = Array.isArray(data) ? data : []
  if (affected.length === 0) throw new Error('没有改动：待办可能不存在或不属于当前账号')
  return rowToTodo(affected[0])
}

async function deleteTodo(id) {
  const { data, error } = await cloud.database.from(TABLE).delete().eq('id', id).select()
  if (error) throw error
  const removed = Array.isArray(data) ? data : []
  if (removed.length === 0) throw new Error('没有删除：待办可能不存在或不属于当前账号')
  return true
}

module.exports = {
  TABLE,
  genClientId,
  rowToTodo,
  todoToRow,
  listTodos,
  createTodo,
  updateTodo,
  deleteTodo,
}
