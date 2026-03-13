// enable smooth scroll for sidebar links
document.documentElement.style.scrollBehavior = "smooth";


// -------------------------------
// API CACHE SYSTEM
// -------------------------------

async function fetchWithCache(key, url, duration = 600000) {

const cached = localStorage.getItem(key);

if (cached) {

try {

const { data, timestamp } = JSON.parse(cached);

if (Date.now() - timestamp < duration) {
return data;
}

} catch {}

}

const response = await fetch(url);

if (!response.ok) throw new Error("Network error");

const data = await response.json();

localStorage.setItem(
key,
JSON.stringify({
data,
timestamp: Date.now()
})
);

return data;

}


// -------------------------------
// LOADING SKELETON
// -------------------------------

function showSkeleton(containerId, count = 6) {

const container = document.getElementById(containerId);
if (!container) return;

let html = "";

for (let i = 0; i < count; i++) {

html += `
<div class="bg-gray-800 p-5 rounded-xl animate-pulse border border-gray-700">

<div class="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
<div class="h-3 bg-gray-700 rounded w-full mb-2"></div>
<div class="h-3 bg-gray-700 rounded w-2/3"></div>

</div>
`;

}

container.innerHTML = html;

}


// -------------------------------
// HTML ESCAPE
// -------------------------------

function escapeHTML(str = "") {

return str
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;");

}


// -------------------------------
// CARD GENERATOR
// -------------------------------

function createCard(title, description, url, extra = "") {

return `
<div class="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-md
border border-gray-300 dark:border-gray-800
hover:shadow-xl hover:-translate-y-1 transition duration-300">

<h3 class="text-lg font-semibold mb-2 text-blue-600 dark:text-blue-400">
${escapeHTML(title)}
</h3>

<p class="text-gray-600 dark:text-gray-400 text-sm mb-4">
${escapeHTML(description || "")}
</p>

${extra}

<div class="flex justify-between items-center mt-3">

<a href="${url}" target="_blank"
class="text-sm text-blue-400 hover:text-blue-300">
Read →
</a>

<button
onclick="saveBookmark('${encodeURIComponent(title)}','${encodeURIComponent(url)}')"
class="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm">
⭐ Save
</button>

</div>

</div>
`;

}


// -------------------------------
// DEV NEWS
// -------------------------------

async function loadDevNews() {

const container = document.getElementById("newsContainer");
if (!container) return;

showSkeleton("newsContainer");

try {

const articles = await fetchWithCache(
"devNews",
"https://dev.to/api/articles?tag=programming&per_page=12"
);

let html = "";

articles.forEach(article => {

html += createCard(
article.title,
article.description,
article.url,
`<div class="flex gap-2 text-xs mb-2">
<span class="bg-gray-800 px-2 py-1 rounded">
${article.tag_list?.[0] || "Tech"}
</span>
</div>`
);

});

container.innerHTML = html;

} catch {

container.innerHTML =
"<p class='text-red-400'>Failed to load developer news</p>";

}

}


// -------------------------------
// DEV NEWS FILTER
// -------------------------------

async function filterTech(tag) {

showSkeleton("newsContainer");

let url = "https://dev.to/api/articles?per_page=12";

if (tag !== "all") url += `&tag=${tag}`;

const articles = await fetch(url).then(res => res.json());

let html = "";

articles.forEach(article => {

html += createCard(
article.title,
article.description,
article.url
);

});

document.getElementById("newsContainer").innerHTML = html;

}


// -------------------------------
// GITHUB TRENDING
// -------------------------------

async function loadGithubTrending() {

const container = document.getElementById("githubContainer");
if (!container) return;

showSkeleton("githubContainer");

try {

const data = await fetchWithCache(
"githubTrending",
"https://api.github.com/search/repositories?q=stars:>5000&sort=stars&order=desc&per_page=9"
);

let html = "";

data.items.forEach(repo => {

html += createCard(
repo.name,
repo.description || "No description",
repo.html_url,
`<div class="flex gap-2 text-xs mb-3">

<span class="bg-gray-800 px-2 py-1 rounded">
⭐ ${repo.stargazers_count}
</span>

<span class="bg-gray-800 px-2 py-1 rounded">
🍴 ${repo.forks_count}
</span>

<span class="bg-gray-800 px-2 py-1 rounded">
${repo.language || "Unknown"}
</span>

</div>`
);

});

container.innerHTML = html;

} catch {

container.innerHTML =
"<p class='text-red-400'>Failed to load GitHub repositories</p>";

}

}


// -------------------------------
// FRAMEWORK FILTER
// -------------------------------

async function searchFramework(framework) {

showSkeleton("githubContainer");

const data = await fetch(
`https://api.github.com/search/repositories?q=${framework}&sort=stars&per_page=9`
).then(res => res.json());

let html = "";

data.items.forEach(repo => {

html += createCard(
repo.name,
repo.description,
repo.html_url
);

});

document.getElementById("githubContainer").innerHTML = html;

}


// -------------------------------
// HACKER NEWS
// -------------------------------

