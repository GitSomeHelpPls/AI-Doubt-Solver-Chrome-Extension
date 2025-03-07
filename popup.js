// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const apiKeyInput = document.getElementById('api-key');
    const saveButton = document.getElementById('save-button');
    const statusDiv = document.getElementById('status');
    
    // Load saved API key
    chrome.storage.sync.get(['geminiApiKey'], function(result) {
      if (result.geminiApiKey) {
        apiKeyInput.value = result.geminiApiKey;
      }
    });
    
    // Save API key
    saveButton.addEventListener('click', function() {
      const apiKey = apiKeyInput.value.trim();
      
      if (!apiKey) {
        showStatus('Please enter an API key', 'error');
        return;
      }
      
      chrome.storage.sync.set({ geminiApiKey: apiKey }, function() {
        showStatus('API key saved successfully!', 'success');
      });
    });
    
    // Show status message
    function showStatus(message, type) {
      statusDiv.textContent = message;
      statusDiv.className = 'status ' + type;
      statusDiv.style.display = 'block';
      
      // Hide after 3 seconds
      setTimeout(function() {
        statusDiv.style.display = 'none';
      }, 3000);
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    loadChatHistory(); // Ensures chat history loads every time popup opens
});
