// Discord Web Client Application
class DiscordClient {
    constructor() {
        this.botToken = null;
        this.serverId = null;
        this.currentChannelId = null;
        this.channels = [];
        this.messages = [];
        this.currentGuild = null;
        this.editingMessageId = null;
        this.messagePollingInterval = null;
        
        this.init();
    }

    init() {
        // Check for saved credentials
        const savedToken = this.getCookie('discord_bot_token');
        const savedServerId = this.getCookie('discord_server_id');

        if (savedToken && savedServerId) {
            this.botToken = savedToken;
            this.serverId = savedServerId;
            this.connectToDiscord();
        } else {
            this.showSetupScreen();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Setup form
        document.getElementById('setup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSetup();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Send message
        document.getElementById('send-btn').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Emoji picker
        document.getElementById('emoji-btn').addEventListener('click', () => {
            this.toggleEmojiPicker();
        });

        // Edit channel button
        document.getElementById('edit-channel-btn').addEventListener('click', () => {
            this.showEditChannelModal();
        });

        // Edit message modal
        document.getElementById('save-edit-btn').addEventListener('click', () => {
            this.saveMessageEdit();
        });

        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            this.hideEditModal();
        });

        // Edit channel modal
        document.getElementById('save-channel-btn').addEventListener('click', () => {
            this.saveChannelEdit();
        });

        document.getElementById('cancel-channel-btn').addEventListener('click', () => {
            this.hideEditChannelModal();
        });

        // Close modals on background click
        document.getElementById('edit-modal').addEventListener('click', (e) => {
            if (e.target.id === 'edit-modal') {
                this.hideEditModal();
            }
        });

        document.getElementById('edit-channel-modal').addEventListener('click', (e) => {
            if (e.target.id === 'edit-channel-modal') {
                this.hideEditChannelModal();
            }
        });
    }

    showSetupScreen() {
        document.getElementById('setup-screen').classList.remove('hidden');
        document.getElementById('main-screen').classList.add('hidden');
    }

    showMainScreen() {
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
    }

    async handleSetup() {
        const token = document.getElementById('bot-token').value.trim();
        const serverId = document.getElementById('server-id').value.trim();
        const saveCredentials = document.getElementById('save-credentials').checked;

        if (!token || !serverId) {
            this.showError('setup-error', 'Please fill in all fields');
            return;
        }

        this.botToken = token;
        this.serverId = serverId;

        // Save credentials if requested
        if (saveCredentials) {
            this.setCookie('discord_bot_token', token, 30);
            this.setCookie('discord_server_id', serverId, 30);
        }

        try {
            await this.connectToDiscord();
        } catch (error) {
            this.showError('setup-error', 'Failed to connect: ' + error.message);
        }
    }

    async connectToDiscord() {
        try {
            // Fetch guild information
            this.currentGuild = await this.fetchGuild();
            document.getElementById('server-name').textContent = this.currentGuild.name;
            document.getElementById('server-name-initial').textContent = this.currentGuild.name.charAt(0).toUpperCase();

            // Fetch channels
            this.channels = await this.fetchChannels();
            this.renderChannels();

            // Select first text channel
            const firstTextChannel = this.channels.find(ch => ch.type === 0);
            if (firstTextChannel) {
                this.selectChannel(firstTextChannel.id);
            }

            this.showMainScreen();
        } catch (error) {
            throw new Error('Connection failed: ' + error.message);
        }
    }

