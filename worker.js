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

  // Serve static files
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

  // API routes
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

  // 404
  return new Response('Not Found', { status: 404, headers: corsHeaders })
}

async function getMessages(corsHeaders) {
  try {
    // List all keys in the KV namespace
    const { keys } = await MESSAGES_KV.list()
    const messages = []

    // Get each message
    for (const key of keys) {
      const value = await MESSAGES_KV.get(key.name)
      if (value) {
        messages.push(JSON.parse(value))
      }
    }

    // Sort by timestamp descending (newest first)
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

    // Store with 12-hour expiration (in seconds)
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

// Embedded static files
const INDEX_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Note</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Chat Note</h1>
      <p>Messages disappear after 12 hours</p>
    </header>
    
    <main>
      <form id="message-form">
        <div class="form-group">
          <input type="text" id="name-input" placeholder="Your name (optional)">
        </div>
        <div class="form-group">
          <textarea id="message-input" placeholder="Type your message here..." required></textarea>
        </div>
        <button type="submit">Send</button>
      </form>
      
      <div id="messages-list" class="messages-list">
        <!-- Messages will be inserted here -->
      </div>
    </main>
  </div>
  
  <script src="/script.js"></script>
</body>
</html>
`

const STYLE_CSS = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f5f5f5;
  color: #333;
  line-height: 1.6;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

header p {
  color: #7f8c8d;
}

.form-group {
  margin-bottom: 15px;
}

input, textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s;
}

input:focus, textarea:focus {
  outline: none;
  border-color: #3498db;
}

textarea {
  min-height: 100px;
  resize: vertical;
}

button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2980b9;
}

button:active {
  transform: scale(0.98);
}

.messages-list {
  margin-top: 30px;
}

.message {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.message-header .name {
  font-weight: 600;
  color: #2c3e50;
}

.message-header .timestamp {
  font-size: 0.9em;
  color: #95a5a6;
}

.message-header .actions {
  display: flex;
  gap: 10px;
}

.message-body {
  margin: 10px 0;
  line-height: 1.5;
}

.copy-icon, .delete-icon {
  width: 20px;
  height: 20px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.copy-icon:hover, .delete-icon:hover {
  opacity: 1;
}

.copy-icon {
  filter: invert(35%) sepia(62%) saturate(1402%) hue-rotate(194deg) brightness(95%) contrast(89%);
}

.delete-icon {
  filter: invert(54%) sepia(72%) saturate(2505%) hue-rotate(341deg) brightness(91%) contrast(89%);
}

@media (max-width: 600px) {
  .container {
    padding: 15px;
  }
  
  .message-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .message-header .actions {
    align-self: flex-end;
  }
}
`

const SCRIPT_JS = `
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('message-form')
  const nameInput = document.getElementById('name-input')
  const messageInput = document.getElementById('message-input')
  const messagesList = document.getElementById('messages-list')

  // Load messages on start
  loadMessages()

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const name = nameInput.value.trim()
    const message = messageInput.value.trim()
    
    if (!message) {
      alert('Please enter a message')
      return
    }
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, message }),
      })
      
      if (response.ok) {
        // Clear form
        messageInput.value = ''
        nameInput.value = ''
        // Reload messages
        loadMessages()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to send message')
      }
    } catch (error) {
      alert('Network error. Please try again.')
    }
  })

  // Load messages from API
  async function loadMessages() {
    try {
      const response = await fetch('/api/messages')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const messages = await response.json()
      renderMessages(messages)
    } catch (error) {
      console.error('Error loading messages:', error)
      messagesList.innerHTML = '<p class="error">Failed to load messages. Please try again later.</p>'
    }
  }

  // Render messages list
  function renderMessages(messages) {
    if (messages.length === 0) {
      messagesList.innerHTML = '<p class="empty">No messages yet. Be the first to leave one!</p>'
      return
    }
    
    let html = ''
    for (const message of messages) {
      html += '<div class="message" data-id="' + message.id + '">'
      html += '  <div class="message-header">'
      html += '    <span class="name">' + escapeHtml(message.name) + '</span>'
      html += '    <span class="timestamp">' + formatTimestamp(message.timestamp) + '</span>'
      html += '    <div class="actions">'
      html += '      <img class="copy-icon" src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Crect x=\'9\' y=\'9\' width=\'13\' height=\'13\' rx=\'2\' ry=\'2\'%3E%3C/rect%3E%3Cpath d=\'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1\'%3E%3C/path%3E%3C/svg%3E" alt="Copy">'
      html += '      <img class="delete-icon" src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M3 6h18\'%3E%3C/path%3E%3Cpath d=\'M19 9v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9\'%3E%3C/path%3E%3Cpath d=\'M10 11V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5\'%3E%3C/path%3E%3C/svg%3E" alt="Delete">'
      html += '    </div>'
      html += '  </div>'
      html += '  <div class="message-body">' + escapeHtml(message.message) + '</div>'
      html += '</div>'
    }
    messagesList.innerHTML = html
    
    // Add event listeners to new elements
    document.querySelectorAll('.message').forEach(messageEl => {
      const id = messageEl.dataset.id
      
      // Copy button
      messageEl.querySelector('.copy-icon').addEventListener('click', async () => {
        const messageText = messageEl.querySelector('.message-body').textContent
        try {
          await navigator.clipboard.writeText(messageText)
          // Show feedback
          const icon = messageEl.querySelector('.copy-icon')
          icon.style.opacity = '0.3'
          setTimeout(() => {
            icon.style.opacity = '0.7'
          }, 500)
        } catch (err) {
          alert('Failed to copy to clipboard')
        }
      })
      
      // Delete button
      messageEl.querySelector('.delete-icon').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this message?')) return
        
        try {
          const response = await fetch('/api/messages/' + id, {
            method: 'DELETE',
          })
          
          if (response.ok) {
            messageEl.remove()
            // If no messages left, show empty state
            if (messagesList.children.length === 0) {
              messagesList.innerHTML = '<p class="empty">No messages yet. Be the first to leave one!</p>'
            }
          } else {
            alert('Failed to delete message')
          }
        } catch (error) {
          alert('Network error. Please try again.')
        }
      })
    })
  }

  // Helper functions
  function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
  
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp)
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
})
`