(function () {
  const ROOT_ID = 'daywinner-time-study-ping';

  const existing = document.getElementById(ROOT_ID);
  if (existing) existing.remove();

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  const host = document.createElement('div');
  host.id = ROOT_ID;
  host.style.cssText = [
    'all: initial',
    'position: fixed',
    'z-index: 2147483647',
    'top: 16px',
    'right: 16px',
    'left: auto',
    'bottom: auto',
    'width: min(360px, calc(100vw - 32px))',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    'pointer-events: auto',
  ].join(';');

  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .card {
        position: relative;
        background: #0f172a;
        color: #e2e8f0;
        border: 1px solid #334155;
        border-radius: 14px;
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.35);
        padding: 14px 14px 12px;
      }
      .close {
        position: absolute;
        top: 8px;
        left: 8px;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        appearance: none;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #94a3b8;
        font: inherit;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
      }
      .close:hover {
        background: #1e293b;
        color: #e2e8f0;
      }
      .title {
        margin: 0 0 4px 18px;
        font-size: 14px;
        font-weight: 700;
        color: #f8fafc;
        line-height: 1.3;
      }
      .body {
        margin: 0 0 12px;
        font-size: 13px;
        line-height: 1.4;
        color: #94a3b8;
      }
      .body.hidden { display: none; }
      .line-wrap {
        display: none;
        width: 100%;
        margin: 0 0 12px;
      }
      .line-wrap.active { display: block; }
      #task {
        display: block;
        width: 100%;
        box-sizing: border-box;
        margin: 0;
        padding: 8px 0;
        border: none;
        border-bottom: 1px solid #334155;
        border-radius: 0;
        background: transparent;
        color: #f8fafc;
        font: inherit;
        font-size: 14px;
        line-height: 1.35;
        outline: none;
        resize: none;
        overflow: hidden;
        min-height: 22px;
        max-height: 88px;
      }
      #task:focus { border-bottom-color: #38bdf8; }
      #task::placeholder { color: #64748b; }
      .row {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        align-items: center;
      }
      button.action {
        appearance: none;
        border: none;
        border-radius: 9px;
        padding: 8px 12px;
        font: inherit;
        font-size: 13px;
        font-weight: 650;
        cursor: pointer;
      }
      .dismiss {
        background: transparent;
        color: #94a3b8;
      }
      .dismiss:hover { color: #e2e8f0; }
      .enter {
        background: #38bdf8;
        color: #0f172a;
      }
      .enter:hover { background: #7dd3fc; }
      .status {
        margin: 6px 0 0;
        font-size: 11px;
        color: #86efac;
        min-height: 0;
      }
      .status:empty { display: none; }
    </style>
    <div class="card" role="dialog" aria-label="Time study check-in">
      <button type="button" class="close" id="close" aria-label="Close">×</button>
      <p class="title">Time study check-in</p>
      <p class="body" id="body">What are you currently doing?</p>
      <div class="line-wrap" id="lineWrap">
        <textarea id="task" rows="1" placeholder="Type here…"></textarea>
      </div>
      <div class="row">
        <button type="button" class="action dismiss" id="dismiss">Dismiss</button>
        <button type="button" class="action enter" id="enter">Enter task</button>
      </div>
      <div class="status" id="status" aria-live="polite"></div>
    </div>
  `;

  const bodyEl = shadow.getElementById('body');
  const lineWrap = shadow.getElementById('lineWrap');
  const taskEl = shadow.getElementById('task');
  const statusEl = shadow.getElementById('status');
  const enterBtn = shadow.getElementById('enter');

  let typing = false;

  const remove = () => {
    host.remove();
  };

  const fitLine = () => {
    taskEl.style.height = '22px';
    taskEl.style.height = `${Math.min(88, Math.max(22, taskEl.scrollHeight))}px`;
  };

  const showTypingLine = () => {
    if (!typing) {
      typing = true;
      bodyEl.classList.add('hidden');
      lineWrap.classList.add('active');
      statusEl.textContent = '';
      window.setTimeout(() => {
        taskEl.focus();
        fitLine();
      }, 0);
    }
  };

  const save = () => {
    if (!typing) {
      showTypingLine();
      return;
    }

    const text = (taskEl.value || '').trim();
    if (!text) {
      statusEl.textContent = 'Type something first.';
      taskEl.focus();
      return;
    }

    statusEl.textContent = 'Saving…';
    enterBtn.disabled = true;
    try {
      chrome.runtime.sendMessage(
        {
          type: 'SAVE_TIME_STUDY_CHECKIN',
          payload: {
            id: makeId(),
            text,
            createdAt: Date.now(),
          },
        },
        () => {
          void chrome.runtime.lastError;
          statusEl.textContent = 'Saved';
          window.setTimeout(remove, 300);
        }
      );
    } catch {
      statusEl.textContent = 'Couldn’t save — reload the Daywinner extension.';
      enterBtn.disabled = false;
    }
  };

  shadow.getElementById('close').addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    remove();
  });
  shadow.getElementById('dismiss').addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    remove();
  });
  enterBtn.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    save();
  });

  taskEl.addEventListener('input', fitLine);
  taskEl.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      save();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      remove();
    }
  });

  (document.documentElement || document.body).appendChild(host);
})();