    async fetchGuild() {
        const response = await fetch(`https://discord.com/api/v10/guilds/${this.serverId}`, {
            headers: {
                'Authorization': `Bot ${this.botToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch guild');
        }

        return await response.json();
    }

    async fetchChannels() {
        const response = await fetch(`https://discord.com/api/v10/guilds/${this.serverId}/channels`, {
            headers: {
                'Authorization': `Bot ${this.botToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch channels');
        }

        const channels = await response.json();
        // Filter and sort text channels
        return channels
            .filter(ch => ch.type === 0) // Text channels only
            .sort((a, b) => a.position - b.position);
    }

    renderChannels() {
        const channelsList = document.getElementById('channels-list');
        channelsList.innerHTML = '';

        this.channels.forEach(channel => {
            const channelItem = document.createElement('div');
            channelItem.className = 'channel-item';
            channelItem.dataset.channelId = channel.id;
            channelItem.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4406 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0306 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36325 20.5874C7.32088 20.8261 7.11337 21 6.87094 21H5.88657ZM9.41045 9L8.35045 15H14.3504L15.4104 9H9.41045Z"/>
                </svg>
                <span class="channel-name">${channel.name}</span>
            `;
            channelItem.addEventListener('click', () => {
                this.selectChannel(channel.id);
            });
            channelsList.appendChild(channelItem);
        });
    }

    async selectChannel(channelId) {
        // Clear previous polling
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
        }

        this.currentChannelId = channelId;
        const channel = this.channels.find(ch => ch.id === channelId);

        // Update UI
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-channel-id="${channelId}"]`)?.classList.add('active');

        document.getElementById('channel-name').textContent = `# ${channel.name}`;
        document.getElementById('message-input').placeholder = `Message #${channel.name}`;

        // Load messages
        await this.loadMessages();

        // Start polling for new messages every 3 seconds
        this.messagePollingInterval = setInterval(() => {
            this.loadMessages(true);
        }, 3000);
    }

