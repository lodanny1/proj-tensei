// === WorkspaceController Class ===
// Renders the workspace view dynamically from case data.
// Manages tabs, timeline messages, and approval flow.

export class WorkspaceController {
  constructor(container) {
    this.container = container;
    this.currentCase = null;
    this.onResolve = null; // callback when case is resolved
  }

  open(caseData) {
    this.currentCase = caseData;
    this.container.innerHTML = this._render(caseData);
    this._bindTabs();
    this._bindResolve();
    this._bindNodeTooltips();
  }

  // Resolve the current case
  resolve() {
    if (!this.currentCase) return;
    this.currentCase.resolved = true;

    // Update severity badge to resolved
    const tag = this.container.querySelector('.case-tag');
    if (tag) {
      tag.className = 'case-tag tag-resolved';
      tag.textContent = 'resolved';
    }

    // Disable resolve button
    const btn = this.container.querySelector('#resolve-case-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '✓ Resolved';
      btn.classList.add('resolved');
    }

    // Add resolution message to timeline
    this.addTimelineMessage({
      actor: 'System',
      text: '🏁 Case marked as <strong>resolved</strong> by customer.',
      type: 'resolution',
      time: 'now'
    });

    // Notify callback
    if (this.onResolve) this.onResolve(this.currentCase);
  }

  // Add a message to the timeline
  addTimelineMessage(msg) {
    const timeline = this.container.querySelector('#timeline-messages');
    if (!timeline) return;

    const msgClass = msg.type === 'system' ? 'msg-system' : msg.type === 'resolution' ? 'msg-resolution' : '';
    const metaColor = msg.type === 'system' ? '#0972d3' : msg.type === 'resolution' ? '#037f0c' : '#7b2cf5';

    const el = document.createElement('div');
    el.className = `timeline-msg ${msgClass}`;
    el.innerHTML = `
      <div class="timeline-content">
        <div class="timeline-meta" style="color:${metaColor}">${msg.actor}</div>
        <p>${msg.text}</p>
        ${msg.detail ? `<span class="timeline-detail">${msg.detail}</span>` : ''}
      </div>
      <span class="timeline-time">${msg.time || 'just now'}</span>
    `;
    timeline.appendChild(el);
    timeline.scrollTop = timeline.scrollHeight;
  }

  // Show approval box
  showApproval(message, onApprove, onDeny) {
    const box = this.container.querySelector('#timeline-approval');
    if (!box) return;
    box.style.display = 'block';
    box.querySelector('p').innerHTML = `<strong>Agent requests approval:</strong> ${message}`;
    
    const approveBtn = box.querySelector('.btn-approve');
    const denyBtn = box.querySelector('.btn-deny');
    
    approveBtn.onclick = () => { box.style.display = 'none'; if (onApprove) onApprove(); };
    denyBtn.onclick = () => { box.style.display = 'none'; if (onDeny) onDeny(); };
  }

  // Hide approval box
  hideApproval() {
    const box = this.container.querySelector('#timeline-approval');
    if (box) box.style.display = 'none';
  }

  // Add a message to the chat panel
  addChatMessage({ actor, text, type }) {
    const chat = this.container.querySelector('#ws-chat-messages');
    if (!chat) return;

    const isAgent = type === 'agent';
    const el = document.createElement('div');
    el.className = `ws-chat-msg ${isAgent ? 'ws-chat-agent' : 'ws-chat-customer'}`;
    el.innerHTML = `
      <div class="ws-chat-bubble ${isAgent ? 'bubble-agent' : 'bubble-customer'}">
        <span class="ws-chat-actor">${actor}</span>
        <p>${text}</p>
      </div>
    `;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  }

