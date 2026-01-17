const API_BASE = 'http://localhost:3000/api';
let complaints = [];

async function fetchComplaints() {
  try {
    const res = await fetch(API_BASE + '/complaints');
    complaints = await res.json();
    renderComplaints();
    renderHotspots();
  } catch (e) {
    console.error('Failed to fetch complaints', e);
  }
}


function renderComplaints() {
  const table = document.getElementById('complaint-table');
  if (!table) return;

  table.innerHTML = '';

  let counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  let overdueCount = 0;
  const now = new Date();

  const priorityEl = document.getElementById('filter-priority');
  const departmentEl = document.getElementById('filter-department');
  const statusEl = document.getElementById('filter-status');

  const filterPriority = priorityEl ? priorityEl.value : '';
  const filterDepartment = departmentEl ? departmentEl.value : '';
  const filterStatus = statusEl ? statusEl.value : '';

  for (let i = 0; i < complaints.length; i++) {
    const c = complaints[i];

    if (filterPriority && c.priority !== filterPriority) continue;
    if (filterDepartment && c.department !== filterDepartment) continue;
    if (filterStatus && c.status !== filterStatus) continue;

    counts[c.priority] = (counts[c.priority] || 0) + 1;

    const created = new Date(c.createdAt);
    const sla = c.slaHours || 24;
    const slaDue = new Date(created.getTime() + sla * 3600000);
    const isOverdue = c.status !== 'Resolved' && slaDue < now;
    if (isOverdue) overdueCount++;

    const row = document.createElement('tr');

 
      row.innerHTML =
        '<td>' + c.complaintId + '</td>' +
        '<td>' + (c.aiSummary || c.citizenText) + '</td>' + 
        '<td>' + c.priority + '</td>' +
        '<td>' + c.status + '</td>' +
        '<td>' + (c.resolutionType || '—') + '</td>' +
        '<td>' + (c.resolvedAt ? new Date(c.resolvedAt).toLocaleString() : '—') + '</td>' +
        '<td>' + renderAuthorityActions(c) + '</td>';

    table.appendChild(row);
  }

  setText('critical-count', counts.Critical || 0);
  setText('high-count', counts.High || 0);
  setText('medium-count', counts.Medium || 0);
  setText('low-count', counts.Low || 0);
  setText('overdue-count', overdueCount);

  updatePerformanceMetrics();
}

function renderAuthorityActions(c) {
  const sla = c.slaHours || 24;
  const due = new Date(new Date(c.createdAt).getTime() + sla * 3600000);

  if (c.status === 'Submitted') {
    return (
      '<textarea id="msg-' + c.complaintId + '" placeholder="Work assigned, team dispatched"></textarea>' +
      '<button onclick="startWork(\'' + c.complaintId + '\')">Start Work</button>'
    );
  }

  if (c.status === 'In Progress') {
    return (
      '<textarea id="msg-' + c.complaintId + '" placeholder="Progress update / ETA"></textarea>' +
      '<button onclick="sendProgressUpdate(\'' + c.complaintId + '\')">Update</button>' +
      '<button onclick="markResolved(\'' + c.complaintId + '\')">Resolve</button>'
    );
  }

  return '—';
}

async function startWork(id) {
  const box = document.getElementById('msg-' + id);
  if (!box || !box.value) {
    alert('Message required');
    return;
  }

  await fetch(API_BASE + '/complaints/' + id + '/progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'In Progress',
      note: box.value,
      updatedBy: 'authority'
    })
  });

  fetchComplaints();
}

async function sendProgressUpdate(id) {
  const box = document.getElementById('msg-' + id);
  if (!box || !box.value) {
    alert('Message required');
    return;
  }

  await fetch(API_BASE + '/complaints/' + id + '/progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'In Progress',
      note: box.value,
      updatedBy: 'authority'
    })
  });

  fetchComplaints();
}

async function markResolved(id) {
  await fetch(API_BASE + '/complaints/' + id + '/resolve', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolutionType: 'Permanent' })
  });

  fetchComplaints();
}


function showPriorityReason(id) {
  for (let i = 0; i < complaints.length; i++) {
    if (complaints[i].complaintId === id) {
      alert(
        'Priority: ' + complaints[i].priority +
        '\n\nFactors:\n• Multiple reports\n• SLA sensitivity\n• Time open'
      );
      return;
    }
  }
}

function renderHotspots() {
  const container = document.getElementById('hotspot-cards');
  if (!container) return;

  container.innerHTML = '';
  const map = {};

  for (let i = 0; i < complaints.length; i++) {
    const key = complaints[i].location;
    map[key] = (map[key] || 0) + 1;
  }

  for (let k in map) {
    const div = document.createElement('div');
    div.className = 'card hotspot';
    div.innerText = k + ': ' + map[k] + ' complaints';
    container.appendChild(div);
  }
}

function updatePerformanceMetrics() {
  let resolved = 0;
  let totalHours = 0;
  let breaches = 0;
  const now = new Date();

  for (let i = 0; i < complaints.length; i++) {
    const c = complaints[i];
    if (c.status === 'Resolved') {
      resolved++;
      totalHours += (new Date(c.resolvedAt) - new Date(c.createdAt));
    } else {
      const due = new Date(new Date(c.createdAt).getTime() + c.slaHours * 3600000);
      if (due < now) breaches++;
    }
  }

  setText('avg-resolution-time',
    resolved ? Math.round(totalHours / resolved / 3600000) + ' hrs' : '—'
  );
  setText('sla-breach-count', breaches);
  setText('weekly-complaint-count', complaints.length);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

fetchComplaints();