    async loadMessages(silent = false) {
        if (!this.currentChannelId) return;

        try {
            const response = await fetch(`https://discord.com/api/v10/channels/${this.currentChannelId}/messages?limit=50`, {
                headers: {
                    'Authorization': `Bot ${this.botToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const messages = await response.json();
            this.messages = messages.reverse();
            
            if (!silent) {
                this.renderMessages();
            } else {
                // Only update if there are new messages
                const lastMessageId = this.messages.length > 0 ? this.messages[this.messages.length - 1].id : null;
                const newLastMessageId = messages.length > 0 ? messages[0].id : null;
                if (lastMessageId !== newLastMessageId) {
                    this.messages = messages.reverse();
                    this.renderMessages();
                }
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages() {
        const messagesContainer = document.getElementById('messages-container');
        const scrollAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop === messagesContainer.clientHeight;

        messagesContainer.innerHTML = '';

        if (this.messages.length === 0) {
            messagesContainer.innerHTML = '<div class="loading">No messages yet. Start the conversation!</div>';
            return;
        }

        this.messages.forEach(message => {
            const messageEl = this.createMessageElement(message);
            messagesContainer.appendChild(messageEl);
        });

        // Auto-scroll to bottom if user was already at bottom
        if (scrollAtBottom || messagesContainer.scrollTop === 0) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.dataset.messageId = message.id;

        // Escape HTML to prevent XSS
        const authorInitial = this.escapeHtml(message.author.username.charAt(0).toUpperCase());
        const authorUsername = this.escapeHtml(message.author.username);
        const timestamp = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <div class="message-avatar">${authorInitial}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${authorUsername}</span>
                    <span class="message-timestamp">${timestamp}</span>
                </div>
                <div class="message-text">${this.formatMessageContent(message.content)}</div>
            </div>
            <div class="message-actions">
                <button class="message-action-btn" onclick="discordClient.editMessage('${message.id}')" title="Edit">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                    </svg>
                </button>
                <button class="message-action-btn" onclick="discordClient.deleteMessage('${message.id}')" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                    </svg>
                </button>
            </div>
        `;

        return messageDiv;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatMessageContent(content) {
        // Basic formatting - escape HTML and convert URLs to links
        content = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        content = content.replace(urlRegex, '<a href="$1" target="_blank" style="color: #00b0f4;">$1</a>');
        
        return content;
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const content = input.value.trim();

        if (!content || !this.currentChannelId) return;

        try {
            const response = await fetch(`https://discord.com/api/v10/channels/${this.currentChannelId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bot ${this.botToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            input.value = '';
            await this.loadMessages();
        } catch (error) {
            alert('Failed to send message: ' + error.message);
        }
    }

    editMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;

        this.editingMessageId = messageId;
        document.getElementById('edit-message-input').value = message.content;
        document.getElementById('edit-modal').classList.remove('hidden');
    }

    async saveMessageEdit() {
        const newContent = document.getElementById('edit-message-input').value.trim();

        if (!newContent || !this.editingMessageId) return;

        try {
            const response = await fetch(`https://discord.com/api/v10/channels/${this.currentChannelId}/messages/${this.editingMessageId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bot ${this.botToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: newContent })
            });

            if (!response.ok) {
                throw new Error('Failed to edit message');
            }

            this.hideEditModal();
            await this.loadMessages();
        } catch (error) {
            alert('Failed to edit message: ' + error.message);
        }
    }

    hideEditModal() {
        document.getElementById('edit-modal').classList.add('hidden');
        this.editingMessageId = null;
    }

    async deleteMessage(messageId) {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const response = await fetch(`https://discord.com/api/v10/channels/${this.currentChannelId}/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bot ${this.botToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete message');
            }

            await this.loadMessages();
        } catch (error) {
            alert('Failed to delete message: ' + error.message);
        }
    }

    toggleEmojiPicker() {
        const picker = document.getElementById('emoji-picker');
        
        if (picker.classList.contains('hidden')) {
            this.renderEmojiPicker();
            picker.classList.remove('hidden');
        } else {
            picker.classList.add('hidden');
        }
    }

    renderEmojiPicker() {
        const picker = document.getElementById('emoji-picker');
        
        const emojis = [
            '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
            '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
            '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
            '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
            '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
            '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
            '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
            '👏', '🙌', '👐', '🤝', '🙏', '✍️', '💪', '🦾',
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
            '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
            '🔥', '💯', '✨', '⭐', '🌟', '💫', '🎉', '🎊'
        ];

        picker.innerHTML = `
            <div class="emoji-picker-title">Select an emoji</div>
            <div class="emoji-grid">
                ${emojis.map(emoji => `<div class="emoji-item" onclick="discordClient.insertEmoji('${emoji}')">${emoji}</div>`).join('')}
            </div>
        `;
    }

    insertEmoji(emoji) {
        const input = document.getElementById('message-input');
        input.value += emoji;
        input.focus();
        document.getElementById('emoji-picker').classList.add('hidden');
    }

    showEditChannelModal() {
        if (!this.currentChannelId) return;

        const channel = this.channels.find(ch => ch.id === this.currentChannelId);
        if (!channel) return;

        document.getElementById('channel-name-input').value = channel.name;
        document.getElementById('channel-topic-input').value = channel.topic || '';
        document.getElementById('edit-channel-modal').classList.remove('hidden');
        document.getElementById('channel-edit-error').textContent = '';
    }

    async saveChannelEdit() {
        const newName = document.getElementById('channel-name-input').value.trim();
        const newTopic = document.getElementById('channel-topic-input').value.trim();

        if (!newName) {
            this.showError('channel-edit-error', 'Channel name cannot be empty');
            return;
        }

        try {
            const response = await fetch(`https://discord.com/api/v10/channels/${this.currentChannelId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bot ${this.botToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    name: newName.toLowerCase().replace(/\s+/g, '-'),
                    topic: newTopic || null
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to edit channel');
            }

            this.hideEditChannelModal();
            
            // Refresh channels
            this.channels = await this.fetchChannels();
            this.renderChannels();
            
            // Update the channel name display without re-selecting (to avoid restarting polling)
            const channel = this.channels.find(ch => ch.id === this.currentChannelId);
            if (channel) {
                document.getElementById('channel-name').textContent = `# ${channel.name}`;
                document.getElementById('message-input').placeholder = `Message #${channel.name}`;
            }
        } catch (error) {
            this.showError('channel-edit-error', error.message);
        }
    }

    hideEditChannelModal() {
        document.getElementById('edit-channel-modal').classList.add('hidden');
    }

    logout() {
        // Clear cookies
        this.deleteCookie('discord_bot_token');
        this.deleteCookie('discord_server_id');

        // Clear polling
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
        }

        // Reset state
        this.botToken = null;
        this.serverId = null;
        this.currentChannelId = null;
        this.channels = [];
        this.messages = [];
        this.currentGuild = null;

        // Show setup screen
        this.showSetupScreen();
        
        // Clear form
        document.getElementById('bot-token').value = '';
        document.getElementById('server-id').value = '';
        document.getElementById('save-credentials').checked = false;
    }

    showError(elementId, message) {
        const errorEl = document.getElementById(elementId);
        errorEl.textContent = message;
    }

    // Cookie utilities
    setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    }

    getCookie(name) {
        const nameEQ = name + '=';
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    }
}

// Initialize the Discord client
let discordClient;
document.addEventListener('DOMContentLoaded', () => {
    discordClient = new DiscordClient();
});
