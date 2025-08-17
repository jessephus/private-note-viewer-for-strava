import { useState, useEffect } from 'react';

/**
 * Custom hook to replace GitHub Spark's useKV with localStorage
 * @param {string} key - localStorage key
 * @param {any} defaultValue - default value if key doesn't exist
 * @returns {[any, function]} - [value, setValue] tuple
 */
export function useLocalStorage(key, defaultValue) {
  // Get from local storage then parse stored json or return defaultValue
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage.
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}