# DevIntel - Developer News Aggregator

Professional, responsive web application for aggregating developer news, trending repositories, and curated tech content.

## 📋 Project Overview

DevIntel is a Progressive Web App (PWA) that provides developers with a centralized hub for:
- Curated developer news (Dev.to)
- GitHub trending repositories
- Hacker News discussions
- AI & Machine Learning articles
- Security updates and best practices
- Custom technology search
- Personal bookmarks management
- Usage analytics

## 🏗️ Project Structure

```
DevIntel/
├── src/
│   ├── index.html          # Main HTML structure with semantic markup
│   ├── js/
│   │   └── app.js          # Core application logic (830+ lines)
│   ├── css/
│   │   ├── input.css       # Tailwind CSS input with custom components
│   │   └── styles.css      # Compiled Tailwind CSS output
│   └── pwa/
│       ├── manifest.json   # PWA manifest for app installation
│       └── service-worker.js # Service worker for offline functionality
├── config/
│   └── tailwind.config.js  # Tailwind CSS configuration
├── package.json            # Project dependencies and scripts
├── .gitignore              # Git ignore patterns
└── README.md               # Project readme
```

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
npm install

# Build CSS
npm run build:css

# Watch CSS changes (development)
npm run watch:css
```

### Running the Application

1. Open `src/index.html` in a modern web browser
2. Or use a local development server:
   ```bash
   # Using Python (if available)
   python -m http.server 8000

   # Or using Node.js
   npx http-server
   ```
3. Navigate to `http://localhost:8000/src/`

## 🎨 Features

### Core Features

#### 1. **Search Technologies**
- Search for articles and repositories across all tech topics
- Real-time results aggregation from multiple sources
- Debounced search (500ms) to optimize API calls
- XSS-protected HTML rendering

#### 2. **Bookmarks Management**
- Save articles for later reading
- Persistent storage using LocalStorage
- Maximum 100 bookmarks per user
- Bookmark timestamps for tracking

#### 3. **Developer News**
- Latest articles from Dev.to
- Filter by technology: JavaScript, Python, AI, Security, DevOps
- Curated content with high-quality sources
- 10-minute cache for optimal performance

#### 4. **GitHub Trending**
- Most starred repositories in real-time
- Filter by framework: React, Vue, Angular, TensorFlow
- Star counts and repository links
- GitHub API integration

#### 5. **Hacker News Feed**
- Top stories from Hacker News
- Discussion count and engagement metrics
- Direct links to discussions

#### 6. **AI & Machine Learning**
- Dedicated section for AI/ML articles
- Latest trends and research
- Technology-focused content

#### 7. **Security & Privacy**
- Security updates and vulnerabilities
- Best practices and tutorials
- Privacy-related articles

#### 8. **Analytics Dashboard**
- Saved articles count
- Cached data statistics
- Active feeds overview
- Real-time usage metrics

#### 9. **Dark Mode**
- Automatic dark mode support
- Class-based theme switching
- Persistent theme preference
- Smooth transition between modes

#### 10. **PWA Features**
- Installable on desktop and mobile
- Offline functionality
- Background caching
- Push notifications ready
- App shortcuts for quick access

## 🔧 Technical Architecture

### Frontend Stack
- **HTML5**: Semantic markup with accessibility features
- **Tailwind CSS**: Utility-first CSS framework with component layer
- **Vanilla JavaScript**: No frameworks, pure ES6+ async/await
- **Service Worker**: Offline functionality and caching

### Key Technologies
- `Fetch API` with timeout handling (8-second limit)
- `Promise.all()` for parallel API requests
- `LocalStorage` for persistent data
- `Cache API` for offline support
- `AbortController` for request cancellation

## 🔒 Security Features

### 1. **XSS Prevention**
- HTML escaping for user-generated content
- Character mapping: `&`, `<`, `>`, `"`, `'`
- No `innerHTML` usage for dynamic content
- Safe DOM manipulation via `textContent` and `createElement`

### 2. **Input Validation**
- URL validation using `URL` constructor
- Type checking and sanitization
- Array bounds checking

### 3. **Content Security**
- Strict error handling without exposing sensitive data
- User-friendly error messages
- Graceful degradation on API failures

## ⚡ Performance Optimizations

### 1. **Debouncing**
- 500ms debounce delay on search and filter functions
- Prevents excessive API calls
- Improves user experience and reduces server load

### 2. **Caching Strategy**
- **Network-first for APIs**: Fetch fresh data, fallback to cache, then offline
- **Cache-first for assets**: Use cached versions, fetch if needed
- 10-minute (600s) cache duration for dynamic content
- Automatic cache cleanup on service worker activation

### 3. **Loading States**
- Skeleton loaders for better perceived performance
- Progressive content rendering
- Smooth transitions between states

### 4. **API Timeout Handling**
- 8-second timeout for all fetch requests
- `AbortController` for cancellation
- Graceful fallback to cached data

## ♿ Accessibility Features

### 1. **Semantic HTML**
- Proper heading hierarchy (h1, h2, h3)
- Semantic sections and articles
- Form labels with proper associations
- Navigation landmarks

### 2. **ARIA Attributes**
- `aria-label` for icon buttons
- `aria-expanded` for toggle buttons
- `aria-controls` for menu associations
- `aria-hidden` for decorative elements

