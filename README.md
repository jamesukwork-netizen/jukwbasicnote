# Chat Note

A simple, beautiful chat note application where users can leave messages that automatically disappear after 12 hours. No login required - anyone can post and view messages via the URL.

## Features

- Clean, responsive UI similar to ChatGPT/Grok
- Messages automatically delete after 12 hours
- Optional display name for messages
- Copy-to-clipboard functionality for each message
- Manual delete button for each message
- Beautiful, modern design that works on all device sizes
- No database required - uses Cloudflare KV for storage
- Zero dependencies - pure HTML/CSS/JS

## Deployment

This application is designed to be deployed on Cloudflare Workers.

### Prerequisites

- [Node.js](https://nodejs.org/) installed
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed (`npm install -g wrangler`)
- A Cloudflare account

### Setup

1. Clone this repository
2. Install dependencies: `npm install`
3. Create a KV namespace: `wrangler kv:namespace create MESSAGES_KV`
4. Update `wrangler.toml` with your KV namespace ID
5. Deploy: `npm run deploy`

### Local Development

Run `npm run dev` to start a local development server.

## How It Works

- Messages are stored in Cloudflare KV with a 12-hour TTL (time-to-live)
- When a message is posted, it's automatically scheduled for deletion after 12 hours
- The UI fetches and displays all current messages
- Each message shows the timestamp and optional display name
- Users can copy messages to clipboard or delete them manually

## License

ISC