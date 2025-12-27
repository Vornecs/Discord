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
        this.botUser = null;
        
        // Validation constants
        this.MIN_TOKEN_LENGTH = 59; // Discord bot tokens are typically 59+ characters
        this.SNOWFLAKE_REGEX = /^\d{17,19}$/; // Discord snowflake IDs are 17-19 digits
        
        // User settings
        this.settings = {
            displayName: '',
            avatarUrl: '',
            bannerUrl: '',
            aboutMe: '',
            accentColor: '#5865f2',
            theme: 'dark',
            compactMode: false,
            fontSize: 16
        };
        
        this.init();
    }

    init() {
        // Load user settings
        this.loadSettings();
        this.applySettings();
        
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

    /**
     * Helper function to parse error response data safely
     * @param {Response} response - The fetch response object
     * @returns {Promise<Object>} - Parsed error data or empty object
     */
    async parseErrorData(response) {
        try {
            return await response.json();
        } catch {
            return {};
        }
    }

    /**
     * Helper function to check if error is a network/CORS error
     * @param {Error} error - The error object
     * @returns {boolean} - True if it's a network error
     */
    isNetworkError(error) {
        return (error instanceof TypeError && error.message.includes('fetch')) || 
               error.message.includes('Failed to fetch');
    }

    /**
     * Helper function to handle fetch errors consistently
     * @param {Error} error - The error object from fetch
     * @throws {Error} - Throws a user-friendly error message
     */
    handleFetchError(error) {
        if (this.isNetworkError(error)) {
            throw new Error('Network error: Unable to connect to Discord API. This may be due to CORS restrictions. Try using a CORS proxy or running the app from a proper web server.');
        }
        throw error;
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('discord_client_settings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...parsed };
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
    }

    saveSettings() {
        localStorage.setItem('discord_client_settings', JSON.stringify(this.settings));
    }

    applySettings() {
        // Apply theme
        document.body.className = '';
        if (this.settings.theme !== 'dark') {
            document.body.classList.add(`theme-${this.settings.theme}`);
        }
        
        // Apply accent color
        document.documentElement.style.setProperty('--accent-color', this.settings.accentColor);
        document.documentElement.style.setProperty('--accent-color-hover', this.adjustColor(this.settings.accentColor, -20));
        document.documentElement.style.setProperty('--accent-color-light', this.hexToRgba(this.settings.accentColor, 0.2));
        
        // Apply font size
        document.documentElement.style.setProperty('--message-font-size', `${this.settings.fontSize}px`);
        
        // Apply compact mode
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.classList.toggle('compact', this.settings.compactMode);
        }
    }

    adjustColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettingsModal();
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

        // Settings modal
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal') {
                this.hideSettingsModal();
            }
        });

        document.getElementById('close-settings-btn').addEventListener('click', () => {
            this.hideSettingsModal();
        });

        document.getElementById('save-settings-btn').addEventListener('click', () => {
            this.saveSettingsFromModal();
        });

        document.getElementById('reset-settings-btn').addEventListener('click', () => {
            this.resetSettings();
        });

        // Settings tabs
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchSettingsTab(tab.dataset.tab);
            });
        });

        // Accent color picker
        document.getElementById('accent-color-input').addEventListener('input', (e) => {
            document.getElementById('accent-color-value').textContent = e.target.value;
        });

        // Font size slider
        document.getElementById('font-size-slider').addEventListener('input', (e) => {
            document.getElementById('font-size-value').textContent = `${e.target.value}px`;
        });

        // Avatar URL preview
        document.getElementById('avatar-url-input').addEventListener('input', (e) => {
            this.updateAvatarPreview(e.target.value);
        });

        // Banner URL preview
        document.getElementById('banner-url-input').addEventListener('input', (e) => {
            this.updateBannerPreview(e.target.value);
        });

        // Display name preview
        document.getElementById('display-name-input').addEventListener('input', (e) => {
            const displayName = e.target.value || this.botUser?.username || 'Username';
            document.getElementById('profile-display-name').textContent = displayName;
            document.getElementById('profile-avatar-initial').textContent = displayName.charAt(0).toUpperCase();
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

        // Basic validation for bot token format
        if (token.length < this.MIN_TOKEN_LENGTH) {
            this.showError('setup-error', `Invalid token format. Bot tokens are typically ${this.MIN_TOKEN_LENGTH}+ characters long.`);
            return;
        }

        // Basic validation for server/guild ID (should be a numeric snowflake)
        if (!this.SNOWFLAKE_REGEX.test(serverId)) {
            this.showError('setup-error', 'Invalid Guild ID format. Guild IDs should be 17-19 digit numbers.');
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
            // Fetch bot user information first
            this.botUser = await this.fetchBotUser();
            
            // Fetch guild information
            this.currentGuild = await this.fetchGuild();
            document.getElementById('server-name').textContent = this.currentGuild.name;
            
            // Update server icon
            const serverIcon = document.getElementById('current-server');
            if (this.currentGuild.icon) {
                serverIcon.innerHTML = `<img src="https://cdn.discordapp.com/icons/${this.currentGuild.id}/${this.currentGuild.icon}.png?size=128" alt="${this.currentGuild.name}">`;
            } else {
                document.getElementById('server-name-initial').textContent = this.currentGuild.name.charAt(0).toUpperCase();
            }

            // Fetch channels
            this.channels = await this.fetchChannels();
            this.renderChannels();

            // Select first text channel
            const firstTextChannel = this.channels.find(ch => ch.type === 0);
            if (firstTextChannel) {
                this.selectChannel(firstTextChannel.id);
            }

            // Update user panel with bot info
            this.updateUserPanel();

            this.showMainScreen();
        } catch (error) {
            throw new Error('Connection failed: ' + error.message);
        }
    }

    async fetchBotUser() {
        try {
            const response = await fetch('https://discord.com/api/v10/users/@me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bot ${this.botToken}`
                },
                mode: 'cors'
            });

            if (!response.ok) {
                const errorData = await this.parseErrorData(response);
                if (response.status === 401) {
                    throw new Error('Invalid bot token. Please check your token and try again.');
                }
                throw new Error(errorData.message || `Failed to fetch bot user (Status: ${response.status})`);
            }

            return await response.json();
        } catch (error) {
            this.handleFetchError(error);
        }
    }

    updateUserPanel() {
        // Use custom display name if set, otherwise use bot username
        const displayName = this.settings.displayName || this.botUser?.username || 'Bot User';
        
        // Update settings modal with bot info
        if (!this.settings.displayName && this.botUser) {
            document.getElementById('display-name-input').placeholder = this.botUser.username;
        }
        
        document.getElementById('profile-display-name').textContent = displayName;
        document.getElementById('profile-username-display').textContent = `@${this.botUser?.username || 'user'}`;
        document.getElementById('profile-avatar-initial').textContent = displayName.charAt(0).toUpperCase();
        
        // Update avatar in profile preview
        this.updateAvatarPreview(this.settings.avatarUrl);
        this.updateBannerPreview(this.settings.bannerUrl);
        
        // Update user panel in sidebar
        document.getElementById('user-panel-name').textContent = displayName;
        document.getElementById('user-panel-initial').textContent = displayName.charAt(0).toUpperCase();
        
        // Update user panel avatar
        const userPanelImg = document.getElementById('user-panel-avatar-img');
        const userPanelInitial = document.getElementById('user-panel-initial');
        
        const avatarUrl = this.settings.avatarUrl || 
            (this.botUser?.avatar ? `https://cdn.discordapp.com/avatars/${this.botUser.id}/${this.botUser.avatar}.png?size=64` : null);
        
        if (avatarUrl) {
            userPanelImg.src = avatarUrl;
            userPanelImg.classList.remove('hidden');
            userPanelInitial.classList.add('hidden');
            userPanelImg.onerror = () => {
                userPanelImg.classList.add('hidden');
                userPanelInitial.classList.remove('hidden');
            };
        } else {
            userPanelImg.classList.add('hidden');
            userPanelInitial.classList.remove('hidden');
        }
    }

    updateAvatarPreview(url) {
        const avatarImg = document.getElementById('profile-avatar-img');
        const avatarInitial = document.getElementById('profile-avatar-initial');
        
        if (url && url.trim()) {
            avatarImg.src = url;
            avatarImg.classList.remove('hidden');
            avatarInitial.classList.add('hidden');
            
            avatarImg.onerror = () => {
                avatarImg.classList.add('hidden');
                avatarInitial.classList.remove('hidden');
            };
        } else if (this.botUser?.avatar) {
            avatarImg.src = `https://cdn.discordapp.com/avatars/${this.botUser.id}/${this.botUser.avatar}.png?size=128`;
            avatarImg.classList.remove('hidden');
            avatarInitial.classList.add('hidden');
        } else {
            avatarImg.classList.add('hidden');
            avatarInitial.classList.remove('hidden');
        }
    }

    updateBannerPreview(url) {
        const banner = document.getElementById('profile-banner-preview');
        if (url && url.trim()) {
            banner.style.backgroundImage = `url(${url})`;
        } else {
            banner.style.backgroundImage = '';
        }
    }

    async fetchGuild() {
        try {
            const response = await fetch(`https://discord.com/api/v10/guilds/${this.serverId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bot ${this.botToken}`
                },
                mode: 'cors'
            });

            if (!response.ok) {
                const errorData = await this.parseErrorData(response);
                if (response.status === 404) {
                    throw new Error('Server not found. Please check your Guild ID or make sure the bot is a member of the server.');
                }
                if (response.status === 403) {
                    throw new Error('Access denied. Make sure the bot has proper permissions in the server.');
                }
                throw new Error(errorData.message || `Failed to fetch guild (Status: ${response.status})`);
            }

            return await response.json();
        } catch (error) {
            this.handleFetchError(error);
        }
    }

    async fetchChannels() {
        try {
            const response = await fetch(`https://discord.com/api/v10/guilds/${this.serverId}/channels`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bot ${this.botToken}`
                },
                mode: 'cors'
            });

            if (!response.ok) {
                const errorData = await this.parseErrorData(response);
                throw new Error(errorData.message || `Failed to fetch channels (Status: ${response.status})`);
            }

            const channels = await response.json();
            // Filter and sort text channels
            return channels
                .filter(ch => ch.type === 0) // Text channels only
                .sort((a, b) => a.position - b.position);
        } catch (error) {
            this.handleFetchError(error);
        }
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
                method: 'GET',
                headers: {
                    'Authorization': `Bot ${this.botToken}`
                },
                mode: 'cors'
            });

            if (!response.ok) {
                const errorData = await this.parseErrorData(response);
                throw new Error(errorData.message || `Failed to fetch messages (Status: ${response.status})`);
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
            // Log to console for debugging, but don't alert on every poll
            console.error('Error loading messages:', error);
            
            // Only show error in UI if this is the initial load (not silent polling)
            if (!silent) {
                const messagesContainer = document.getElementById('messages-container');
                if (messagesContainer) {
                    messagesContainer.innerHTML = '<div class="loading">Failed to load messages. Check console for details.</div>';
                }
            }
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

        const authorUsername = this.escapeHtml(message.author.username);
        const timestamp = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Get avatar URL
        let avatarHtml;
        if (message.author.avatar) {
            const avatarUrl = `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=64`;
            avatarHtml = `<img src="${avatarUrl}" alt="${authorUsername}" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
                          <span class="avatar-fallback hidden">${this.escapeHtml(message.author.username.charAt(0).toUpperCase())}</span>`;
        } else {
            avatarHtml = this.escapeHtml(message.author.username.charAt(0).toUpperCase());
        }

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatarHtml}</div>
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
                body: JSON.stringify({ content }),
                mode: 'cors'
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
                body: JSON.stringify({ content: newContent }),
                mode: 'cors'
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
                },
                mode: 'cors'
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
                }),
                mode: 'cors'
            });

            if (!response.ok) {
                const errorData = await this.parseErrorData(response);
                throw new Error(errorData.message || `Failed to edit channel (Status: ${response.status})`);
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
            // Handle CORS and network errors with user-friendly messages
            if (this.isNetworkError(error)) {
                this.showError('channel-edit-error', 'Network error: Unable to connect to Discord API. Check your connection and CORS configuration.');
            } else {
                this.showError('channel-edit-error', error.message);
            }
        }
    }

    hideEditChannelModal() {
        document.getElementById('edit-channel-modal').classList.add('hidden');
    }

    // Settings Modal Methods
    showSettingsModal() {
        // Populate settings form with current values
        document.getElementById('display-name-input').value = this.settings.displayName;
        document.getElementById('avatar-url-input').value = this.settings.avatarUrl;
        document.getElementById('banner-url-input').value = this.settings.bannerUrl;
        document.getElementById('about-me-input').value = this.settings.aboutMe;
        document.getElementById('accent-color-input').value = this.settings.accentColor;
        document.getElementById('accent-color-value').textContent = this.settings.accentColor;
        document.getElementById('font-size-slider').value = this.settings.fontSize;
        document.getElementById('font-size-value').textContent = `${this.settings.fontSize}px`;
        document.getElementById('compact-mode-checkbox').checked = this.settings.compactMode;
        
        // Set theme radio
        const themeRadio = document.querySelector(`input[name="theme"][value="${this.settings.theme}"]`);
        if (themeRadio) themeRadio.checked = true;
        
        // Update preview
        this.updateUserPanel();
        
        // Show modal
        document.getElementById('settings-modal').classList.remove('hidden');
        
        // Reset to profile tab
        this.switchSettingsTab('profile');
    }

    hideSettingsModal() {
        document.getElementById('settings-modal').classList.add('hidden');
    }

    switchSettingsTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    }

    saveSettingsFromModal() {
        // Gather all settings from the form
        this.settings.displayName = document.getElementById('display-name-input').value.trim();
        this.settings.avatarUrl = document.getElementById('avatar-url-input').value.trim();
        this.settings.bannerUrl = document.getElementById('banner-url-input').value.trim();
        this.settings.aboutMe = document.getElementById('about-me-input').value.trim();
        this.settings.accentColor = document.getElementById('accent-color-input').value;
        this.settings.fontSize = parseInt(document.getElementById('font-size-slider').value, 10);
        this.settings.compactMode = document.getElementById('compact-mode-checkbox').checked;
        
        const selectedTheme = document.querySelector('input[name="theme"]:checked');
        this.settings.theme = selectedTheme ? selectedTheme.value : 'dark';
        
        // Save to localStorage
        this.saveSettings();
        
        // Apply settings immediately
        this.applySettings();
        
        // Re-render messages if loaded
        if (this.messages.length > 0) {
            this.renderMessages();
        }
        
        // Close modal
        this.hideSettingsModal();
    }

    resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to defaults?')) return;
        
        this.settings = {
            displayName: '',
            avatarUrl: '',
            bannerUrl: '',
            aboutMe: '',
            accentColor: '#5865f2',
            theme: 'dark',
            compactMode: false,
            fontSize: 16
        };
        
        this.saveSettings();
        this.applySettings();
        
        // Re-populate the form
        this.showSettingsModal();
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
        this.botUser = null;

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
