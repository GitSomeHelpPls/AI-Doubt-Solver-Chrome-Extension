// contentScript.js
(function() {
  console.log("Gemini Problem Solver extension loaded");

  // Store code changes
  let codeHistory = [];
  let lastCodeUpdate = null;
  let updateTimeout = null;
  const UPDATE_DELAY = 500; // Delay in ms before saving code changes
  let currentEditorCode = null;

  // Load code history from storage on startup
  function loadCodeHistory() {
    // First try to get from sessionStorage
    const sessionCode = sessionStorage.getItem('geminiCodeHistory');
    if (sessionCode) {
      codeHistory = JSON.parse(sessionCode);
      // Save to local storage
      chrome.storage.local.set({
        'geminiCodeHistory': sessionCode
      });
    } else {
      // Fall back to chrome storage if not in session
      chrome.storage.local.get(['geminiCodeHistory'], function(result) {
        if (result.geminiCodeHistory) {
          codeHistory = JSON.parse(result.geminiCodeHistory);
          // Save to session storage
          sessionStorage.setItem('geminiCodeHistory', result.geminiCodeHistory);
        }
      });
    }
  }

  // Save code history to storage
  function saveCodeHistory() {
    const codeHistoryStr = JSON.stringify(codeHistory);
    // Save to both session and chrome storage
    sessionStorage.setItem('geminiCodeHistory', codeHistoryStr);
    chrome.storage.local.set({
      'geminiCodeHistory': codeHistoryStr
    }, function() {
      console.log('Code history saved');
      // After saving, immediately update the UI
      updateCodeDisplay();
    });
  }

  // Update code display in UI
  function updateCodeDisplay() {
    // Find any code display elements that need updating
    const codeDisplays = document.querySelectorAll('.code-display');
    if (codeDisplays.length && codeHistory.length) {
      const latestCode = codeHistory[codeHistory.length - 1].code;
      codeDisplays.forEach(display => {
        // Only update if content has changed
        if (display.textContent !== latestCode) {
          display.textContent = latestCode;
        }
      });
    }
  }

  // Track code changes with debouncing
  function trackCodeChanges(event) {
    // Check if element has monaco-editor class
    if (event.target.closest('.monaco-editor')) {
      const editor = event.target.closest('.monaco-editor');
      const code = editor.textContent;
      currentEditorCode = code;  // Store current code
      
      // Clear existing timeout
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      // Set new timeout to update after delay
      updateTimeout = setTimeout(() => {
        const timestamp = new Date().toISOString();
        
        // Only update if code has changed
        if (code !== lastCodeUpdate) {
          lastCodeUpdate = code;
          
          codeHistory.push({
            timestamp,
            code,
            element: 'monaco-editor',
            className: editor.className,
            url: window.location.href
          });

          // Save and update UI
          saveCodeHistory();
          console.log('Code updated:', code.substring(0, 100) + '...');
          
          // Update the current editor code
          currentEditorCode = code;
        }
      }, UPDATE_DELAY);
    }
  }

  // Track test/submit button clicks
  function trackTestSubmit(event) {
    // Look for test/submit buttons
    if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT') {
      const buttonText = (event.target.textContent || event.target.value || '').toLowerCase();
      if (buttonText.includes('test') || buttonText.includes('submit') || buttonText.includes('run')) {
        
        // Find the monaco editor
        const codeEditor = document.querySelector('.monaco-editor');
                          
        if (codeEditor) {
          const timestamp = new Date().toISOString();
          const code = codeEditor.textContent;
          
          // Only update if code has changed
          if (code !== lastCodeUpdate) {
            lastCodeUpdate = code;
            
            codeHistory.push({
              timestamp,
              code,
              element: 'monaco-editor',
              className: codeEditor.className,
              url: window.location.href,
              action: buttonText
            });

            // Save and update UI immediately
            saveCodeHistory();
            console.log('Code updated after test/submit');
          }
        }
      }
    }
  }

  // Add code tracking listeners for real-time updates
  document.addEventListener('input', trackCodeChanges);    // Track typing
  document.addEventListener('keyup', trackCodeChanges);    // Track keyboard input
  document.addEventListener('change', trackCodeChanges);   // Track other changes
  document.addEventListener('paste', trackCodeChanges);    // Track paste events
  document.addEventListener('drop', trackCodeChanges);     // Track drag and drop

  // Create and inject the button
  function createHelpButton() {
    console.log("Attempting to create help button");
    
    // Check if button already exists to avoid duplicates
    if (document.getElementById('gemini-help-button')) {
      console.log("Button already exists");
      return;
    }
    
    const button = document.createElement('button');
    button.id = 'gemini-help-button';
    button.className = 'ant-btn css-19gw05y ant-btn-text undefined coding_buttonhover__vSpmu me-2';
    
    // Add button content with icon and text
    button.innerHTML = `
      <span style="display: flex; align-items: center; gap: 6px;">
        <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"></path>
        </svg>
        <span>Solve with AI</span>
      </span>
    `;
    
    // Find the test case panel navigation container
    const targetContainer = document.querySelector('.coding_test_case_pannel_nav_buttons__pY8xT .d-flex.gap-2');
    if (targetContainer) {
      // Insert button after the "Manual Tests" button
      targetContainer.appendChild(button);
      console.log("Help button created and added to test case panel");
    } else {
      console.log("Target test case panel container not found");
    }
    
    // Add click event listener
    button.addEventListener('click', toggleChatbox);
  }
  
  // Add these color mapping functions
  function getThemeColors() {
    const computedStyle = getComputedStyle(document.documentElement);
    const isDarkMode = document.documentElement.classList.contains('dark') || 
                      document.body.classList.contains('dark') ||
                      computedStyle.getPropertyValue('--is-dark').includes('true') ||
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    return {
        buttonGradient1: computedStyle.getPropertyValue('--gradient_dark_button_color_1').trim() || 'hsla(0, 0%, 100%, .6)',
        buttonGradient2: computedStyle.getPropertyValue('--gradient_dark_button_color_2').trim() || '#eaf1fd',
        background: isDarkMode ? '#2b384e' : '#ffffff',
        darkBackground: isDarkMode ? '#1e2736' : '#f0f0f0',
        text: isDarkMode ? '#eaf1fd' : '#000000',
        messageBackground: isDarkMode ? '#2b384e' : '#f8f9fa',
        messageText: isDarkMode ? '#eaf1fd' : '#000000',
        userMessageBackground: isDarkMode ? '#1e2736' : '#e9ecef',
        userMessageText: isDarkMode ? '#eaf1fd' : '#000000',
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
    };
  }

  function updateChatboxTheme() {
    const colors = getThemeColors();
    const chatbox = document.getElementById('gemini-chatbox');
    if (!chatbox) return;

    // Update main chatbox
    chatbox.style.backgroundColor = colors.background;

    // Update header
    const header = chatbox.querySelector('.gemini-header');
    if (header) {
      header.style.backgroundColor = colors.darkBackground;
      header.style.color = colors.text;
    }

    // Update buttons
    const buttons = chatbox.querySelectorAll('#gemini-send');
    buttons.forEach(button => {
      button.style.background = `linear-gradient(to right, ${colors.buttonGradient1}, ${colors.buttonGradient2})`;
      button.style.color = colors.background;
    });

    // Update input area
    const textarea = chatbox.querySelector('#gemini-input');
    if (textarea) {
      textarea.style.backgroundColor = colors.darkBackground;
      textarea.style.color = colors.text;
      textarea.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    }

    // Update messages container
    const messagesDiv = chatbox.querySelector('#gemini-messages');
    if (messagesDiv) {
      messagesDiv.style.color = colors.text;
    }

    // Update scrollbar colors
    const scrollableElements = [messagesDiv, textarea].filter(Boolean);
    scrollableElements.forEach(element => {
      element.style.scrollbarColor = `rgba(234, 241, 253, 0.3) ${colors.darkBackground}`;
      element.style.cssText += `
        &::-webkit-scrollbar-track {
          background: ${colors.darkBackground};
        }
        &::-webkit-scrollbar-thumb {
          background: rgba(234, 241, 253, 0.3);
        }
        &::-webkit-scrollbar-thumb:hover {
          background: rgba(234, 241, 253, 0.5);
        }
      `;
    });

    const scrollButton = document.getElementById('gemini-scroll-bottom');
    if (scrollButton) {
        scrollButton.style.background = `linear-gradient(to right, ${colors.buttonGradient1}, ${colors.buttonGradient2})`;
        scrollButton.style.color = colors.background;
    }
  }

  // Modify createChatbox to use theme colors
  function createChatbox() {
    const colors = getThemeColors();
    const chatbox = document.createElement('div');
    chatbox.id = 'gemini-chatbox';
    chatbox.className = 'gemini-chatbox';
    
    // Add initial state for animation
    chatbox.style.position = 'fixed';
    chatbox.style.bottom = '10px';
    chatbox.style.left = '80px';
    chatbox.style.width = '420px';
    chatbox.style.height = '500px';
    chatbox.style.backgroundColor = colors.background;
    chatbox.style.borderRadius = '16px';
    chatbox.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    chatbox.style.display = 'flex';
    chatbox.style.flexDirection = 'column';
    chatbox.style.zIndex = '10000';
    chatbox.style.overflow = 'hidden';
    
    // Add animation properties
    chatbox.style.opacity = '0';
    chatbox.style.transform = 'translateY(20px)';
    chatbox.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    
    chatbox.innerHTML = `
      <div class="gemini-header" style="
        background-color: ${colors.darkBackground}; 
        color: ${colors.text}; 
        padding: 10px 15px; 
        display: flex; 
        justify-content: space-between; 
        align-items: center;
        cursor: move;
        user-select: none;
      ">
        <h3 style="margin: 0; font-size: 16px;">Gemini Problem Solver</h3>
        <div>
          <button id="gemini-clear" style="background: none; border: none; color: rgba(255, 255, 255, 0.6); font-size: 14px; cursor: pointer; padding: 0 5px; margin-right: 5px; transition: color 0.2s;">Clear</button>
          <button id="gemini-close" style="background: none; border: none; color: rgba(255, 255, 255, 0.6); font-size: 20px; cursor: pointer; padding: 0 5px; transition: color 0.2s;">×</button>
        </div>
      </div>
      <div id="gemini-messages" class="gemini-messages" style="
        flex-grow: 1;
        padding: 10px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
        color: ${colors.text};
        
        /* Webkit Scrollbar Styles */
        &::-webkit-scrollbar {
          width: 14px;
          background-color: transparent;
        }
        &::-webkit-scrollbar-thumb {
          background-color: rgba(234, 241, 253, 0.2);
          border-radius: 10px;
          border: 4px solid ${colors.background};
          min-height: 40px;
        }
        &::-webkit-scrollbar-thumb:hover {
          background-color: rgba(234, 241, 253, 0.3);
        }
        &::-webkit-scrollbar-track {
          background-color: transparent;
          border-radius: 10px;
        }
        
        /* Firefox Scrollbar Styles */
        scrollbar-width: thin;
        scrollbar-color: rgba(234, 241, 253, 0.2) transparent;
      ">
        <style>
          #gemini-messages::-webkit-scrollbar {
            width: 14px;
            background-color: transparent;
          }
          #gemini-messages::-webkit-scrollbar-thumb {
            background-color: rgba(234, 241, 253, 0.2);
            border-radius: 10px;
            border: 4px solid ${colors.background};
            min-height: 40px;
          }
          #gemini-messages::-webkit-scrollbar-thumb:hover {
            background-color: rgba(234, 241, 253, 0.3);
          }
          #gemini-messages::-webkit-scrollbar-track {
            background-color: transparent;
            border-radius: 10px;
          }
        </style>
      </div>
      <div class="gemini-input-container" style="
        display: flex;
        align-items: flex-end;
        padding: 10px;
        background-color: ${colors.darkBackground};
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      ">
        <textarea id="gemini-input" placeholder="Ask about this problem..." style="
          flex: 1;
          background-color: ${colors.background};
          color: #eaf1fd;
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          line-height: 1.4;
          resize: none;
          overflow-y: auto;
          min-height: 40px;
          max-height: 120px;
          margin-right: 8px;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
          outline: none; /* Remove default focus outline */
          transition: background-color 0.2s ease;

          &::-webkit-scrollbar {
            display: none;
          }

          &:focus {
            background-color: ${colors.darkBackground}; /* Subtle background change on focus */
            outline: none; /* Ensure no outline on focus */
            box-shadow: none; /* Remove any focus shadow */
            border: none; /* Ensure no border appears */
          }
        "></textarea>
        <div style="display: flex; gap: 12px;">
          <button id="gemini-send" style="
            background: linear-gradient(to right, ${colors.buttonGradient1}, ${colors.buttonGradient2});
            color: ${colors.background};
            border: none;
            z-index: 100000000000;
            border-radius: 12px;
            padding: 10px 20px;
            font-weight: 600;
            cursor: pointer;
            flex-grow: 1;
            transition: transform 0.2s, opacity 0.2s;
            &:hover {
              opacity: 0.9;
              transform: translateY(-1px);
            }
            &:active {
              transform: translateY(0);
            }
          ">Send</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(chatbox);
    
    // Add drag functionality
    makeDraggable(chatbox);
    
    // Add event listeners
    document.getElementById('gemini-close').addEventListener('click', toggleChatbox);
    document.getElementById('gemini-send').addEventListener('click', sendMessage);
    document.getElementById('gemini-clear').addEventListener('click', clearChatHistory);
    document.getElementById('gemini-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Automatically extract problem details
    const problemDetails = extractProblemDetails();
    if (problemDetails.description.length > 100) {
        window.geminiProblemDetails = problemDetails;
        addMessage("Gemini", "I've analyzed the current problem. How can I help you with it?");
    } else {
        // If initial extraction fails, set up an observer to wait for content
        watchForProblemContent();
    }
    
    // Load chat history
    loadChatHistory();
    
    // Add theme observer
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme') {
                updateChatboxTheme();
            }
        });
    });
    
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
    });
    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
    });
    
    const scrollButton = createScrollButton();
    chatbox.appendChild(scrollButton);
    
    // Trigger animation
    setTimeout(() => {
        chatbox.style.opacity = '1';
        chatbox.style.transform = 'translateY(0)';
    }, 50);
  }
  
  // Function to save chat messages
  function saveMessage(sender, text) {
    chrome.storage.local.get(['chatHistory'], function(result) {
      let chatHistory = result.chatHistory || [];
      
      // Create page-specific key based on current URL
      const pageUrl = window.location.href;
      
      chatHistory.push({
        sender: sender,
        text: text,
        timestamp: new Date().toISOString(),
        page: pageUrl
      });
      
      chrome.storage.local.set({ chatHistory: chatHistory }, function() {
        console.log("Message saved to chat history");
      });
    });
  }
  
  // Function to load chat history
  function loadChatHistory() {
    console.log("Loading chat history");
    
    chrome.storage.local.get(['chatHistory'], function(result) {
        const messagesDiv = document.getElementById('gemini-messages');
        if (!messagesDiv) {
            console.error("Messages div not found");
            return;
        }
        
        // Clear existing messages
        messagesDiv.innerHTML = '';
        
        const pageUrl = window.location.href;
        let chatHistory = result.chatHistory || [];
        const pageMessages = chatHistory.filter(msg => msg.page === pageUrl);
        
        console.log(`Found ${pageMessages.length} messages for current page`);
        
        // Display messages
        pageMessages.forEach(message => {
            const colors = getThemeColors();
            const messageDiv = document.createElement('div');
            messageDiv.className = `gemini-message ${message.sender.toLowerCase()}`;
            messageDiv.style.display = 'flex';
            messageDiv.style.flexDirection = 'column';
            messageDiv.style.maxWidth = '85%';
            messageDiv.style.padding = '8px 12px';
            messageDiv.style.borderRadius = '12px';
            messageDiv.style.marginBottom = '4px';
            
            // Set colors and alignment based on sender
            if (message.sender.toLowerCase() === 'you') {
                messageDiv.style.backgroundColor = colors.userMessageBackground;
                messageDiv.style.color = colors.userMessageText;
                messageDiv.style.alignSelf = 'flex-end';
                messageDiv.style.borderBottomRightRadius = '4px';
            } else {
                messageDiv.style.backgroundColor = colors.messageBackground;
                messageDiv.style.color = colors.messageText;
                messageDiv.style.alignSelf = 'flex-start';
                messageDiv.style.borderBottomLeftRadius = '4px';
            }
            
            // Add sender name
            const senderSpan = document.createElement('span');
            senderSpan.className = 'gemini-sender';
            senderSpan.style.fontWeight = '600';
            senderSpan.style.fontSize = '11px';
            senderSpan.style.marginBottom = '2px';
            senderSpan.style.opacity = '0.8';
            senderSpan.style.color = message.sender.toLowerCase() === 'you' ? colors.userMessageText : colors.messageText;
            senderSpan.textContent = message.sender;
            
            // Add message text
            const textSpan = document.createElement('span');
            textSpan.className = 'gemini-text';
            textSpan.style.fontSize = '14px';
            textSpan.style.lineHeight = '1.4';
            textSpan.style.color = message.sender.toLowerCase() === 'you' ? colors.userMessageText : colors.messageText;
            textSpan.innerHTML = formatMessage(message.text);
            
            messageDiv.appendChild(senderSpan);
            messageDiv.appendChild(textSpan);
            messagesDiv.appendChild(messageDiv);

            // Update code block styles
            const codeBlocks = messageDiv.querySelectorAll('.gemini-code-block');
            codeBlocks.forEach(block => {
                block.style.backgroundColor = colors.darkBackground;
                block.style.color = colors.text;
                block.style.border = `1px solid ${colors.borderColor}`;
            });
        });
        
        // Force scroll to bottom after loading history
        forceScrollToBottom();
    });
  }
  
  // Update addMessageToUI to scroll to the start of new messages
  function addMessageToUI(sender, text) {
    const colors = getThemeColors();
    const messagesDiv = document.getElementById('gemini-messages');
    if (!messagesDiv) {
        console.error("Messages div not found");
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `gemini-message ${sender.toLowerCase()}`;
    messageDiv.style.display = 'flex';
    messageDiv.style.flexDirection = 'column';
    messageDiv.style.maxWidth = '85%';
    messageDiv.style.padding = '8px 12px';
    messageDiv.style.borderRadius = '12px';
    messageDiv.style.marginBottom = '4px';
    messageDiv.style.transition = 'transform 0.2s';
    
    // Set colors based on sender and theme
    if (sender.toLowerCase() === 'you') {
        messageDiv.style.backgroundColor = colors.userMessageBackground;
        messageDiv.style.color = colors.userMessageText;
        messageDiv.style.alignSelf = 'flex-end';
        messageDiv.style.borderBottomRightRadius = '4px';
    } else {
        messageDiv.style.backgroundColor = colors.messageBackground;
        messageDiv.style.color = colors.messageText;
        messageDiv.style.alignSelf = 'flex-start';
        messageDiv.style.borderBottomLeftRadius = '4px';
    }
    
    const senderSpan = document.createElement('span');
    senderSpan.className = 'gemini-sender';
    senderSpan.style.fontWeight = '600';
    senderSpan.style.fontSize = '11px';
    senderSpan.style.marginBottom = '2px';
    senderSpan.style.opacity = '0.8';
    senderSpan.style.color = sender.toLowerCase() === 'you' ? colors.userMessageText : colors.messageText;
    senderSpan.textContent = sender;
    
    const textSpan = document.createElement('span');
    textSpan.className = 'gemini-text';
    textSpan.style.fontSize = '14px';
    textSpan.style.lineHeight = '1.4';
    textSpan.style.color = sender.toLowerCase() === 'you' ? colors.userMessageText : colors.messageText;
    textSpan.innerHTML = formatMessage(text);
    
    messageDiv.appendChild(senderSpan);
    messageDiv.appendChild(textSpan);
    
    messagesDiv.appendChild(messageDiv);

    // Update code block styles for light mode
    const codeBlocks = messageDiv.querySelectorAll('.gemini-code-block');
    codeBlocks.forEach(block => {
        block.style.backgroundColor = colors.darkBackground;
        block.style.color = colors.text;
        block.style.border = `1px solid ${colors.borderColor}`;
    });

    // Only scroll to message if it's a user message
    if (sender.toLowerCase() === 'you') {
        setTimeout(() => {
            const topPosition = messageDiv.offsetTop - 20;
            messagesDiv.scroll({
                top: topPosition,
                behavior: 'smooth'
            });
        }, 0);
    }

    return messageDiv;
  }
  
  // Function to add message to UI and save to storage
  function addMessage(sender, text) {
    // Add to UI
    addMessageToUI(sender, text);
    
    // Save to storage
    saveMessage(sender, text);
    
    // Scroll to the new message
    scrollToLatestMessage();
  }
  
  // Clear chat history function
  function clearChatHistory() {
    console.log("Clearing chat history");
    
    // Get current page URL
    const pageUrl = window.location.href;
    
    chrome.storage.local.get(['chatHistory'], function(result) {
      let chatHistory = result.chatHistory || [];
      
      // Keep messages from other pages
      const otherPagesMessages = chatHistory.filter(msg => msg.page !== pageUrl);
      
      // Update storage with filtered messages
      chrome.storage.local.set({ chatHistory: otherPagesMessages }, function() {
        console.log("Chat history cleared for current page");
        
        // Clear UI
        const messagesDiv = document.getElementById('gemini-messages');
        if (messagesDiv) {
          messagesDiv.innerHTML = '';
        }
        
        // Add initial message
        addMessage("Gemini", "I'm ready to help with your coding problem. Please ask a specific question when you're ready.");
      });
    });
  }
  
  // Handle extract problem button click
  function handleExtractProblem() {
    // Get the current selection
    const selection = window.getSelection();
    let selectedText = '';
    
    if (selection.rangeCount > 0) {
      selectedText = selection.toString();
    }
    
    if (selectedText.length > 50) {
      // User has selected text, use it as the problem description
      console.log("Using selected text as problem description");
      
      const problemDetails = {
        title: document.title || "Selected Problem",
        description: selectedText,
        url: window.location.href
      };
      
      window.geminiProblemDetails = problemDetails;
      
      // Notify user that problem is extracted but don't analyze automatically
      addMessage("Gemini", "Problem details extracted. You can now ask specific questions about this code problem.");
    } else {
      // No text selected, try manual extraction
      console.log("No text selected, trying manual extraction");
      
      const problemDetails = extractProblemDetails();
      if (problemDetails.description.length > 100) {
        // Add message about the extraction but don't analyze
        addMessage("Gemini", "I've extracted the problem details. What specific coding question would you like to ask?");
        
        // Store the problem details for later use
        window.geminiProblemDetails = problemDetails;
      } else {
        addMessage("Gemini", "Could not extract problem details. Please select the problem text and try again.");
      }
    }
  }
  
  // Toggle the chatbox visibility
  function toggleChatbox() {
    console.log("Toggling chatbox");
    const chatbox = document.getElementById('gemini-chatbox');
    
    if (!chatbox) {
        console.log("Creating new chatbox");
        createChatbox();
        // Scroll to bottom when first creating the chatbox
        setTimeout(() => {
            forceScrollToBottom();
        }, 100);
    } else {
        console.log("Toggling existing chatbox");
        if (chatbox.style.display === 'none' || chatbox.classList.contains('hidden')) {
            // Show with animation
            chatbox.style.display = 'flex';
            chatbox.style.opacity = '0';
            chatbox.style.transform = 'translateY(20px)';
            
            // Trigger animation and force scroll to bottom
            setTimeout(() => {
                chatbox.style.opacity = '1';
                chatbox.style.transform = 'translateY(0)';
                forceScrollToBottom();
            }, 50);
            
            chatbox.classList.remove('hidden');
            console.log("Showing chatbox");
        } else {
            // Hide with animation
            chatbox.style.opacity = '0';
            chatbox.style.transform = 'translateY(20px)';
            
            // Wait for animation to complete before hiding
            setTimeout(() => {
                chatbox.style.display = 'none';
                chatbox.classList.add('hidden');
            }, 300);
            
            console.log("Hiding chatbox");
        }
    }
  }
  
  // New function to force scroll to bottom without animation
  function forceScrollToBottom() {
    const messagesDiv = document.getElementById('gemini-messages');
    if (messagesDiv) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }
  
  // Update formatMessage to include theme-aware styles
  function formatMessage(text) {
    const colors = getThemeColors();
    const styleTag = `
        <style>
            .gemini-message .gemini-text pre.gemini-code-block {
                background-color: ${colors.darkBackground} !important;
                padding: 16px !important;
                margin: 8px 0 !important;
                overflow-x: auto !important;
                font-family: 'Fira Code', 'Consolas', monospace !important;
                color: ${colors.text} !important;
                border-radius: 8px !important;
                border: 1px solid ${colors.borderColor} !important;
                white-space: pre !important;
                tab-size: 4 !important;
                -moz-tab-size: 4 !important;
                position: relative !important;
            }
            
            .code-block-wrapper {
                position: relative;
            }
            
            .copy-code-button {
                position: absolute;
                top: 8px;
                right: 8px;
                background: ${colors.background};
                border: 1px solid ${colors.borderColor};
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 12px;
                color: ${colors.text};
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s;
                z-index: 1;
            }
            
            .code-block-wrapper:hover .copy-code-button {
                opacity: 1;
            }
            
            .copy-code-button:hover {
                background: ${colors.darkBackground};
            }
            
            .copy-code-button.copied {
                background: #4CAF50;
                color: white;
                border-color: #4CAF50;
            }
            
            .gemini-message .gemini-text p {
                margin: 8px 0 !important;
                line-height: 1.5 !important;
                color: ${colors.text} !important;
            }

            .gemini-message .gemini-text code {
                background-color: ${colors.darkBackground} !important;
                color: ${colors.text} !important;
                padding: 2px 4px !important;
                border-radius: 4px !important;
                font-family: 'Fira Code', 'Consolas', monospace !important;
            }
        </style>
    `;

    // First, extract code blocks and replace with placeholders
    const codeBlocks = [];
    let processedText = text.replace(/```(\w*)\n([\s\S]+?)```/g, (match, language, code) => {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push({
            language,
            code: code.trim()
        });
        return placeholder;
    });

    // Process the rest of the text (non-code parts)
    processedText = processedText
        // Handle inline code
        .replace(/`(.+?)`/g, '<code>$1</code>')
        
        // Handle paragraphs and line breaks
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');

    // Put code blocks back with copy button
    processedText = processedText.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
        const block = codeBlocks[index];
        const uniqueId = `code-block-${Date.now()}-${index}`;
        return `<div class="code-block-wrapper">
            <button class="copy-code-button" onclick="(function(btn){
                const pre = btn.parentElement.querySelector('pre');
                const code = pre.textContent;
                navigator.clipboard.writeText(code).then(() => {
                    btn.textContent = 'Copied!';
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.textContent = 'Copy';
                        btn.classList.remove('copied');
                    }, 2000);
                });
            })(this)">Copy</button>
            <pre class="gemini-code-block" id="${uniqueId}" ${block.language ? `data-language="${block.language}"` : ''}>
