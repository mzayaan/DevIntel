# DevIntel - Developer Guide

Comprehensive guide for contributing to and extending the DevIntel application.

## 📦 Development Environment Setup

### Prerequisites
- Node.js 16+ (for npm and development tools)
- Modern browser (Chrome, Firefox, Safari, or Edge)
- Code editor (VS Code recommended)
- Git for version control

### Initial Setup
```bash
# Clone or navigate to project
cd DevIntel

# Install dependencies
npm install

# Start watching CSS changes
npm run watch:css

# In another terminal, serve the files
npx http-server src/
```

Visit: `http://localhost:8080` (or port shown by http-server)

## 🏗️ Architecture Overview

### Application Flow
```
User Interaction
    ↓
Event Listeners (Click, Input)
    ↓
Debounce Handler
    ↓
Fetch with Timeout
    ↓
Cache Check
    ↓
Response Processing
    ↓
DOM Manipulation
    ↓
Visual Feedback
```

### Module Organization

**src/js/app.js** consists of:

1. **Configuration** (Line 1-20)
   - API_TIMEOUT: 8000ms
   - CACHE_DURATION: 600000ms (10 min)
   - AUTO_REFRESH_INTERVAL: 1800000ms (30 min)
   - MAX_BOOKMARKS: 100
   - DEBOUNCE_DELAY: 500ms

2. **Utility Functions** (Line 22-150)
   - `debounce()`: Rate limiting
   - `fetchWithTimeout()`: Request management
   - `fetchWithCache()`: Caching layer
   - `escapeHTML()`: XSS prevention
   - `isValidURL()`: URL validation
   - `createCard()`: DOM creation

3. **UI Functions** (Line 152-250)
   - `showSkeleton()`: Loading states
   - `showError()`: Error messages
   - `showNotification()`: Toast notifications
   - `updateRefreshTime()`: Timestamp display

4. **Data Loading** (Line 252-500)
   - `loadDevNews()`: Dev.to articles
   - `loadGithubTrending()`: GitHub repos
   - `loadHackerNews()`: HN stories
   - `loadAINews()`: AI articles
   - `loadSecurityNews()`: Security updates

5. **Features** (Line 502-700)
   - `filterTech()`: Filter mechanisms
   - `searchFramework()`: Framework filters
   - `searchTech()`: Custom search
   - `saveBookmark()`: Bookmark management
   - `loadBookmarks()`: Retrieve bookmarks
   - `loadAnalytics()`: Usage statistics

6. **Theme & PWA** (Line 702-830)
   - `applyTheme()`: Dark/light mode
   - Service worker registration
   - Installation prompt handling
   - Auto-refresh scheduling

## 🔧 Adding a New News Feed

### Step 1: Create the API Integration Function

```javascript
async function loadCustomNews() {
  const container = document.getElementById('customContainer');

  if (!container) {
    console.warn('Container not found');
    return;
  }

  showSkeleton(container, 6);

  try {
    // Fetch with timeout and cache
    const data = await fetchWithCache(
      'https://api.example.com/articles',
      CONFIG.CACHE_DURATION
    );

    const articles = data.articles || [];

    if (!Array.isArray(articles) || articles.length === 0) {
      showError(container, 'No articles found');
      return;
    }

    container.innerHTML = articles
      .slice(0, 12)
      .map(article => createCard({
        title: article.title,
        excerpt: article.description,
        link: article.url,
        source: article.source || 'Custom News',
        engagement: article.views || 0
      }))
      .join('');

  } catch (error) {
    console.error('Error loading custom news:', error);
    showError(container, 'Failed to load custom news');
  }
}
```

### Step 2: Add HTML Section

```html
<!-- CUSTOM NEWS SECTION -->
<section id="customSection" class="scroll-mt-20">
  <div class="mb-6">
    <h2 class="text-2xl md:text-3xl font-bold mb-2">📚 Custom News</h2>
    <p class="text-gray-600 dark:text-gray-400">Your custom news feed</p>
  </div>
  <div id="customContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
</section>
```

### Step 3: Add Navigation Link

