/**
 * Unit tests for UI helper functions.
 * client/js/ui.js exports functions via CommonJS for testing.
 */

// jsdom doesn't define these — mock minimal DOM environment
global.document = global.document || {};

const {
  escapeHTML,
  isValidURL,
  debounce,
  showSkeleton,
  createCard,
  showError,
  showNotification,
} = require('../../client/js/ui.js');

// ---- escapeHTML ----

describe('escapeHTML', () => {
  test('escapes ampersand', () => {
    expect(escapeHTML('a & b')).toBe('a &amp; b');
  });

  test('escapes < and >', () => {
    expect(escapeHTML('<script>')).toBe('&lt;script&gt;');
  });

  test('escapes double quote', () => {
    expect(escapeHTML('"value"')).toBe('&quot;value&quot;');
  });

  test('escapes single quote', () => {
    expect(escapeHTML("it's")).toBe('it&#039;s');
  });

  test('passes plain strings unchanged', () => {
    expect(escapeHTML('hello world 123')).toBe('hello world 123');
  });

  test('handles undefined/null gracefully', () => {
    expect(escapeHTML(undefined)).toBe('');
    expect(escapeHTML(null)).toBe('');
  });
});

// ---- isValidURL ----

describe('isValidURL', () => {
  test('returns true for https URL', () => {
    expect(isValidURL('https://example.com')).toBe(true);
  });

  test('returns true for http URL', () => {
    expect(isValidURL('http://dev.to/article')).toBe(true);
  });

  test('returns false for plain string', () => {
    expect(isValidURL('not-a-url')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isValidURL('')).toBe(false);
  });

  test('returns false for relative path', () => {
    expect(isValidURL('/relative/path')).toBe(false);
  });
});

// ---- debounce ----

describe('debounce', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('delays execution by specified ms', () => {
    const fn = jest.fn();
    const d = debounce(fn, 500);
    d();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('cancels prior call when called again within delay', () => {
    const fn = jest.fn();
    const d = debounce(fn, 500);
    d(); d(); d();
    jest.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ---- createCard ----

describe('createCard', () => {
  test('returns empty string for invalid URL', () => {
    expect(createCard('Title', 'Desc', 'not-a-url', '', 'news')).toBe('');
  });

  test('contains article URL in href', () => {
    const result = createCard('Title', 'Desc', 'https://example.com', '', 'news');
    expect(result).toContain('href="https://example.com"');
  });

  test('escapes title to prevent XSS', () => {
    const result = createCard('<script>alert(1)</script>', 'Desc', 'https://example.com', '', 'news');
    expect(result).toContain('&lt;script&gt;');
    expect(result).not.toContain('<script>');
  });

  test('includes type class on article element', () => {
    const result = createCard('Title', 'Desc', 'https://example.com', '', 'github');
    expect(result).toContain('cyber-card github');
  });

  test('renders extra HTML inside card', () => {
    const extra = '<span class="test-extra">extra</span>';
    const result = createCard('Title', 'Desc', 'https://example.com', extra, 'news');
    expect(result).toContain('test-extra');
  });
});

// ---- showSkeleton ----

describe('showSkeleton', () => {
  test('inserts correct number of skeleton cards', () => {
    document.body.innerHTML = '<div id="testContainer"></div>';
    showSkeleton('testContainer', 4);
    const cards = document.getElementById('testContainer').querySelectorAll('.cyber-card.skeleton');
    expect(cards.length).toBe(4);
  });

  test('defaults to 6 skeletons when count omitted', () => {
    document.body.innerHTML = '<div id="testContainer2"></div>';
    showSkeleton('testContainer2');
    const cards = document.getElementById('testContainer2').querySelectorAll('.cyber-card.skeleton');
    expect(cards.length).toBe(6);
  });

  test('does nothing for missing container ID', () => {
    expect(() => showSkeleton('nonexistent')).not.toThrow();
  });
});

// ---- showError ----

describe('showError', () => {
  test('displays error message text', () => {
    document.body.innerHTML = '<div id="errC1"></div>';
    showError('errC1', 'Something went wrong');
    expect(document.getElementById('errC1').textContent).toContain('Something went wrong');
  });

  test('uses default message when none provided', () => {
    document.body.innerHTML = '<div id="errC2"></div>';
    showError('errC2');
    expect(document.getElementById('errC2').textContent).toContain('Failed to load content');
  });

  test('escapes message to prevent XSS', () => {
    document.body.innerHTML = '<div id="errC3"></div>';
    showError('errC3', '<img src=x onerror=alert(1)>');
    const html = document.getElementById('errC3').innerHTML;
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});

// ---- showNotification ----

describe('showNotification', () => {
  test('appends notification to body', () => {
    document.body.innerHTML = '';
    showNotification('Test message');
    const notif = document.querySelector('.notification');
    expect(notif).not.toBeNull();
    expect(notif.textContent).toBe('Test message');
  });

  test('applies correct class for error type', () => {
    document.body.innerHTML = '';
    showNotification('Error!', 'error');
    expect(document.querySelector('.notification.error')).not.toBeNull();
  });

  test('applies correct class for info type', () => {
    document.body.innerHTML = '';
    showNotification('Info!', 'info');
    expect(document.querySelector('.notification.info')).not.toBeNull();
  });
});