${block.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </pre>
        </div>`;
    });

    return styleTag + processedText;
  }
  
  // Update isCodingRelated function to be more strict about what it accepts as valid input and add better validation for random words
  function isCodingRelated(message) {
    const lowercaseMessage = message.toLowerCase().trim();
    
    // Smart greeting detection
    const greetingPatterns = [
        // Common greetings
        /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening|day))/i,
        // Thank you variations
        /^(thanks|thank\s+you|thx|ty)/i,
        // Farewells
        /^(bye|goodbye|see\s+you|cya)/i,
        // Polite responses
        /^(ok|okay|alright|cool|nice|great|awesome)/i
    ];

    // Check if the message is a greeting
    const isGreeting = greetingPatterns.some(pattern => pattern.test(lowercaseMessage));
    
    if (isGreeting) {
        // Generate a natural response based on the type of greeting
        let response;
        if (lowercaseMessage.match(/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening|day))/i)) {
            const timeOfDay = new Date().getHours();
            const greeting = timeOfDay < 12 ? 'Good morning' : timeOfDay < 17 ? 'Good afternoon' : 'Good evening';
            response = `${greeting}! I'm here to help you with any coding questions you have. What would you like to work on?`;
        } else if (lowercaseMessage.match(/^(thanks|thank\s+you|thx|ty)/i)) {
            response = "You're welcome! Let me know if you need help with anything else!";
        } else if (lowercaseMessage.match(/^(bye|goodbye|see\s+you|cya)/i)) {
            response = "Goodbye! Feel free to come back if you need help with coding!";
        } else {
            response = "I'm here to help with your coding questions. What would you like to work on?";
        }

        return {
            isValid: true,
            isCasual: true,
            response: response
        };
    }

    // Check if the message is too short or just random characters
    if (lowercaseMessage.length < 2 || /^[^a-zA-Z0-9]+$/.test(lowercaseMessage)) {
      return {
        isValid: false,
        reason: "I only respond to coding-related questions. Please ask about programming problems, algorithms, or software development."
      };
    }

    const codingKeywords = [
        // Programming specific terms
        'code', 'program', 'function', 'error', 'bug', 'debug',
        'algorithm', 'variable', 'class', 'method', 'api', 'compile',
        'runtime', 'syntax', 'framework', 'library', 'database',
        'query', 'array', 'object', 'string', 'loop', 'condition',
        'exception', 'async', 'await', 'interface', 'implement',
        
        // Programming languages and technologies
        'javascript', 'python', 'java', 'c++', 'php', 'ruby',
        'sql', 'html', 'css', 'react', 'angular', 'vue', 'node',
        'express', 'django', 'flask', 'spring', 'typescript',
        
        // Development concepts
        'frontend', 'backend', 'fullstack', 'api', 'rest',
        'graphql', 'database', 'server', 'client', 'deploy',
        'test', 'debug', 'optimize', 'refactor', 'architecture',
        
        // Problem-solving specific
        'leetcode', 'algorithm', 'complexity', 'solution',
        'optimize', 'implement', 'fix', 'solve', 'problem',
        'test case', 'edge case', 'input', 'output'
    ];

    // List of common non-coding topics to explicitly reject
    const nonCodingTopics = [
        // Health and Fitness
        'gym', 'workout', 'exercise', 'fitness', 'diet', 'nutrition',
        'routine', 'training', 'muscle', 'weight', 'cardio',
        
        // Entertainment
        'movie', 'music', 'song', 'game', 'play', 'watch',
        'show', 'series', 'entertainment', 'sport',
        
        // General Topics
        'food', 'recipe', 'cook', 'travel', 'weather',
        'news', 'politics', 'fashion', 'shopping',
        
        // Personal
        'advice', 'relationship', 'personal', 'life',
        'hobby', 'social', 'friend', 'family'
    ];

    // First check for explicit non-coding topics
    if (nonCodingTopics.some(topic => lowercaseMessage.includes(topic))) {
        return {
            isValid: false,
            reason: "I'm a coding assistant focused on helping with programming problems. For questions about other topics, please consult appropriate resources or experts in those fields."
        };
    }

    // Check for code-related content
    const hasCodingKeyword = codingKeywords.some(keyword => 
        lowercaseMessage.includes(keyword)
    );
    
    const hasCodeBlock = /\`{3}[\s\S]*\`{3}/.test(message) || 
                        /\`[^\`]+\`/.test(message);
    
    // If we have problem context, be more lenient but still require some programming relevance
    if (window.geminiProblemDetails) {
        if (hasCodingKeyword || hasCodeBlock) {
            return { isValid: true };
        }
    }

    // Only accept messages that are clearly coding-related
    if (hasCodingKeyword || hasCodeBlock) {
        return { isValid: true };
    }

    // For any other message, reject it
    return {
        isValid: false,
        reason: "I only respond to coding-related questions. Please ask about programming problems, algorithms, or software development."
    };
  }

  // Update callGeminiApi to handle context better
  async function callGeminiApi(message, context = null) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['geminiApiKey'], async function(result) {
            const apiKey = result.geminiApiKey;
            
            if (!apiKey) {
                reject(new Error("API key not found. Please set your Gemini API key in the extension settings."));
                return;
            }
            
            try {
                const currentCode = getCurrentEditorCode();
                const problemDetails = context || window.geminiProblemDetails || extractProblemDetails();
                
                // Updated prompt for more balanced responses
                let prompt = `You are an expert coding assistant focused on helping with programming problems and code-related questions.

