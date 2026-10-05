const { cloud } = require('./cloud')
const { genClientId } = require('./events')

function normalizeMilestones(milestones) {
  if (!Array.isArray(milestones)) return []
  return milestones
    .filter(m => m && typeof m === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(String(m.date || '')) && String(m.title || '').trim())
    .map(m => ({
      id: String(m.id || genClientId('m')),
      title: String(m.title).trim().slice(0, 80),
      date: m.date,
      description: String(m.description || '').trim().slice(0, 300),
      createdAt: m.createdAt || new Date().toISOString(),
    }))
}

function rowToProject(row) {
  if (!row) return null
  return {
    id: row.id,
    client_id: row.client_id,
    name: row.name || '未命名项目',
    start_date: row.start_date,
    milestones: normalizeMilestones(row.milestones),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function projectToRow(p) {
  return {
    client_id: p.client_id,
    name: String(p.name || '未命名项目').trim().slice(0, 80) || '未命名项目',
    start_date: p.start_date,
    milestones: normalizeMilestones(p.milestones),
  }
}

async function listProjects() {
  const { data, error } = await cloud.database.from('projects').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(rowToProject)
}

async function createProject(p) {
  const row = projectToRow({ ...p, client_id: p.client_id || genClientId('p') })
  const { data, error } = await cloud.database.from('projects').insert(row).select()
  if (error) throw error
  return rowToProject((data || [])[0])
}

async function updateProject(id, p) {
  const row = projectToRow(p)
  const { data, error } = await cloud.database.from('projects').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id).select()
  if (error) throw error
  const affected = Array.isArray(data) ? data : []
  if (affected.length === 0) throw new Error('没有改动：项目可能不存在或不属于当前账号')
  return rowToProject(affected[0])
}

async function deleteProject(id) {
  const { data, error } = await cloud.database.from('projects').delete().eq('id', id).select()
  if (error) throw error
  const removed = Array.isArray(data) ? data : []
  if (removed.length === 0) throw new Error('没有删除：项目可能不存在或不属于当前账号')
  return true
}

module.exports = {
  normalizeMilestones,
  rowToProject,
  projectToRow,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
}
