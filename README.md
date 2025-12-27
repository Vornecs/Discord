# Discord Web Client

A web-based Discord client that connects via a bot token to provide a full-featured Discord experience directly in your browser.

## Features

- 🔐 **Secure Authentication**: Connect using your Discord bot token
- 💬 **Message Management**: Send, edit, and delete messages
- 😊 **Emoji Support**: Built-in emoji picker with common emojis
- 📝 **Channel Navigation**: Browse and switch between text channels
- ⚙️ **Channel Editing**: Modify channel names and topics (with proper permissions)
- 🍪 **Cookie Support**: Optionally save credentials for quick access
- 🎨 **Discord-like UI**: Familiar interface that matches the Discord app
- 🔄 **Real-time Updates**: Auto-refresh messages every 3 seconds

## Getting Started

### Prerequisites

1. A Discord bot token (create one at [Discord Developer Portal](https://discord.com/developers/applications))
2. The bot must be added to your server with appropriate permissions:
   - Read Messages/View Channels
   - Send Messages
   - Manage Messages
   - Manage Channels (if you want to edit channels)

### Installation

1. Clone this repository or download the files
2. Open `index.html` in a modern web browser
3. Enter your bot token and server/guild ID
4. Optionally check "Save credentials" to store them in cookies
5. Click "Connect" to start using the client

### How to Get Server ID

1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click on your server name
3. Click "Copy ID"

## Usage

### Messaging

- **Send**: Type your message and press Enter or click the send button
- **Edit**: Hover over a message and click the edit icon
- **Delete**: Hover over a message and click the delete icon
- **Emojis**: Click the emoji button to open the emoji picker

### Channel Management

- **Browse Channels**: Click on any channel in the sidebar to switch
- **Edit Channel**: Click the edit icon in the channel header (requires Manage Channels permission)

### Security

- Your bot token is stored locally in cookies (if you choose to save it)
- The token is never sent to any third-party servers
- All communication goes directly to Discord's API

## File Structure

```
Discord/
├── index.html      # Main HTML structure
├── styles.css      # Discord-themed styling
├── app.js          # Application logic and Discord API integration
├── README.md       # This file
└── LICENSE         # License information
```

## Technical Details

- Built with vanilla JavaScript (no frameworks required)
- Uses Discord API v10
- Responsive design for various screen sizes
- Auto-polling for new messages every 3 seconds

## Limitations

- Bot accounts cannot receive DMs from users
- Some Discord features (like voice chat) are not available to bots
- Rate limiting applies as per Discord API guidelines
- Messages are fetched with a limit of 50 per channel

## Browser Compatibility

Works on all modern browsers that support:
- ES6+ JavaScript
- Fetch API
- CSS Grid and Flexbox

## License

See LICENSE file for details.

## Troubleshooting

**Connection Failed - CORS Error**: 
The Discord API does not support direct browser requests due to CORS (Cross-Origin Resource Sharing) restrictions. To use this client, you have a few options:
1. Use a CORS proxy service (e.g., cors-anywhere)
2. Run the app through a local web server with a proxy
3. Use a browser extension that disables CORS (for development only)
4. Deploy to a server with a backend proxy

**Invalid Bot Token**: Verify your bot token is correct and hasn't been regenerated. Bot tokens are typically 59+ characters long.

**Invalid Guild ID**: Make sure you're using the correct server/guild ID (a 17-19 digit number). Enable Developer Mode in Discord to copy the ID.

**Cannot Send Messages**: Ensure your bot has "Send Messages" permission in the channel

**Cannot Edit Channel**: Verify your bot has "Manage Channels" permission

**Messages Not Updating**: Check browser console for API errors or rate limiting
