const container = document.getElementById("newsContainer");

async function loadDevNews() {

try {

const response = await fetch(
"https://dev.to/api/articles?tag=programming&per_page=12"
);

const articles = await response.json();

container.innerHTML = "";

articles.forEach(article => {

container.innerHTML += `

<div class="bg-gray-900 p-4 rounded-lg shadow">

<h3 class="text-lg font-semibold mb-2">
${article.title}
</h3>

<p class="text-gray-400 text-sm mb-4">
${article.description || ""}
</p>

<a href="${article.url}" target="_blank"
class="text-blue-400 hover:underline">
Read Article
</a>

</div>

`;

});

}

catch(error) {

container.innerHTML =
"<p class='text-red-400'>Failed to load articles</p>";

}

}

loadDevNews();

if ("serviceWorker" in navigator) {

navigator.serviceWorker
.register("/pwa/service-worker.js")
.then(() => console.log("Service Worker Registered"));

}

let deferredPrompt;

const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {

e.preventDefault();

deferredPrompt = e;

installBtn.classList.remove("hidden");

});

installBtn.addEventListener("click", () => {

deferredPrompt.prompt();

});