Current Context:
Title: ${problemDetails?.title || 'Current Problem'}
URL: ${problemDetails?.url || window.location.href}

${currentCode ? 'Current Code:\n```\n' + currentCode + '\n```\n' : ''}
${problemDetails?.description ? 'Problem Description:\n' + problemDetails.description + '\n' : ''}

User Question: ${message}

Instructions for Code Solutions:
1. For complex problems, break down the solution into clear steps before writing code
2. Always consider:
   - Edge cases and input validation
   - Time and space complexity requirements
   - Memory efficiency and performance
   - Common pitfalls and corner cases
3. When providing code:
   - Include necessary imports and dependencies
   - Add detailed comments explaining key logic
   - Handle potential errors and exceptions
   - Follow language-specific best practices
4. For algorithmic problems:
   - Explain the chosen approach and why it's optimal
   - Mention time/space complexity in Big O notation
   - Consider multiple approaches if applicable
5. Test considerations:
   - Include example test cases
   - Cover edge cases in testing
   - Validate input/output requirements

Formatting Guidelines:
1. Use clear headings without asterisks or other markdown symbols
   Example: "Time Complexity:" instead of "**Time Complexity:**"
2. For emphasis, use clear language and structure rather than markdown formatting
3. Use proper indentation and spacing for readability and try to put in points
4. Format code blocks with triple backticks and language specification
5. Keep text formatting clean and professional without excessive symbols
6. Use bullet points and numbered lists for organization

