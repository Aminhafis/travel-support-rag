const chatContainer = document.getElementById('chatContainer');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const ingestBtn = document.getElementById('ingestBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// 1. Check Backend Health & Document Count
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    if (data.status === 'healthy') {
      statusDot.className = 'status-dot online';
      statusText.textContent = `Online (${data.documentChunksCount} policies)`;
    } else {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'Setup required';
    }
  } catch (err) {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Server offline';
  }
}

checkHealth();

// Format brackets like [Refund info] and links for Trip.com styling
function formatBotText(rawText) {
  if (!rawText) return '';
  // Highlight bracketed section headers e.g. [Refund info]
  let formatted = rawText.replace(/\[(.*?)\]/g, '<strong>[$1]</strong>');
  return formatted;
}

// 2. Append Chat Message (Trip.com Styling + Flight Ticket Inspector)
function appendMessage(text, sender, sources = []) {
  const msgWrapper = document.createElement('div');
  msgWrapper.className = `message-wrapper ${sender}`;

  if (sender === 'bot') {
    const authorTag = document.createElement('div');
    authorTag.className = 'bot-author';
    authorTag.innerHTML = `<span>✈️</span> Thaikootam Concierge`;
    msgWrapper.appendChild(authorTag);
  }

  const msgCard = document.createElement('div');
  msgCard.className = 'msg-card';
  if (sender === 'bot') {
    msgCard.innerHTML = formatBotText(text);
  } else {
    msgCard.textContent = text;
  }
  msgWrapper.appendChild(msgCard);

  // If bot returned sources, append the RAG Inspector drawer
  if (sender === 'bot' && sources && sources.length > 0) {
    const inspector = document.createElement('div');
    inspector.className = 'rag-inspector-tag';

    const toggle = document.createElement('div');
    toggle.className = 'rag-tag-header';
    toggle.innerHTML = `<span>🔍 Grounded Verification (${sources.length} policy files)</span> <span>▾</span>`;

    const drawer = document.createElement('div');
    drawer.className = 'rag-drawer';

    sources.forEach((src) => {
      const pct = Math.round(src.similarity * 100);
      const item = document.createElement('div');
      item.className = 'source-pill';
      item.innerHTML = `
        <div class="source-top">
          <span>📄 ${src.sourceFile}</span>
          <span class="pct-badge">${pct}% match</span>
        </div>
        <div style="font-weight: 600; font-size: 11px; margin-bottom: 2px; color: #374151;">${src.title}</div>
        <div class="source-quote">"${src.snippet}"</div>
      `;
      drawer.appendChild(item);
    });

    toggle.addEventListener('click', () => {
      drawer.classList.toggle('open');
      toggle.querySelector('span:last-child').textContent = drawer.classList.contains('open') ? '▴' : '▾';
    });

    inspector.appendChild(toggle);
    inspector.appendChild(drawer);
    msgWrapper.appendChild(inspector);
  }

  chatContainer.appendChild(msgWrapper);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 3. Handle Form Submit
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = userInput.value.trim();
  if (!query) return;

  appendMessage(query, 'user');
  userInput.value = '';
  userInput.disabled = true;
  sendBtn.disabled = true;

  // Placeholder thinking message
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message-wrapper bot';
  loadingDiv.innerHTML = `
    <div class="bot-author"><span>✈️</span> Thaikootam Concierge</div>
    <div class="msg-card" style="font-style: italic; color: #6b7280;">
      Searching verified travel policies & generating response... 🔍
    </div>
  `;
  chatContainer.appendChild(loadingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query })
    });

    const data = await res.json();
    chatContainer.removeChild(loadingDiv);

    if (data.error) {
      appendMessage(`⚠️ ${data.details || data.error}`, 'bot');
    } else {
      appendMessage(data.answer, 'bot', data.sources);
    }
  } catch (err) {
    chatContainer.removeChild(loadingDiv);
    appendMessage(`⚠️ Network error: ${err.message}`, 'bot');
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});

// Handle Enter to Send (Shift+Enter for new line)
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event('submit'));
  }
});

// 4. Quick Action Chips (Trip.com Style)
document.querySelectorAll('.action-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    userInput.value = chip.getAttribute('data-query');
    chatForm.dispatchEvent(new Event('submit'));
  });
});

// 5. Ingestion Button Handler
ingestBtn.addEventListener('click', async () => {
  if (!confirm('Re-index and vectorize all markdown policy documents in data/?')) return;

  ingestBtn.disabled = true;
  ingestBtn.innerHTML = '<span>⏳ Syncing...</span>';

  try {
    const res = await fetch('/api/ingest', { method: 'POST' });
    const data = await res.json();
    alert(data.message || 'Policies synchronized successfully!');
    checkHealth();
  } catch (err) {
    alert('Ingestion failed: ' + err.message);
  } finally {
    ingestBtn.disabled = false;
    ingestBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
      </svg>
      <span>Sync Policies</span>
    `;
  }
});

// 6. View Past Messages (Trip.com Header Feature)
clearHistoryBtn.addEventListener('click', () => {
  alert('Showing current session chat history. All messages are stored in active memory.');
});

// 7. Interactive Toolbar Buttons
document.querySelectorAll('.toolbar-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const title = btn.getAttribute('title');
    if (title.includes('Attach')) {
      userInput.value = `Referencing Booking #TK-7498750615: `;
      userInput.focus();
    } else if (title.includes('Translate')) {
      alert('Translation service: Responses are automatically delivered in the language you ask your question in!');
    } else if (title.includes('emoji')) {
      userInput.value += ' 🌴 ';
      userInput.focus();
    } else if (title.includes('screenshot')) {
      alert('Attach screenshot: Please describe your issue or paste error text into the box.');
    }
  });
});