addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    return new Response(INDEX_HTML, {
      headers: { 'Content-Type': 'text/html', ...corsHeaders },
    })
  } else if (url.pathname === '/style.css') {
    return new Response(STYLE_CSS, {
      headers: { 'Content-Type': 'text/css', ...corsHeaders },
    })
  } else if (url.pathname === '/script.js') {
    return new Response(SCRIPT_JS, {
      headers: { 'Content-Type': 'application/javascript', ...corsHeaders },
    })
  }

  if (url.pathname === '/api/messages') {
    if (request.method === 'GET') {
      return getMessages(corsHeaders)
    } else if (request.method === 'POST') {
      return postMessage(request, corsHeaders)
    }
  } else if (url.pathname.startsWith('/api/messages/') && request.method === 'DELETE') {
    const id = url.pathname.split('/').pop()
    return deleteMessage(id, corsHeaders)
  }

  return new Response('Not Found', { status: 404, headers: corsHeaders })
}

async function getMessages(corsHeaders) {
  try {
    const { keys } = await MESSAGES_KV.list()
    const messages = []
    const now = Date.now()
    const twelveHours = 12 * 60 * 60 * 1000

    for (const key of keys) {
      const value = await MESSAGES_KV.get(key.name)
      if (value) {
        const msg = JSON.parse(value)
        if (now - msg.timestamp < twelveHours) {
          messages.push(msg)
        } else {
          await MESSAGES_KV.delete(key.name)
        }
      }
    }

    messages.sort((a, b) => b.timestamp - a.timestamp)

    return new Response(JSON.stringify(messages), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch messages' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

async function postMessage(request, corsHeaders) {
  try {
    const { name, message } = await request.json()
    if (!message || message.trim() === '') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const id = crypto.randomUUID()
    const timestamp = Date.now()
    const messageObj = {
      id,
      name: name ? name.trim() : 'Anonymous',
      message: message.trim(),
      timestamp,
    }

    await MESSAGES_KV.put(id, JSON.stringify(messageObj), {
      expirationTtl: 12 * 60 * 60,
    })

    return new Response(JSON.stringify(messageObj), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

async function deleteMessage(id, corsHeaders) {
  try {
    await MESSAGES_KV.delete(id)
    return new Response(null, { status: 204, headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Note</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="app">
    <header class="sidebar">
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#10a37f"/>
          <path d="M8 16C8 11.5817 11.5817 8 16 8V8C20.4183 8 24 11.5817 24 16V24H16C11.5817 24 8 20.4183 8 16V16Z" fill="white"/>
        </svg>
        <span>Chat Note</span>
      </div>
      <p class="subtitle">Messages auto-delete after 12 hours</p>
      <button class="new-chat-btn" onclick="document.getElementById('message-input').focus()">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2V14M2 8H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        New Message
      </button>
    </header>
    
    <main class="chat-area">
      <div class="messages-container" id="messages-container">
        <div class="welcome-message">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="#10a37f"/>
            <path d="M12 24C12 17.3726 17.3726 12 24 12V12C30.6274 12 36 17.3726 36 24V36H24C17.3726 36 12 30.6274 12 24V24Z" fill="white"/>
          </svg>
          <h2>How can I help you today?</h2>
          <p>Leave a message for anyone to see. Messages are visible to anyone with the URL and auto-delete after 12 hours.</p>
        </div>
        <div id="messages-list"></div>
      </div>
      
      <div class="input-container">
        <form id="message-form">
          <div class="input-wrapper">
            <input type="text" id="name-input" placeholder="Your name (optional)">
            <textarea id="message-input" placeholder="Type your message..." rows="1" required></textarea>
            <button type="submit" id="send-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </form>
        <p class="disclaimer">Messages auto-delete after 12 hours</p>
      </div>
    </main>
  </div>
  
  <script src="/script.js"></script>
</body>
</html>`

const STYLE_CSS = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #202123;
  --bg-secondary: #2a2b32;
  --bg-tertiary: #343541;
  --bg-hover: #3e3f47;
  --border-color: #3e3f47;
  --text-primary: #ececf1;
  --text-secondary: #acacbe;
  --text-muted: #6e6e80;
  --accent: #10a37f;
  --accent-hover: #1a7f64;
  --danger: #ef4444;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg-primary: #ffffff;
    --bg-secondary: #f7f7f8;
    --bg-tertiary: #ffffff;
    --border-color: #e5e5e5;
    --text-primary: #343541;
    --text-secondary: #5e5e6e;
    --text-muted: #8e8ea0;
  }
}

body {
  font-family: 'Söhne', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  height: 100vh;
  overflow: hidden;
}

.app {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 260px;
  background: var(--bg-secondary);
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.logo svg {
  flex-shrink: 0;
}

.subtitle {
  font-size: 12px;
  color: var(--text-muted);
  padding: 0 12px;
  margin-bottom: 20px;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
}

.new-chat-btn:hover {
  background: var(--bg-hover);
  border-color: var(--text-muted);
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg-primary);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px 140px;
}

.welcome-message {
  text-align: center;
  padding: 60px 20px;
  max-width: 600px;
  margin: 0 auto;
}

.welcome-message svg {
  margin-bottom: 24px;
}

.welcome-message h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.welcome-message p {
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.6;
}

#messages-list {
  max-width: 768px;
  margin: 0 auto;
  padding: 0 16px;
}

.message {
  display: flex;
  gap: 16px;
  padding: 24px 0;
  border-bottom: 1px solid var(--border-color);
}

.message:last-child {
  border-bottom: none;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.message-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}

.message-time {
  font-size: 13px;
  color: var(--text-muted);
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.message-actions button {
  background: transparent;
  border: none;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-actions button:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.message-actions button.delete-btn:hover {
  color: var(--danger);
}

.message-text {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.input-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 24px 20px;
  background: var(--bg-primary);
  max-width: 100%;
  width: 100%;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg-primary);
  padding-bottom: 120px;
}

#message-form {
  width: 100%;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 16px;
  transition: border-color 0.2s;
}

.input-wrapper:focus-within {
  border-color: var(--accent);
}

#name-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-color);
  padding: 8px 0;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

#name-input:focus {
  outline: none;
  border-color: var(--accent);
}

#name-input::placeholder {
  color: var(--text-muted);
}

#message-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 15px;
  color: var(--text-primary);
  resize: none;
  max-height: 200px;
  line-height: 1.5;
  font-family: inherit;
}

#message-input:focus {
  outline: none;
}

#message-input::placeholder {
  color: var(--text-muted);
}

#send-btn {
  background: var(--accent);
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  color: white;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

#send-btn:hover {
  background: var(--accent-hover);
}

#send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.disclaimer {
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 8px;
  padding-bottom: env(safe-area-inset-bottom);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 1000;
}

.toast.show {
  opacity: 1;
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  
  .input-container {
    padding: 12px 12px 16px;
  }
  
  .input-wrapper {
    padding: 14px 14px;
    flex-wrap: wrap;
  }
  
  #name-input {
    width: 100%;
    margin-bottom: 10px;
  }
  
  #message-input {
    flex: none;
    width: calc(100% - 44px);
    min-height: 44px;
  }
  
  .message {
    gap: 12px;
    padding: 16px 0;
  }
  
  .message-avatar {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
  
  .welcome-message {
    padding: 40px 16px;
  }
  
  .welcome-message h2 {
    font-size: 20px;
  }
}`

const SCRIPT_JS = `let autoRefreshInterval;

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('message-form')
  const nameInput = document.getElementById('name-input')
  const messageInput = document.getElementById('message-input')
  const messagesList = document.getElementById('messages-list')
  const messagesContainer = document.getElementById('messages-container')
  const sendBtn = document.getElementById('send-btn')

  loadMessages()
  autoRefreshInterval = setInterval(loadMessages, 30000)

  messageInput.addEventListener('input', function() {
    this.style.height = 'auto'
    this.style.height = Math.min(this.scrollHeight, 200) + 'px'
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const name = nameInput.value.trim()
    const message = messageInput.value.trim()
    
    if (!message) {
      showToast('Please enter a message')
      return
    }
    
    sendBtn.disabled = true
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      })
      
      if (response.ok) {
        messageInput.value = ''
        messageInput.style.height = 'auto'
        loadMessages()
      } else {
        const error = await response.json()
        showToast(error.error || 'Failed to send message')
      }
    } catch (error) {
      showToast('Network error. Please try again.')
    } finally {
      sendBtn.disabled = false
    }
  })

  async function loadMessages() {
    try {
      const response = await fetch('/api/messages')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const messages = await response.json()
      renderMessages(messages)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  function renderMessages(messages) {
    const welcomeMsg = messagesContainer.querySelector('.welcome-message')
    
    if (messages.length === 0) {
      messagesList.innerHTML = ''
      if (!welcomeMsg) {
        messagesContainer.innerHTML = \`
          <div class="welcome-message">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="#10a37f"/>
              <path d="M12 24C12 17.3726 17.3726 12 24 12V12C30.6274 12 36 17.3726 36 24V36H24C17.3726 36 12 30.6274 12 24V24Z" fill="white"/>
            </svg>
            <h2>No messages yet</h2>
            <p>Be the first to leave a message!</p>
          </div>
          <div id="messages-list"></div>
        \`
      }
      return
    }

    if (welcomeMsg) {
      welcomeMsg.remove()
    }

    let html = ''
    for (const message of messages) {
      const avatarLetter = message.name.charAt(0).toUpperCase()
      html += \`
        <div class="message" data-id="\${message.id}">
          <div class="message-avatar">\${avatarLetter}</div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-name">\${escapeHtml(message.name)}</span>
              <span class="message-time">\${formatTimestamp(message.timestamp)}</span>
              <div class="message-actions">
                <button class="copy-btn" title="Copy message">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M3 13V3.5C3 2.67157 3.67157 2 4.5 2H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
                <button class="delete-btn" title="Delete message">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 5H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M7 5V3.5C7 2.67157 7.67157 2 8.5 2H9.5C10.3284 2 11 2.67157 11 3.5V5" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M14 5V14.5C14 15.3284 13.3284 16 12.5 16H5.5C4.67157 16 4 15.3284 4 14.5V5" stroke="currentColor" stroke-width="1.5"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="message-text">\${escapeHtml(message.message)}</div>
          </div>
        </div>
      \`
    }
    messagesList.innerHTML = html
    
    document.querySelectorAll('.message').forEach(messageEl => {
      const id = messageEl.dataset.id
      
      messageEl.querySelector('.copy-btn').addEventListener('click', async () => {
        const messageText = messageEl.querySelector('.message-text').textContent
        try {
          await navigator.clipboard.writeText(messageText)
          showToast('Copied to clipboard')
        } catch (err) {
          showToast('Failed to copy')
        }
      })
      
      messageEl.querySelector('.delete-btn').addEventListener('click', async () => {
        if (!confirm('Delete this message?')) return
        
        try {
          const response = await fetch('/api/messages/' + id, { method: 'DELETE' })
          
          if (response.ok) {
            messageEl.remove()
            if (messagesList.children.length === 0) {
              loadMessages()
            }
          } else {
            showToast('Failed to delete message')
          }
        } catch (error) {
          showToast('Network error')
        }
      })
    })
  }

  function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
  
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
    
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function showToast(message) {
    let toast = document.querySelector('.toast')
    if (!toast) {
      toast = document.createElement('div')
      toast.className = 'toast'
      document.body.appendChild(toast)
    }
    toast.textContent = message
    toast.classList.add('show')
    setTimeout(() => toast.classList.remove('show'), 2500)
  }
})`