```html
<a href="#customSection" class="block px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition" onclick="closeMobileMenu()">
  📚 Custom News
</a>
```

### Step 4: Call on Page Load

Add to `DOMContentLoaded` event listener:
```javascript
loadCustomNews();
```

## 🎨 Styling with Tailwind

### Adding Custom Components

Edit `src/css/input.css` in the components layer:

```css
@layer components {
  .custom-card {
    @apply bg-white dark:bg-slate-800 rounded-lg p-4;
    @apply border border-gray-200 dark:border-slate-700;
    @apply hover:shadow-lg transition-shadow;
  }

  .custom-badge {
    @apply inline-block px-3 py-1 rounded-full;
    @apply bg-blue-100 dark:bg-blue-900;
    @apply text-blue-800 dark:text-blue-200 text-sm;
  }
}
```

Then rebuild:
```bash
npm run build:css
```

### Tailwind Utilities Reference

**Spacing**: `p-4`, `m-2`, `space-y-4`, `gap-6`
**Colors**: `bg-blue-600`, `text-white`, `border-gray-200`
**Layout**: `flex`, `grid-cols-3`, `md:block`
**Effects**: `shadow-lg`, `hover:shadow-xl`, `transition-all`
**Sizing**: `w-full`, `h-screen`, `min-h-[400px]`

## 🔐 Security Guidelines

### 1. Always Escape User Input

❌ **Dangerous:**
```javascript
container.innerHTML = `<h3>${userTitle}</h3>`; // XSS vulnerability
```

✅ **Safe:**
```javascript
const title = document.createElement('h3');
title.textContent = userTitle; // Escapes automatically
container.appendChild(title);

// Or use escapeHTML for embedding in HTML strings
container.innerHTML = `<h3>${escapeHTML(userTitle)}</h3>`;
```

### 2. Validate URLs Before Linking

✅ **Correct:**
```javascript
if (isValidURL(articleUrl)) {
  const link = document.createElement('a');
  link.href = articleUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Read More';
}
```

### 3. Handle Errors Gracefully

✅ **Correct:**
```javascript
try {
  // API call
  const response = await fetch(url);
  if (!response.ok) throw new Error('API error');
  return await response.json();
} catch (error) {
  console.error('Detailed error:', error);
  showError(container, 'Unable to load data'); // User-friendly
  return null;
}
```

### 4. Validate API Responses

✅ **Correct:**
```javascript
const data = await response.json();

if (!data || !Array.isArray(data.articles)) {
  throw new Error('Invalid response structure');
}

const safeArticles = data.articles
  .filter(a => a.title && isValidURL(a.url))
  .map(a => ({
    title: a.title,
    url: a.url,
    // Only extract needed fields
  }));
```

## ⚡ Performance Tips

### 1. Use Debouncing for Frequent Events

```javascript
// Good: Prevents excessive API calls
const debouncedSearch = debounce(() => {
  searchTech(); // This will only run after 500ms of no events
}, CONFIG.DEBOUNCE_DELAY);

document.getElementById('searchInput').addEventListener('input', debouncedSearch);
```

### 2. Implement Caching

```javascript
// Good: Reuses cached data
const cachedData = await fetchWithCache(url, CONFIG.CACHE_DURATION);

// Cache is stored in localStorage with timestamp
// Automatically uses cache if network fails
```

### 3. Lazy Load Content

```javascript
// Good: Only load when visible
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadExpensiveContent(entry.target);
      observer.unobserve(entry.target);
    }
  });
});

document.querySelectorAll('[data-lazy]').forEach(el => observer.observe(el));
```

### 4. Batch DOM Updates

```javascript
// Good: Single reflow/repaint
const html = articles
  .slice(0, 12)
  .map(article => createCard(article))
  .join('');
container.innerHTML = html; // One DOM update

// Instead of:
articles.forEach(article => {
  container.appendChild(createCardElement(article)); // Multiple updates ❌
});
```

## 🧪 Testing Patterns

### Testing API Integration

