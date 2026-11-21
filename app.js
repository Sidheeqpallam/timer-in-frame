const $ = s => document.querySelector(s);
const timerBox = $('#timerBox'), frameBox = $('#frameBox'), timeEl = $('#time');

// initial layout: frame centred, timer inside it
const W = innerWidth || 1280, H = innerHeight || 720;
place(frameBox, (W - 800) / 2, (H - 600) / 2, 800, 600);
place(timerBox, (W - 520) / 2, (H - 200) / 2, 520, 200);

function place(el, x, y, w, h) {
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.style.width = w + 'px'; el.style.height = h + 'px';
  if (el === timerBox) fitText();
}
// font size follows the box, shrunk further if the text is too wide (hh:mm:ss)
function fitText() {
  const h = timerBox.offsetHeight, w = timerBox.offsetWidth;
  timeEl.style.fontSize = h * 0.8 + 'px';
  const over = timeEl.offsetWidth / (w * 0.95);
  if (over > 1) timeEl.style.fontSize = (h * 0.8) / over + 'px';
}

/* ---- drag + resize ---- */
let drag = null;
document.addEventListener('pointerdown', e => {
  const box = e.target.closest('.box');
  if (!box || box.classList.contains('inactive')) return;
  drag = { box, resize: e.target.classList.contains('grip'), x: e.clientX, y: e.clientY,
           left: box.offsetLeft, top: box.offsetTop, w: box.offsetWidth, h: box.offsetHeight };
  box.setPointerCapture(e.pointerId);
  e.preventDefault();
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (drag.resize) place(drag.box, drag.left, drag.top, Math.max(60, drag.w + dx), Math.max(40, drag.h + dy));
  else place(drag.box, drag.left + dx, drag.top + dy, drag.w, drag.h);
});
document.addEventListener('pointerup', () => drag = null);

function setMode(m) {
  if (running) m = 'none';
  timerBox.classList.toggle('inactive', m !== 'timer');
  frameBox.classList.toggle('inactive', m !== 'frame');
  timerBox.classList.toggle('active', m === 'timer');
  frameBox.classList.toggle('active', m === 'frame');
}
$('#mode').onchange = () => applyMode();
const applyMode = () => setMode($('#mode').value);

/* ---- timer ---- */
let total = 300, left = 300, running = false, endAt = 0;

function parse(s) {
  const p = s.trim().split(':').map(Number);
  if (p.some(n => !Number.isFinite(n) || n < 0)) return null;
  return p.reduce((a, n) => a * 60 + n, 0);
}
function fmt(sec) {
  const neg = sec < 0; sec = Math.abs(sec);
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  const pad = n => String(n).padStart(2, '0');
  return (neg ? '-' : '') + (h ? h + ':' : '') + pad(m) + ':' + pad(s);
}
function render() {
  timeEl.textContent = fmt(left);
  timeEl.style.color = left < 0 ? '#ff3b30' : $('#color').value;
  fitText();
}
// setInterval, not rAF: browsers freeze rAF when the tab/window is not visible
setInterval(() => {
  if (!running) return;
  left = Math.round((endAt - Date.now()) / 1000);
  render();
}, 250);
$('#start').onclick = () => {
  if (running) { running = false; $('#start').textContent = 'Start'; applyMode(); return; }
  const d = parse($('#dur').value);
  if (left === total && d !== null) { total = left = d; }      // picked up a new duration
  endAt = Date.now() + left * 1000;
  running = true; $('#start').textContent = 'Pause';
  applyMode(); render();
};
$('#reset').onclick = () => {
  const d = parse($('#dur').value);
  if (d === null) { alert('Use mm:ss or hh:mm:ss'); return; }
  running = false; $('#start').textContent = 'Start'; total = left = d; applyMode(); render();
};
$('#color').oninput = render;
$('#bg').oninput = e => $('#stage').style.background = e.target.value;
$('#bold').onchange = e => { timeEl.style.fontWeight = e.target.value; fitText(); };
$('#font').onchange = e => {
  timeEl.style.fontFamily = e.target.value;
  fitText();
};

/* ---- frame image, fullscreen, keys ---- */
$('#file').onchange = e => {
  const f = e.target.files[0];
  if (f) $('#frameImg').src = URL.createObjectURL(f);
};
$('#showFrame').onchange = e => frameBox.hidden = !e.target.checked;
$('#full').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
$('#hideBar').onclick = () => $('#bar').classList.add('hide');
addEventListener('keydown', e => {
  if (e.target.matches('input, select')) return;
  if (e.key === 'h' || e.key === 'H') $('#bar').classList.toggle('hide');
  if (e.key === 'f' || e.key === 'F') $('#full').click();
  if (e.key === ' ') { e.preventDefault(); $('#start').click(); }
});

// the browser restores form state on reload, so drive every control from its restored value
['#showFrame', '#font', '#bold'].forEach(s => $(s).dispatchEvent(new Event('change')));
['#bg'].forEach(s => $(s).dispatchEvent(new Event('input')));
applyMode(); render();

/* ---- self-check ---- */
console.assert(parse('5:00') === 300 && parse('1:02:03') === 3723 && parse('x') === null, 'parse');
console.assert(fmt(59) === '00:59' && fmt(3723) === '1:02:03' && fmt(-5) === '-00:05', 'fmt');
