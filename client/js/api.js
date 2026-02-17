/**
 * API Communication Module
 * Handles all fetch requests to the backend, always carrying the user ID.
 */
const GameAPI = (() => {
  let _uid = null;
  let _baseUrl = '';

  /**
   * Initialize the API module with user ID
   */
  function init(uid) {
    _uid = uid;
    // Base URL is same origin since Express serves static files
    _baseUrl = window.location.origin;
  }

  /**
   * Generic request helper with retry logic
   */
  async function request(method, endpoint, body = null, retries = 3) {
    const url = `${_baseUrl}/api${endpoint}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
      options.body = JSON.stringify({ ...body, uid: _uid });
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        if (attempt === retries) {
          console.error(`API request failed after ${retries} attempts:`, endpoint, error);
          showNetworkError();
          throw error;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  function showNetworkError() {
    const existing = document.getElementById('network-error-toast');
    if (existing) return;
    const toast = document.createElement('div');
    toast.id = 'network-error-toast';
    toast.className = 'toast';
    toast.style.borderColor = '#e74c3c';
    toast.textContent = '⚠️ Network connection issue. Please check your internet and try again.';
    toast.style.animationDuration = '5s';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  // --- Public API methods ---

  function createSession() {
    return request('POST', '/session', { uid: _uid });
  }

  function saveCharacter(data) {
    return request('PUT', '/character', data);
  }

  function saveJob(jobType) {
    return request('PUT', '/job', { jobType });
  }

  function saveWorkPerformance(data) {
    return request('PUT', '/work-performance', data);
  }

  function saveLottery(choice) {
    return request('PUT', '/lottery', { choice });
  }

  function saveSurvey(data) {
    return request('PUT', '/survey', data);
  }

  function getConfig() {
    return request('GET', '/config');
  }

  function getUID() {
    return _uid;
  }

  return {
    init,
    getUID,
    createSession,
    saveCharacter,
    saveJob,
    saveWorkPerformance,
    saveLottery,
    saveSurvey,
    getConfig,
  };
})();