async function loadHackerNews() {

const container = document.getElementById("hnContainer");
if (!container) return;

showSkeleton("hnContainer");

try {

const ids = await fetchWithCache(
"hnTop",
"https://hacker-news.firebaseio.com/v0/topstories.json"
);

const top = ids.slice(0, 9);

const stories = await Promise.all(
top.map(id =>
fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
.then(res => res.json())
)
);

let html = "";

stories.forEach(story => {

html += createCard(
story.title,
`👤 ${story.by} | ⭐ ${story.score}`,
story.url || `https://news.ycombinator.com/item?id=${story.id}`
);

});

container.innerHTML = html;

} catch {

container.innerHTML =
"<p class='text-red-400'>Failed to load Hacker News</p>";

}

}


// -------------------------------
// AI NEWS
// -------------------------------

async function loadAINews() {

const container = document.getElementById("aiContainer");
if (!container) return;

showSkeleton("aiContainer");

const articles = await fetchWithCache(
"aiNews",
"https://dev.to/api/articles?tag=ai&per_page=9"
);

let html = "";

articles.forEach(article => {

html += createCard(
article.title,
article.description,
article.url,
`<div class="text-xs text-gray-500 mb-2">
👤 ${article.user.name}
</div>`
);

});

container.innerHTML = html;

}


// -------------------------------
// SECURITY NEWS
// -------------------------------

async function loadSecurityNews() {

const container = document.getElementById("securityContainer");
if (!container) return;

showSkeleton("securityContainer");

const articles = await fetchWithCache(
"securityNews",
"https://dev.to/api/articles?tag=security&per_page=9"
);

let html = "";

articles.forEach(article => {

html += createCard(
article.title,
article.description,
article.url
);

});

container.innerHTML = html;

}


// -------------------------------
// SEARCH
// -------------------------------

async function searchTech() {

const query = document.getElementById("searchInput").value.trim();

if (!query) return;

showSkeleton("searchResults");

const articles = await fetch(
`https://dev.to/api/articles?tag=${query}&per_page=9`
).then(res => res.json());

let html = "";

articles.forEach(article => {

html += createCard(
article.title,
article.description,
article.url
);

});

document.getElementById("searchResults").innerHTML = html;

}


// ENTER KEY SEARCH

const searchInput = document.getElementById("searchInput");

if (searchInput) {
searchInput.addEventListener("keypress", e => {
if (e.key === "Enter") searchTech();
});
}


// -------------------------------
// BOOKMARKS
// -------------------------------

function saveBookmark(title, url) {

title = decodeURIComponent(title);
url = decodeURIComponent(url);

let bookmarks =
JSON.parse(localStorage.getItem("devintelBookmarks")) || [];

if (bookmarks.some(b => b.url === url)) return;

bookmarks.push({ title, url });

localStorage.setItem(
"devintelBookmarks",
JSON.stringify(bookmarks)
);

loadBookmarks();

}

function loadBookmarks() {

const container = document.getElementById("bookmarkContainer");
if (!container) return;

let bookmarks =
JSON.parse(localStorage.getItem("devintelBookmarks")) || [];

let html = "";

bookmarks.forEach(b => {

html += createCard(b.title,"",b.url);

});

container.innerHTML = html;

}


// -------------------------------
// ANALYTICS
// -------------------------------

function loadAnalytics(){

const container = document.getElementById("analyticsContainer");
if (!container) return;

let bookmarks =
JSON.parse(localStorage.getItem("devintelBookmarks") || "[]");

const html = `

<div class="bg-gray-900 p-5 rounded-xl">
<h3 class="font-semibold">Saved Articles</h3>
<p>${bookmarks.length}</p>
</div>

<div class="bg-gray-900 p-5 rounded-xl">
<h3 class="font-semibold">Cached APIs</h3>
<p>${Object.keys(localStorage).length}</p>
</div>

<div class="bg-gray-900 p-5 rounded-xl">
<h3 class="font-semibold">Active Feeds</h3>
<p>5</p>
</div>

`;

container.innerHTML = html;

}


// -------------------------------
// THEME TOGGLE
// -------------------------------

const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme){

if(theme === "light"){
document.documentElement.classList.remove("dark");
themeToggle.textContent = "🌙";
}else{
document.documentElement.classList.add("dark");
themeToggle.textContent = "☀️";
}

localStorage.setItem("devintelTheme", theme);

}

themeToggle.addEventListener("click", () => {

let current = localStorage.getItem("devintelTheme") || "dark";

let newTheme = current === "dark" ? "light" : "dark";

applyTheme(newTheme);

});

const savedTheme = localStorage.getItem("devintelTheme") || "dark";
applyTheme(savedTheme);


// -------------------------------
// AUTO REFRESH
// -------------------------------

function refreshFeeds(){

loadDevNews();
loadGithubTrending();
loadHackerNews();
loadAINews();
loadSecurityNews();

}

setInterval(refreshFeeds,300000);


// -------------------------------
// INIT
// -------------------------------

loadDevNews();
loadGithubTrending();
loadHackerNews();
loadAINews();
loadSecurityNews();
loadBookmarks();
loadAnalytics();

applyTheme(localStorage.getItem("devintelTheme")||"dark");