  // Show approval request in the chat panel (with approve/deny buttons)
  showChatApproval(message, onApprove, onDeny) {
    const chat = this.container.querySelector('#ws-chat-messages');
    if (!chat) return;

    const el = document.createElement('div');
    el.className = 'ws-chat-msg ws-chat-agent';
    el.innerHTML = `
      <div class="ws-chat-bubble bubble-agent bubble-approval">
        <span class="ws-chat-actor">AI Agent</span>
        <p>${message}</p>
        <div class="ws-chat-approval-btns">
          <button class="btn-chat-approve">✅ Approve</button>
          <button class="btn-chat-deny">❌ Deny</button>
        </div>
      </div>
    `;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;

    const approveBtn = el.querySelector('.btn-chat-approve');
    const denyBtn = el.querySelector('.btn-chat-deny');
    const btnsContainer = el.querySelector('.ws-chat-approval-btns');

    approveBtn.addEventListener('click', () => {
      btnsContainer.innerHTML = '<span class="ws-chat-approved">✅ Approved</span>';
      if (onApprove) onApprove();
    });

    denyBtn.addEventListener('click', () => {
      btnsContainer.innerHTML = '<span class="ws-chat-denied">❌ Denied</span>';
      if (onDeny) onDeny();
    });
  }

  // Add a log line
  addLog(text, level = 'info') {
    const stream = this.container.querySelector('.ws-logs-stream');
    if (!stream) return;
    const el = document.createElement('div');
    el.className = `log-line log-${level}`;
    el.textContent = text;
    stream.appendChild(el);
    stream.scrollTop = stream.scrollHeight;
  }

