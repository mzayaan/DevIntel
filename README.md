# DevIntel

A modern developer news aggregator that brings together the best technical content from multiple sources.

## Features

- 📰 **Dev.to News** - Latest programming articles
- ⭐ **GitHub Trending** - Most starred repositories
- 🔗 **Hacker News** - Tech and startup news
- 🤖 **AI News** - Artificial intelligence articles
- 🔒 **Security News** - Security-focused content
- 📚 **Bookmarks** - Save and manage favorite articles
- 🌙 **Dark/Light Mode** - Theme toggle
- 💾 **Offline Support** - PWA with service worker
- ⚡ **Smart Caching** - API response caching

## Project Structure

```
devintel/
├── src/
│   ├── index.html          # Main HTML file
│   ├── css/
│   │   ├── input.css       # Tailwind input
│   │   └── styles.css      # Compiled styles
│   ├── js/
│   │   └── app.js          # Main application logic
│   ├── pwa/
│   │   ├── manifest.json   # PWA manifest
│   │   └── service-worker.js # Service worker
│   └── assets/             # Images, icons, etc.
├── config/
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .stylelintrc.json
├── dist/                   # Build output (generated)
├── package.json
└── README.md
```

## Setup & Development

### Installation
```bash
npm install
```

### Development
```bash
npm run dev          # Watch CSS changes
npm run build:css    # Build CSS once
```

### Build
Currently the project uses Tailwind CSS for styling. CSS is compiled from `src/css/input.css` to `src/css/styles.css`.

## API Sources

- **Dev.to**: `https://dev.to/api/articles`
- **GitHub Search**: `https://api.github.com/search/repositories`
- **Hacker News**: `https://hacker-news.firebaseio.com/v0/`

## Browser Support

- Modern browsers with ES6 support
- Service Worker support for PWA features
- LocalStorage for caching and bookmarks

## License

ISC - See package.json for details
