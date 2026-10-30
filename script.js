/* AI-Powered Student Performance Predictor
   NOTE: the prediction is a transparent weighted formula (demo), not a trained ML model. */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'spp_v1';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COL = { Excellent: '#34d399', Good: '#60a5fa', Average: '#fbbf24', 'Needs Improvement': '#f87171' };
const WEIGHTS = [['Previous exam marks', .30, 'prev'], ['Subject-wise average', .25, 'sub'], ['Attendance', .20, 'att'], ['Assignment completion', .15, 'assign'], ['Daily study hours', .10, 'studyPct']];
const SAMPLE = [
  { name: 'Aarav Patel', prev: 82, sub: 85, att: 94, study: 5, assign: 96 }, { name: 'Diya Shah', prev: 74, sub: 70, att: 88, study: 4, assign: 85 },
  { name: 'Rohan Mehta', prev: 55, sub: 58, att: 72, study: 2, assign: 60 }, { name: 'Isha Joshi', prev: 91, sub: 89, att: 97, study: 6, assign: 100 },
  { name: 'Kabir Singh', prev: 45, sub: 48, att: 65, study: 1.5, assign: 50 }, { name: 'Meera Nair', prev: 68, sub: 66, att: 85, study: 3, assign: 78 },
  { name: 'Vihaan Desai', prev: 62, sub: 60, att: 80, study: 3, assign: 70 }, { name: 'Anaya Gupta', prev: 78, sub: 81, att: 90, study: 4.5, assign: 92 }
];
let data = { form: null, student: null, students: [], tasks: [] };
try { data = Object.assign(data, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { } };
const charts = {};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

/* ---------- Scoring (transparent weighted formula) ---------- */
function predict(s) {
  const studyPct = Math.min(s.study / 6, 1) * 100; // 6 h/day counts as full marks
  const v = { ...s, studyPct };
  const parts = WEIGHTS.map(([k, w, f]) => ({ k, w, v: v[f], pts: w * v[f] }));
  const total = Math.round(parts.reduce((a, p) => a + p.pts, 0) * 10) / 10;
  return { total, parts };
}
const category = t => t >= 80 ? 'Excellent' : t >= 65 ? 'Good' : t >= 50 ? 'Average' : 'Needs Improvement';
const allStudents = () => SAMPLE.concat(data.students).map(s => ({ ...s, score: predict(s).total, cat: category(predict(s).total) }));

/* ---------- Navigation ---------- */
const TITLES = { dashboard: 'Dashboard', predict: 'Student Input & Prediction', analytics: 'Performance Analytics', recs: 'AI Recommendations', planner: 'Study Planner' };
function show(v) {
  $$('.view').forEach(e => e.classList.toggle('active', e.id === v));
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $('#title').textContent = TITLES[v]; $('#side').classList.remove('open'); window.scrollTo(0, 0);
  if (v === 'dashboard') renderDashboard(); if (v === 'analytics') renderAnalytics(); if (v === 'recs') renderRecs(); if (v === 'planner') renderPlanner();
}
$$('#nav button').forEach(b => b.onclick = () => show(b.dataset.view));
$$('[data-go]').forEach(b => b.onclick = () => show(b.dataset.go));
$('#menu').onclick = () => $('#side').classList.toggle('open');
document.addEventListener('click', e => { if ($('#side').classList.contains('open') && !e.target.closest('#side,#menu')) $('#side').classList.remove('open'); });
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }
function chart(id, cfg) {
  if (charts[id]) charts[id].destroy();
  Chart.defaults.color = '#9aa6d6'; Chart.defaults.borderColor = '#25337a'; Chart.defaults.font.family = "'Plus Jakarta Sans',sans-serif";
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false }, cfg.options);
  charts[id] = new Chart($('#' + id), cfg);
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
  const all = allStudents(), sc = all.map(s => s.score);
  const stats = [[all.length, 'Total students'], [avg(sc).toFixed(1) + '%', 'Average performance'], [avg(all.map(s => s.att)).toFixed(1) + '%', 'Average attendance'], [all.filter(s => s.score < 50).length, 'Students needing support']];
  $('#stats').innerHTML = stats.map(([b, l]) => `<div class="card stat"><b>${b}</b><span>${l}</span></div>`).join('');
  const sorted = [...sc].sort((a, b) => a - b), med = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const ps = [[Math.max(...sc).toFixed(1) + '%', 'Highest score'], [Math.min(...sc).toFixed(1) + '%', 'Lowest score'], [med.toFixed(1) + '%', 'Median score'], [Math.round(sc.filter(x => x >= 50).length / sc.length * 100) + '%', 'Students scoring 50% or more']];
  $('#pstats').innerHTML = ps.map(([b, l]) => `<div><b>${b}</b><span>${l}</span></div>`).join('');
  $('#tbl').innerHTML = '<tr><th>Name</th><th>Score</th><th>Attendance</th><th>Category</th></tr>' +
    [...all].sort((a, b) => b.score - a.score).map(s => `<tr><td>${esc(s.name)}</td><td>${s.score}%</td><td>${s.att}%</td><td><span class="badge" style="background:${COL[s.cat]}">${s.cat}</span></td></tr>`).join('');
  const cats = Object.keys(COL);
  chart('cDist', { type: 'doughnut', data: { labels: cats, datasets: [{ data: cats.map(c => all.filter(s => s.cat === c).length), backgroundColor: cats.map(c => COL[c]), borderWidth: 0 }] }, options: { cutout: '62%', plugins: { legend: { position: 'bottom' } } } });
  chart('cAtt', { type: 'bar', data: { labels: all.map(s => s.name.split(' ')[0]), datasets: [{ label: 'Attendance %', data: all.map(s => s.att), backgroundColor: all.map(s => s.att >= 75 ? '#4f8cff' : '#f87171'), borderRadius: 6 }] }, options: { scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } } });
}