  _render(caseData) {
    return `
    <div class="workspace">
      <div class="workspace-header">
        <div class="workspace-title-area">
          <h2>${caseData.title}</h2>
          <span class="case-tag tag-${caseData.severity}">${caseData.severity}</span>
        </div>
        <div class="workspace-header-right">
          <button class="resolve-btn" id="resolve-case-btn">✓ Resolve Case</button>
          <button class="escalate-btn">🚨 Escalate to Engineer</button>
          <div class="workspace-participants">
            <div class="case-avatar">A</div>
            <div class="case-avatar" style="background:#ff9900">C</div>
          </div>
        </div>
      </div>

      <div class="workspace-body">
        <!-- Timeline -->
        <div class="workspace-timeline">
          <div class="workspace-panel-header">
            <h3>Investigation Timeline</h3>
            <span class="workspace-live-badge">● Live</span>
          </div>
          <div class="timeline-messages" id="timeline-messages">
            <div class="timeline-msg msg-system">
              <div class="timeline-content">
                <div class="timeline-meta" style="color:#0972d3">System</div>
                <p>⚠️ Issue detected: ${caseData.description}. Assigning to AI Agent.</p>
              </div>
              <span class="timeline-time">just now</span>
            </div>
          </div>
          <div class="timeline-approval" id="timeline-approval" style="display:none">
            <p></p>
            <div class="approval-buttons">
              <button class="btn-approve">Approve</button>
              <button class="btn-deny">Deny</button>
            </div>
          </div>
        </div>

        <!-- Context Panel -->
        <div class="workspace-context">
          <div class="workspace-tabs">
            <button class="workspace-tab active" data-tab="ws-architecture">Architecture</button>
            <button class="workspace-tab" data-tab="ws-logs">Logs</button>
            <button class="workspace-tab" data-tab="ws-permissions">Permissions</button>
          </div>
          <div class="workspace-tab-content active" id="ws-architecture">
            <div class="ws-arch-scoped">
              <div class="ws-arch-header">
                <span class="ws-arch-label">Affected Resources</span>
                <span class="ws-arch-scope">${caseData.affectedPath || 'N/A'}</span>
              </div>
              <div class="ws-arch-nodes">
                ${this._renderScopedNodes(caseData)}
              </div>
            </div>
          </div>
          <div class="workspace-tab-content" id="ws-logs">
            <div class="ws-logs-stream"></div>
          </div>
          <div class="workspace-tab-content" id="ws-permissions">
            <div class="ws-permissions-panel">
              <h4>Permissions for this investigation</h4>
              <p class="ws-perm-desc">Override defaults for this issue only.</p>
              ${this._renderPermissions(caseData.permissions || ['Modify security groups', 'Restart pods', 'Rollback deployments', 'Scale infrastructure'])}
            </div>
          </div>
          <!-- Chat (persists across all tabs) -->
          <div class="ws-chat">
            <div class="ws-chat-messages" id="ws-chat-messages"></div>
            <div class="ws-chat-input-area">
              <input type="text" class="ws-chat-input" id="ws-chat-input" placeholder="Ask the agent about this issue...">
              <button class="ws-chat-send" id="ws-chat-send">→</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  _renderPermissions(permissions) {
    return permissions.map(p => `
      <div class="perm-row">
        <span>${p}</span>
        <select><option>Ask me first</option><option>Allow</option><option>Block</option></select>
      </div>
    `).join('');
  }

  _renderScopedNodes(caseData) {
    const nodes = caseData.affectedNodes || [];
    if (nodes.length === 0) return '<p style="color:#8c8c94;padding:20px;text-align:center">No affected resources identified yet.</p>';

    return nodes.map((node, i) => {
      const errorClass = node.status === 'error' ? 'ws-node-error' : '';
      const iconImg = node.iconPath ? `<img src="${node.iconPath}" width="32" height="32">` : `<span class="ws-node-emoji">${node.icon || '📦'}</span>`;
      const tooltipData = node.tooltip ? `data-tooltip="${this._escapeAttr(JSON.stringify(node.tooltip))}"` : '';
      const card = `
        <div class="ws-node ${errorClass}" ${tooltipData}>
          <div class="ws-node-icon">${iconImg}</div>
          <div class="ws-node-name">${node.name}</div>
          <div class="ws-node-detail">${node.detail}</div>
        </div>`;
      const arrow = i < nodes.length - 1 ? '<div class="ws-node-arrow">→</div>' : '';
      return card + arrow;
    }).join('');
  }

  _escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  _bindTabs() {
    this.container.querySelectorAll('.workspace-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.container.querySelectorAll('.workspace-tab').forEach(t => t.classList.remove('active'));
        this.container.querySelectorAll('.workspace-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = this.container.querySelector(`#${tab.dataset.tab}`);
        if (target) target.classList.add('active');
      });
    });

    // Bind chat input
    const chatInput = this.container.querySelector('#ws-chat-input');
    const chatSend = this.container.querySelector('#ws-chat-send');
    const sendMessage = () => {
      const text = chatInput.value.trim();
      if (!text) return;
      this.addChatMessage({ actor: 'You', text, type: 'customer' });
      chatInput.value = '';
    };
    if (chatSend) chatSend.addEventListener('click', sendMessage);
    if (chatInput) chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  _bindNodeTooltips() {
    const nodes = this.container.querySelectorAll('.ws-node[data-tooltip]');
    let tooltip = document.getElementById('ws-node-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'ws-node-tooltip';
      tooltip.className = 'ws-node-tooltip';
      document.body.appendChild(tooltip);
    }

    nodes.forEach(node => {
      node.addEventListener('mouseenter', (e) => {
        const data = JSON.parse(node.dataset.tooltip);
        let html = `<h4>${data.type || data.name}</h4>`;
        if (data.info && data.info.length) {
          html += '<div class="ws-tooltip-info">';
          data.info.forEach(line => { html += `<div>${line}</div>`; });
          html += '</div>';
        }
        tooltip.innerHTML = html;
        tooltip.classList.add('visible');
      });

      node.addEventListener('mousemove', (e) => {
        let x = e.clientX + 12;
        let y = e.clientY + 12;
        if (x + 280 > window.innerWidth) x = e.clientX - 290;
        if (y + 180 > window.innerHeight) y = e.clientY - 140;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
      });

      node.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });
    });
  }

  _bindResolve() {
    const btn = this.container.querySelector('#resolve-case-btn');
    if (btn) {
      btn.addEventListener('click', () => this.resolve());
    }
  }
}