### 3. **Keyboard Navigation**
- Focus management
- Skip-to-content link
- Tab order optimization
- Focus visible styles

### 4. **Screen Reader Support**
- SR-only class for screen reader-only content
- Descriptive button labels
- Image alt attributes
- Proper link text

### 5. **Motion & Animation**
- Respects `prefers-reduced-motion`
- Disables animations for accessibility users
- Smooth scroll behavior option

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md)
- **Desktop**: > 1024px (lg)

### Layout Strategy
- Mobile-first approach
- Flexible grid (1 → 3 columns based on screen)
- Flexible navigation (sidebar on desktop, hamburger on mobile)
- Touch-friendly button sizing (min 44x44px)

### Device Support
- iOS Safari 12+
- Android Chrome 90+
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Responsive image scaling
- Orientation handling (portrait & landscape)

## 🔄 API Integration

### External APIs Used
1. **Dev.to API**: `/articles` endpoint for developer news
2. **GitHub API**: Search repositories with `/search/repositories`
3. **Hacker News API**: Top stories endpoint
4. **Custom aggregation**: AI, Security, and general tech news

### Request Handling
- Timeout: 8 seconds per request
- Retry: Uses cached data on timeout
- Error messages: User-friendly feedback
- Request validation: URL and response checking

## 📊 Data Management

### LocalStorage Schema
```javascript
{
  bookmarks: [
    { title, url, source, timestamp },
    ...
  ],
  theme: 'light' | 'dark',
  newsCache: { ... },
  githubCache: { ... }
}
```

### Cache Specifications
- **Cache Names**: `"devintel-static-v1"`, `"devintel-api-v1"`
- **Static Assets**: HTML, CSS, JS, manifest
- **Dynamic Content**: API responses (200 status only)
- **Cleanup**: Old caches removed on activation

## 🧪 Testing Checklist

### Functionality
- [ ] Search functionality works across all topics
- [ ] Bookmarks save and persist on page refresh
- [ ] All filters produce correct results
- [ ] Dark/light mode toggle works correctly
- [ ] Analytics display accurate counts
- [ ] Theme preference persists

### Performance
- [ ] API calls don't exceed 8-second timeout
- [ ] Search debouncing prevents excessive requests
- [ ] Cached content loads instantly
- [ ] Page load time < 3 seconds

### Accessibility
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Screen reader announces all content
- [ ] Focus visible on all interactive elements
- [ ] Color contrast meets WCAG AA standards
- [ ] Motion reduces when preferred

### Responsiveness
- [ ] Mobile layout (320px width)
- [ ] Tablet layout (768px width)
- [ ] Desktop layout (1920px width)
- [ ] Orientation change handled
- [ ] Touch targets are 44x44px minimum

### PWA
- [ ] Installable on mobile/desktop
- [ ] Works offline with cached content
- [ ] Manifest loads correctly
- [ ] Service worker registers and updates
- [ ] Shortcuts appear in app launcher

### Browser Support
- [ ] Chrome/Edge (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

## 🛠️ Build & Deployment

### Build Process
```bash
# 1. Build CSS
npm run build:css

# 2. Verify files
ls -la src/

# 3. Commit changes
git add .
git commit -m "Build: Generate compiled CSS"
```

### Deployment Options
1. **Static Hosting** (GitHub Pages, Netlify, Vercel)
   - Deploy `src/` directory
   - Enable HTTPS (required for PWA)
   - Set correct MIME types

2. **Development Server**
   ```bash
   npm run dev  # watches CSS changes
   ```

3. **Docker**
   - Create Dockerfile for containerization
   - Use nginx for static serving
   - Configure HTTPS with Let's Encrypt

## 📝 Configuration Files

### package.json
- Dependencies: tailwindcss, postcss, autoprefixer
- Scripts: build:css, watch:css, dev
- PWA manifest path: `src/pwa/manifest.json`

### tailwind.config.js
- Content scanning: `../src/**/*.{html,js}`
- Dark mode: `class` strategy
- Custom colors: slate-950 (#020617)
- No plugins (extensible)

### manifest.json
- App name: "DevIntel - Developer News Aggregator"
- Start URL: `/DevIntel/`
- Display: `standalone`
- Icons: 192x192 and 512x512 PNG
- Shortcuts: Search, Bookmarks
- Screenshots: Narrow and wide formats

## 🐛 Troubleshooting

### CSS Not Loading
1. Run: `npm run build:css`
2. Check: `src/css/styles.css` exists
3. Verify: No file path errors in link tag

### Scripts Not Working
1. Check browser console for errors
2. Verify `src/js/app.js` exists
3. Check network tab for API failures
4. Inspect LocalStorage contents

### Service Worker Issues
1. Check: `Navigator.serviceWorker` availability
2. Verify: HTTPS or localhost only
3. Inspect: Application > Service Workers in DevTools
4. Clear: Cache storage manually if needed

### Dark Mode Not Working
1. Add class `dark` to `<html>` element
2. Check: Tailwind config has `darkMode: 'class'`
3. Verify: CSS generated with dark utilities

## 📚 Further Reading

- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Web Accessibility (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Web Security](https://owasp.org/Top10/)

## 📄 License

ISC - See package.json for details

## 👤 Author

DevIntel Contributors

---

**Version**: 1.0.0
**Last Updated**: April 1, 2026
**Status**: Production Ready