General Response Guidelines:
1. Answer questions directly while providing necessary context
2. Break down complex concepts into understandable parts
3. If a solution seems incorrect, double-check and validate
4. For unclear questions, ask for clarification
5. Format code with proper indentation and markdown
6. Explain any assumptions made in the solution

Remember: Accuracy and reliability are top priorities. Take time to verify the solution's correctness before providing it.`;

                const requestBody = {
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    safetySettings: [{
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_NONE"
                    }],
                    generationConfig: {
                        temperature: 0.2, // Lower temperature for more precise responses
                        topK: 40, // Increased for better selection
                        topP: 0.95, // Increased for more thorough consideration
                        maxOutputTokens: 2048, // Increased for detailed solutions
                        stopSequences: []
                    }
                };

                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestBody)
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
                }

                const data = await response.json();
                
                if (data.promptFeedback?.blockReason) {
                    throw new Error(`Response blocked: ${data.promptFeedback.blockReason}`);
                }

                if (!data.candidates || data.candidates.length === 0) {
                    throw new Error("No response generated");
                }

                const generatedText = data.candidates[0].content.parts[0].text;
                
                if (!generatedText) {
                    throw new Error("Empty response received");
                }

                // Check if the response is coding-related
                const validationResult = isCodingRelated(message);
                if (!validationResult.isValid) {
                    resolve(validationResult.reason);
                    return;
                }

                resolve(generatedText);

            } catch (error) {
                console.error("Gemini API Error:", error);
                reject(new Error(`Failed to get response: ${error.message}`));
            }
        });
    });
}

