/**
 * API Key Manager
 * Manages the storage and retrieval of user's Gemini API Key
 */

const API_KEY_STORAGE_KEY = 'gemini_api_key';

export const apiKeyManager = {
  /**
   * Save API key to localStorage
   */
  setApiKey(key: string): void {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  },

  /**
   * Get API key from localStorage
   */
  getApiKey(): string | null {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  },

  /**
   * Check if API key exists
   */
  hasApiKey(): boolean {
    const key = this.getApiKey();
    return key !== null && key.trim().length > 0;
  },

  /**
   * Clear API key from localStorage
   */
  clearApiKey(): void {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  }
};