```javascript
// In console or test file
async function testNewsAPI() {
  try {
    const data = await fetchWithCache(
      'https://dev.to/api/articles?tag=javascript&per_page=6',
      0 // no cache for testing
    );
    console.table(data); // Pretty print
    return data.length > 0 ? '✓ PASS' : '✗ FAIL';
  } catch (error) {
    console.error('✗ FAIL:', error);
  }
}

testNewsAPI();
```

### Testing LocalStorage

```javascript
// Check bookmarks
const bookmarks = JSON.parse(localStorage.getItem('devintelbookmarks') || '[]');
console.table(bookmarks);

// Clear bookmarks
localStorage.removeItem('devintelbookmarks');

// Check cache
Object.keys(localStorage)
  .filter(key => key.startsWith('cache_'))
  .forEach(key => console.log(key, localStorage.getItem(key)));
```

### Testing Service Worker

```javascript
// In DevTools Console
navigator.serviceWorker.controller?.postMessage({
  type: 'CLEAR_CACHE'
});

// Or check registration
navigator.serviceWorker.ready.then(reg => {
  console.log('SW active:', reg.active);
  console.log('Updates available:', reg.waiting);
});
```

## 🐛 Debugging Tips

### Enable Detailed Logging

Add to top of app.js:
```javascript
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[DevIntel]', ...args);
}

// Replace console.log calls with log()
```

### Inspect Cache Contents

```javascript
// In DevTools Console
caches.keys().then(names => {
  names.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(requests => {
        console.log(name, requests.map(r => r.url));
      });
    });
  });
});
```

### Profile Performance

```javascript
// In DevTools Console
console.time('loadNews');
await loadDevNews();
console.timeEnd('loadNews');

// Result: loadNews: 1234ms
```

### Network Throttling

1. DevTools → Network tab
2. Throttling dropdown → Select "Slow 3G"
3. Test offline functionality
4. Verify timeout handling

## 📋 Code Style Standards

### Variable Naming
```javascript
// Good: Descriptive, camelCase for variables
const maxBookmarks = 100;
let isLoading = false;

// Good: UPPER_CASE for constants
const API_TIMEOUT = 8000;
const CACHE_DURATION = 600000;

// Avoid: Single letter or vague names
const x = 5; // ❌
const data = 5; // ❌
```

### Function Naming
```javascript
// Good: Verb + Noun pattern
function loadDevNews() { }
function saveBookmark() { }
function validateURL() { }

// Avoid: Generic or unclear
function doSomething() { } // ❌
function process() { } // ❌
```

### Comments
```javascript
// Good: Explain WHY, not WHAT
// Cache for 10 minutes to balance freshness vs performance
const cachedData = await fetchWithCache(url, 600000);

// Avoid: Obvious comments
const name = 'John'; // Set name to John ❌
```

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Run `npm run build:css` (CSS generated)
- [ ] Check `src/css/styles.css` file size (should be 40-50KB)
- [ ] No console errors in DevTools
- [ ] All feeds load within 8 seconds
- [ ] Bookmarks persist after refresh
- [ ] Dark mode toggle works
- [ ] Responsive on mobile (375px width)
- [ ] Service worker registers
- [ ] Offline mode shows cached content
- [ ] No sensitive data in console logs
- [ ] HTTPS enabled (required for PWA)
- [ ] Manifest valid (https://www.pwa-builder.com/)
- [ ] Lighthouse score > 90

## 📞 Getting Help

### Debugging Resources
- **Browser Console**: Check for JavaScript errors
- **Network Tab**: Monitor API calls and timeouts
- **Application Tab**: Inspect LocalStorage, Cache, Service Workers
- **Lighthouse**: Run performance audit
- **WebAIM**: Check accessibility with WAVE tool

### Common Issues & Solutions

**Issue**: CSS changes not showing
- **Solution**: `npm run build:css` and hard refresh (Ctrl+Shift+R)

**Issue**: Service worker not updating
- **Solution**: Clear all cache in DevTools, unregister in Settings

**Issue**: Bookmarks not saving
- **Solution**: Check $quota exceeded: localStorage.clear()

**Issue**: API calls timeout
- **Solution**: Check network throttling, verify API endpoint status

---

**Happy Coding!** 🚀

For questions or contributions, refer to the main README.md