/* ---------- Form ---------- */
function addRow(n = '', m = '') {
  const d = document.createElement('div'); d.className = 'srow';
  d.innerHTML = `<input class="sn" maxlength="30" placeholder="Subject name" value="${esc(n)}" aria-label="Subject name"><input class="sm" type="number" min="0" max="100" placeholder="Marks %" value="${esc(m)}" aria-label="Marks"><button type="button" class="x" aria-label="Remove subject">&times;</button>`;
  d.querySelector('.x').onclick = () => { if ($$('.srow').length > 1) { d.remove(); persist(); } else toast('Keep at least one subject.'); };
  $('#subjects').appendChild(d);
}
const IDS = ['name', 'course', 'semester', 'prev', 'att', 'study', 'assign'];
function raw() { const o = {}; IDS.forEach(i => o[i] = $('#' + i).value); o.subjects = $$('.srow').map(r => ({ n: $('.sn', r).value, m: $('.sm', r).value })); return o; }
function persist() { data.form = raw(); save(); }
function fill(f) { IDS.forEach(i => $('#' + i).value = f[i] ?? ''); $('#subjects').innerHTML = ''; (f.subjects && f.subjects.length ? f.subjects : [{}]).forEach(s => addRow(s.n, s.m)); }
function setErr(el, msg) { const f = el.closest('.field') || el.closest('.srow'); f.classList.toggle('bad', !!msg); const e = f.querySelector('.err') || $('#subErr'); if (e) e.textContent = msg || ''; }
function num(id, label, min, max) {
  const el = $('#' + id), v = el.value.trim(); let m = '';
  if (v === '') m = `${label} is required.`; else if (isNaN(+v) || +v < min || +v > max) m = `${label} must be between ${min} and ${max}.`;
  setErr(el, m); return m ? null : +v;
}
function validate() {
  let ok = true; const out = {};
  const name = $('#name').value.trim(), course = $('#course').value.trim(), sem = $('#semester').value;
  const t = (el, c, msg) => { setErr(el, c ? '' : msg); if (!c) ok = false; };
  t($('#name'), /^[A-Za-z][A-Za-z .'-]{1,49}$/.test(name), 'Enter a valid name (letters only, at least 2 characters).');
  t($('#course'), course.length >= 2, 'Enter the course name.'); t($('#semester'), !!sem, 'Select a semester.');
  const nums = { prev: ['Previous marks', 0, 100], att: ['Attendance', 0, 100], study: ['Study hours', 0, 16], assign: ['Assignment completion', 0, 100] };
  for (const k in nums) { const v = num(k, ...nums[k]); if (v === null) ok = false; out[k] = v; }
  const subs = []; let subMsg = '';
  $$('.srow').forEach(r => {
    const n = $('.sn', r).value.trim(), m = $('.sm', r).value.trim(); r.classList.remove('bad');
    if (!n && !m) return;
    if (!n || m === '' || isNaN(+m) || +m < 0 || +m > 100) { r.classList.add('bad'); subMsg = 'Each subject needs a name and marks between 0 and 100.'; } else subs.push({ n, m: +m });
  });
  if (!subMsg && !subs.length) subMsg = 'Add marks for at least one subject.';
  $('#subErr').textContent = subMsg; if (subMsg) ok = false;
  if (!ok) return null;
  return { name, course, semester: sem, ...out, subjects: subs, sub: +avg(subs.map(s => s.m)).toFixed(1) };
}
$('#form').addEventListener('input', persist);
$('#addSub').onclick = () => { addRow(); persist(); };
$('#sample').onclick = () => { fill({ name: 'Riya Sharma', course: 'B.Tech Computer Science', semester: '4', prev: 68, att: 72, study: 2.5, assign: 65, subjects: [{ n: 'Mathematics', m: 48 }, { n: 'Physics', m: 62 }, { n: 'Programming', m: 85 }, { n: 'English', m: 74 }, { n: 'Electronics', m: 55 }] }); persist(); toast('Sample data loaded. Press Predict performance.'); };
$('#form').addEventListener('submit', e => {
  e.preventDefault(); const s = validate();
  if (!s) { toast('Please fix the highlighted fields.'); const b = $('.bad'); if (b) b.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  s.date = new Date().toISOString(); data.student = s;
  const i = data.students.findIndex(x => x.name.toLowerCase() === s.name.toLowerCase() && x.course === s.course && x.semester === s.semester);
  i >= 0 ? data.students[i] = s : data.students.push(s);
  persist(); renderResult(); toast('Prediction updated for ' + s.name + '.');
  if (innerWidth < 1000) $('#result').scrollIntoView({ behavior: 'smooth' });
});

/* ---------- Result ---------- */
function renderResult() {
  const box = $('#result'), s = data.student;
  if (!s) { box.innerHTML = '<div class="empty">Fill in the form and press <b>Predict performance</b> to see the result, explanation and progress indicator here.</div>'; return; }
  const p = predict(s), c = category(p.total), col = COL[c], R = 62, C = 2 * Math.PI * R;
  const top = [...p.parts].sort((a, b) => b.pts - a.pts)[0], low = [...p.parts].sort((a, b) => (a.v) - (b.v))[0];
  box.innerHTML = `<h3>Prediction for ${esc(s.name)}</h3>
  <div class="ringwrap"><div class="ring"><svg width="150" height="150"><circle cx="75" cy="75" r="${R}" fill="none" stroke="#0a1230" stroke-width="12"/><circle cx="75" cy="75" r="${R}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p.total / 100)}"/></svg><b>${p.total}%</b></div>
  <div><span class="badge" style="background:${col}">${c}</span><p style="color:var(--mute);margin-top:8px;font-size:.85rem">${esc(s.course)}, semester ${esc(s.semester)}</p></div></div>
  <p class="expl">This is a demonstration score from a weighted formula, not a trained machine-learning model. Each factor is scaled to 0 to 100, multiplied by its weight and added up. <b>${top.k}</b> adds the most points, while <b>${low.k}</b> is the weakest input (${Math.round(low.v)} out of 100). Study time counts as full marks at 6 hours a day. Categories: 80+ Excellent, 65 to 79 Good, 50 to 64 Average, below 50 Needs Improvement.</p>
  ${p.parts.map(x => `<div class="brow"><span>${x.k} (${x.w * 100}%)</span><div class="bar"><i style="width:${x.v}%"></i></div><span>${x.pts.toFixed(1)} pts</span></div>`).join('')}`;
}

/* ---------- Analytics ---------- */
function renderAnalytics() {
  const s = data.student, none = !s;
  $('#anBody').style.display = none ? 'none' : 'block'; $('#anEmpty').style.display = none ? 'block' : 'none';
  if (none) { $('#anEmpty').innerHTML = 'No prediction yet. Enter a student first and the charts will appear here.<br><button class="btn" data-go="predict">Go to student input</button>'; $('#anEmpty [data-go]').onclick = () => show('predict'); return; }
  chart('cSub', { type: 'bar', data: { labels: s.subjects.map(x => x.n), datasets: [{ label: 'Marks %', data: s.subjects.map(x => x.m), backgroundColor: s.subjects.map(x => x.m >= 65 ? '#4f8cff' : x.m >= 50 ? '#9b6bff' : '#f87171'), borderRadius: 8 }] }, options: { scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } } });
  chart('cProf', { type: 'bar', data: { labels: ['Attendance', 'Assignments', 'Study (% of 6 h goal)'], datasets: [{ label: 'Student', data: [s.att, s.assign, Math.round(Math.min(s.study / 6, 1) * 100)], backgroundColor: ['#4f8cff', '#9b6bff', '#34d399'], borderRadius: 8 }] }, options: { indexAxis: 'y', scales: { x: { min: 0, max: 100 } }, plugins: { legend: { display: false } } } });
  const all = allStudents(), cls = k => +avg(all.map(x => x[k])).toFixed(1), st = Math.min(s.study / 6, 1) * 100;
  chart('cComp', { type: 'bar', data: { labels: ['Previous marks', 'Subject average', 'Attendance', 'Assignments', 'Study hours'], datasets: [{ label: s.name, data: [s.prev, s.sub, s.att, s.assign, st], backgroundColor: '#4f8cff', borderRadius: 6 }, { label: 'Class average', data: [cls('prev'), cls('sub'), cls('att'), cls('assign'), +avg(all.map(x => Math.min(x.study / 6, 1) * 100)).toFixed(1)], backgroundColor: '#9b6bff', borderRadius: 6 }] }, options: { scales: { y: { min: 0, max: 100 } } } });
}

/* ---------- Recommendations ---------- */
function recsFor(s) {
  const r = [], add = (p, t, d) => r.push({ p, t, d });
  if (s.att < 75) add('high', 'Improve attendance urgently', `Attendance is ${s.att}%, below the common 75% eligibility limit. Aim to miss no classes for the next month and ask for notes on any session you missed.`);
  else if (s.att < 85) add('medium', 'Raise attendance', `At ${s.att}%, you are above the limit but still missing lectures. Getting to 90% would add about ${((90 - s.att) * .2).toFixed(1)} points to your score.`);
  if (s.study < 2) add('high', 'Increase daily study hours', `You study ${s.study} h a day. Start with 3 focused hours in two sessions with short breaks, then build up to 4 or more.`);
  else if (s.study < 4) add('medium', 'Add a little more study time', `You study ${s.study} h a day. An extra 45 to 60 minutes of revision on your weakest subject would help.`);
  else if (s.study > 9) add('medium', 'Protect your rest', `${s.study} h a day is very high. Make sure you sleep well and take breaks, since tired study is less effective.`);
  if (s.assign < 70) add('high', 'Complete pending assignments', `Only ${s.assign}% of assignments are done. List the missing ones in the Study Planner and clear one per day.`);
  else if (s.assign < 90) add('medium', 'Finish the remaining assignments', `You have completed ${s.assign}%. Submitting the rest on time will lift both your marks and your score.`);
  const weak = s.subjects.filter(x => x.m < 50).sort((a, b) => a.m - b.m), mid = s.subjects.filter(x => x.m >= 50 && x.m < 65);
  if (weak.length) add('high', 'Focus on weak subjects', `${weak.map(x => `${esc(x.n)} (${x.m}%)`).join(', ')} need the most attention. Give them your best study hours, solve past papers and ask your teacher about doubts.`);
  if (mid.length) add('medium', 'Strengthen average subjects', `${mid.map(x => `${esc(x.n)} (${x.m}%)`).join(', ')} are close to a good grade. Weekly practice tests can move them up.`);
  if (s.prev < 50) add('high', 'Revise the fundamentals', `Previous exam marks were ${s.prev}%. Revisit the basics of each core subject before starting new topics.`);
  if (!r.length) add('low', 'Keep up the great work', 'All indicators are strong. Maintain your routine and try advanced problems, projects or peer teaching.');
  else if (s.subjects.some(x => x.m >= 80)) { const b = [...s.subjects].sort((a, c) => c.m - a.m)[0]; add('low', 'Build on your strengths', `${esc(b.n)} (${b.m}%) is your best subject. The study methods you use there can be reused for weaker subjects.`); }
  return r;
}
function renderRecs() {
  const s = data.student, box = $('#recBox');
  if (!s) { box.innerHTML = '<div class="card empty">Recommendations are generated from a student\'s inputs. Enter a student first.<br><button class="btn" id="goP">Go to student input</button></div>'; $('#goP').onclick = () => show('predict'); return; }
  const lbl = { high: 'High priority', medium: 'Medium priority', low: 'Positive' };
  box.innerHTML = `<div class="card" style="margin-bottom:14px"><h3 style="margin:0">Personalised plan for ${esc(s.name)}</h3><p style="color:var(--mute);font-size:.88rem">Rule-based suggestions from the thresholds in this project, ordered by priority.</p></div>` +
    recsFor(s).sort((a, b) => ['high', 'medium', 'low'].indexOf(a.p) - ['high', 'medium', 'low'].indexOf(b.p)).map(x => `<div class="card rec ${x.p}"><div><h3>${x.t}<span class="tag">${lbl[x.p]}</span></h3><p>${x.d}</p></div></div>`).join('') +
    '<div class="actions"><button class="btn" id="goPl">Open study planner</button></div>';
  $('#goPl').onclick = () => show('planner');
}

/* ---------- Study planner ---------- */
function renderPlanner() {
  const t = data.tasks, done = t.filter(x => x.done).length, pct = t.length ? Math.round(done / t.length * 100) : 0;
  $('#pProg').textContent = `${done} of ${t.length} tasks completed (${pct}%)`; $('#pBar').style.width = pct + '%';
  $('#week').innerHTML = DAYS.map(d => {
    const items = t.filter(x => x.day === d).sort((a, b) => a.time.localeCompare(b.time));
    return `<div class="day"><h4>${d}</h4>${items.length ? items.map(x => `<div class="task ${x.done ? 'done' : ''}"><input type="checkbox" data-id="${x.id}" ${x.done ? 'checked' : ''} aria-label="Mark done"><div class="tt"><b>${esc(x.subject)}</b><small>${x.time}</small>${esc(x.text)}</div><button class="del" data-del="${x.id}" aria-label="Delete task">&times;</button></div>`).join('') : '<small style="color:var(--mute)">No tasks yet</small>'}</div>`;
  }).join('');
  $$('#week input').forEach(c => c.onchange = () => { const x = data.tasks.find(k => k.id == c.dataset.id); x.done = c.checked; save(); renderPlanner(); });
  $$('#week .del').forEach(b => b.onclick = () => { data.tasks = data.tasks.filter(k => k.id != b.dataset.del); save(); renderPlanner(); toast('Task deleted.'); });
}
$('#pDay').innerHTML = DAYS.map(d => `<option>${d}</option>`).join('');
$('#pDay').value = DAYS[(new Date().getDay() + 6) % 7];
$('#pform').addEventListener('submit', e => {
  e.preventDefault(); let ok = true;
  [['#pSub', 'Enter a subject.'], ['#pTime', 'Choose a study time.'], ['#pTask', 'Describe the task.']].forEach(([id, m]) => { const el = $(id), bad = !el.value.trim(); setErr(el, bad ? m : ''); if (bad) ok = false; });
  if (!ok) return;
  data.tasks.push({ id: Date.now(), subject: $('#pSub').value.trim(), day: $('#pDay').value, time: $('#pTime').value, text: $('#pTask').value.trim(), done: false });
  save(); $('#pSub').value = $('#pTask').value = $('#pTime').value = ''; renderPlanner(); toast('Task added to ' + $('#pDay').value + '.');
});
$('#clearDone').onclick = () => { const n = data.tasks.filter(x => x.done).length; if (!n) return toast('No completed tasks to clear.'); data.tasks = data.tasks.filter(x => !x.done); save(); renderPlanner(); toast(n + ' completed task(s) cleared.'); };
$('#reset').onclick = () => { if (confirm('Delete all saved students, inputs and planner tasks?')) { localStorage.removeItem(KEY); location.reload(); } };

/* ---------- Init ---------- */
fill(data.form || { subjects: ['Mathematics', 'Physics', 'Programming', 'English', 'Electronics'].map(n => ({ n, m: '' })) });
renderResult(); renderDashboard();