async function sendMessage() {
    const input = document.getElementById('gemini-input');
    if (!input) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    // Clear input
    input.value = '';
    
    // Add user message to chat
    addMessage("You", message);
    scrollToLatestMessage(); // Add scroll after user message
    
    // Check if message is coding related
    const validationResult = isCodingRelated(message);
    if (!validationResult.isValid) {
        addMessage("Gemini", validationResult.reason);
        scrollToLatestMessage(); // Add scroll after validation message
        return;
    }

    // Handle casual greetings
    if (validationResult.isCasual) {
        addMessage("Gemini", validationResult.response);
        scrollToLatestMessage();
        return;
    }
    
    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'gemini-message gemini gemini-typing';
    typingDiv.style.cssText = `
        display: flex;
        flex-direction: column;
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        background-color: ${getThemeColors().background};
        align-self: flex-start;
        margin-bottom: 8px;
    `;

    typingDiv.innerHTML = `
        <style>
            @keyframes typingDot {
                0%, 100% { opacity: 0.2; transform: translateY(0); }
                50% { opacity: 1; transform: translateY(-2px); }
            }
            
            .typing-dots span {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #eaf1fd;
                margin: 0 2px;
                animation: typingDot 1.4s infinite;
            }
            
            .typing-dots span:nth-child(2) {
                animation-delay: 0.2s;
            }
            
            .typing-dots span:nth-child(3) {
                animation-delay: 0.4s;
            }
        </style>
        <span class="gemini-sender" style="font-weight: 600; font-size: 12px; margin-bottom: 4px; opacity: 0.8; color: #eaf1fd;">Gemini</span>
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #eaf1fd; font-size: 14px;">Thinking</span>
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    const messagesDiv = document.getElementById('gemini-messages');
    if (messagesDiv) {
        messagesDiv.appendChild(typingDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    try {
        const problemContext = window.geminiProblemDetails || extractProblemDetails();
        problemContext.codeHistory = codeHistory;
        
        const response = await callGeminiApi(message, problemContext);
        
        // Remove typing indicator
        if (typingDiv.parentNode) {
            typingDiv.remove();
        }
        
        // Add Gemini response
        addMessage("Gemini", response);
        scrollToLatestMessage(); // Add scroll after Gemini response
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        
        // Remove typing indicator
        if (typingDiv.parentNode) {
            typingDiv.remove();
        }
        
        // Add error message
        addMessage("Gemini", "Sorry, I encountered an error: " + error.message);
        scrollToLatestMessage(); // Add scroll after error message
    }
}
  
  // Extract problem details from the page
  function extractProblemDetails() {
    console.log("Extracting problem details from page");
    
    // Try to get the title using various possible selectors
    const titleSelectors = [
      'h1', '.problem-title', '.question-title', 
      '.problem-header h1', '.problem-header h2',
      'article h1', 'main h1', '.content h1',
      '.problem-statement h1', '.problem-description h1'
    ];
    
    let title = "Unknown Problem";
    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        title = titleElement.textContent.trim();
        console.log(`Found title using selector ${selector}: ${title}`);
        break;
      }
    }
    
    // For debugging, log all text content on the page
    console.log("Page title:", document.title);
    
    // Try different selectors for problem description
    const descriptionSelectors = [
      '.problem-description', '.problem-statement', 
      '.question-content', '.description',
      'article', '.content', 'main',
      '.problem-container', '.question-detail'
    ];
    
    let problemDescription = "";
    for (const selector of descriptionSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent.trim();
        if (text.length > 100) {
          console.log(`Found description using selector ${selector}, length: ${text.length}`);
          // If this description is longer than what we already have, use it
          if (text.length > problemDescription.length) {
            problemDescription = text;
          }
        }
      }
    }
    
    // If we still don't have a problem description, try grabbing all paragraphs
    if (!problemDescription) {
      console.log("No description found with selectors, trying paragraphs");
      const paragraphs = document.querySelectorAll('p');
      let allParagraphs = '';
      for (const p of paragraphs) {
        if (p.textContent.trim().length > 30) {
          allParagraphs += p.textContent.trim() + '\n\n';
        }
      }
      if (allParagraphs.length > 100) {
        problemDescription = allParagraphs;
      }
    }
    
    // If we still don't have content, use a more aggressive approach
    if (!problemDescription) {
      console.log("No description found, using DOM traversal");
      // Get the main content area
      const mainContent = document.querySelector('main') || document.querySelector('article') || document.body;
      
      // Clone main content to avoid modifying the original DOM
      const contentClone = mainContent.cloneNode(true);
      
      // Remove navigation, headers, footers
      const excludeSelectors = 'nav, header, footer, script, style';
      Array.from(contentClone.querySelectorAll(excludeSelectors)).forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
      
      problemDescription = contentClone.textContent.trim();
      
      // Remove excessive whitespace
      problemDescription = problemDescription.replace(/\s\s+/g, ' ').trim();
    }
    
    console.log("Extracted problem description length:", problemDescription.length);
    if (problemDescription.length > 0) {
      console.log("Description preview:", problemDescription.substring(0, 200) + "...");
    } else {
      console.log("No problem description found");
    }
    
    return {
      title,
      description: problemDescription,
      url: window.location.href
    };
  }
  // Get visual representation of the problem
  function getVisualRepresentation() {
    console.log("Creating visual representation of the problem");
    
    // Create a temporary element to store the visual representation
    const temp = document.createElement('div');
    
    // Try to find the main problem container
    const problemContainer = document.querySelector('.problem-container') || 
                            document.querySelector('.problem-statement') || 
                            document.querySelector('.question-content');
    
    if (problemContainer) {
      // Clone the problem container to avoid modifying the original
      temp.appendChild(problemContainer.cloneNode(true));
    } else {
      // If no container found, create a simple representation
      const h1 = document.querySelector('h1');
      if (h1) {
        const title = document.createElement('h2');
        title.textContent = h1.textContent;
        temp.appendChild(title);
      }
      
      // Get all paragraphs and code blocks
      const paragraphs = document.querySelectorAll('p, pre, code, .code');
      paragraphs.forEach(p => {
        if (p.textContent.trim().length > 20) {
          temp.appendChild(p.cloneNode(true));
        }
      });
    }
    
    // Return the HTML representation
    return temp.innerHTML;
  }
  
  // Function to detect when problem content has loaded
  function watchForProblemContent() {
    console.log("Starting DOM observer to detect problem content");
    
    // Potential selectors that might indicate problem content has loaded
    const targetSelectors = [
      '.problem-description', '.problem-statement', 
      '.question-content', '.description',
      'article', '.content h1', 'main h1',
      '.problem-container', '.question-detail'
    ];
    
    // Setup mutation observer
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any of our target selectors now exist
          for (const selector of targetSelectors) {
            if (document.querySelector(selector)) {
              console.log(`Problem content detected via selector: ${selector}`);
              
              // Wait a moment for the content to fully render
              setTimeout(() => {
                // Try extracting problem details
                const problemDetails = extractProblemDetails();
                
                // If we have a substantial description, store it but don't analyze automatically
                if (problemDetails.description.length > 100) {
                  console.log("Problem details extracted successfully, storing...");
                  window.geminiProblemDetails = problemDetails;
                } else {
                  console.log("Problem details extraction incomplete, waiting...");
                  // Try again after a short delay
                  setTimeout(() => {
                    const newDetails = extractProblemDetails();
                    window.geminiProblemDetails = newDetails;
                  }, 2000);
                }
              }, 1000);
              
              // We found content, but don't disconnect the observer yet
              // in case the page continues to load more content
              return;
            }
          }
        }
      }
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Safety timeout - stop observing after 30 seconds
    setTimeout(() => {
      observer.disconnect();
      console.log("DOM observer timed out after 30 seconds");
    }, 30000);
  }
  
  // Try multiple methods to inject the button
  function injectButton() {
    console.log("Starting button injection process");
    
    // Method 1: Immediate injection
    createHelpButton();
    
    // Method 2: Wait for page to load
    if (document.readyState === "loading") {
      document.addEventListener('DOMContentLoaded', createHelpButton);
    }
    
    // Method 3: Try again after a delay (helps with dynamic pages)
    setTimeout(createHelpButton, 1000);
    setTimeout(createHelpButton, 3000);
    
    // Method 4: Create a mutation observer to monitor DOM changes
    const observer = new MutationObserver(function(mutations) {
      if (!document.getElementById('gemini-help-button')) {
        createHelpButton();
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // After 5 seconds, disconnect the observer to prevent performance issues
    setTimeout(() => observer.disconnect(), 5000);
  }
  
  // Start the injection process
  injectButton();
  
  // Start watching for problem content
  watchForProblemContent();
  
  // Load code history on startup
  loadCodeHistory();
  
  // Listen for URL changes (for single-page applications)
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (lastUrl !== location.href) {
      lastUrl = location.href;
      console.log('URL changed to', lastUrl);
      
      // If we're on a problems page, watch for content to load
      if (lastUrl.includes('/problems')) {
        watchForProblemContent();
        
        // Ensure button is visible on new page
        setTimeout(createHelpButton, 1000);
      }
    }
  });
  
  urlObserver.observe(document, { subtree: true, childList: true });

  // Add this new function for drag functionality
  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.querySelector('.gemini-header');
    
    if (header) {
        header.onmousedown = dragMouseDown;
    } else {
        element.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e.preventDefault();
        // Get the mouse cursor position at startup
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // Call a function whenever the cursor moves
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        // Calculate the new cursor position
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Set the element's new position
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        // Remove bottom positioning when dragging
        element.style.bottom = 'auto';
    }

    function closeDragElement() {
        // Stop moving when mouse button is released
        document.onmouseup = null;
        document.onmousemove = null;
    }
  }

  // Add a scroll-to-bottom button
  function createScrollButton() {
    const colors = getThemeColors();
    const button = document.createElement('button');
    button.id = 'gemini-scroll-bottom';
    button.innerHTML = '↓';
    button.style.cssText = `
        position: absolute;
        bottom: 90px;
        right: 20px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(to right, ${colors.buttonGradient1}, ${colors.buttonGradient2});
        color: ${colors.background};
        border: none;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
        transition: opacity 0.2s, transform 0.2s;
        z-index: 10001;
        &:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
    `;
    
    return button;
  }

  function getCurrentEditorCode() {
    const editor = document.querySelector('.monaco-editor');
    if (editor) {
      return editor.textContent || '';
    }
    return null;
  }

  // Optional: Add a function to scroll to the latest message
  function scrollToLatestMessage() {
    const messagesDiv = document.getElementById('gemini-messages');
    const messages = messagesDiv?.querySelectorAll('.gemini-message');
    if (messages && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        lastMessage.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
        });
    }
  }
})();