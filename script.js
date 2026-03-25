const apiKey = "5c5c59b3d6bf21f02a10125a266706c2";

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");

const cityName = document.getElementById("cityName");
const temperature = document.getElementById("temperature");
const condition = document.getElementById("condition");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const icon = document.getElementById("icon");

const forecastDiv = document.getElementById("forecast");
const bgOverlay = document.getElementById("bgOverlay");
const alertMessage = document.getElementById("alertMessage");
const alertBanner = document.getElementById("alertBanner");
const savedCitiesContainer = document.getElementById("savedCities");
const loader = document.getElementById("loader");
const weatherContent = document.getElementById("weatherContent");

let savedCities = JSON.parse(localStorage.getItem("weatherCities")) || [];

// 🔍 Search
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (!city) return;

  getWeatherByCity(city);

  cityInput.value = ""; // 🔥 clear pannum
});

// ⌨️ Enter key
cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

// 📍 Auto location
navigator.geolocation.getCurrentPosition(
  (pos) => {
    getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
  },
  () => {
    getWeatherByCity("Chennai"); // ❗ remove this line
  }
);

// 🌤 Get by city
async function getWeatherByCity(city) {
  showLoader();

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);
  const data = await res.json();

  updateUI(data);
  generateAITip(data);
  getForecast(city);
  saveCity(city);

  hideLoader();
}

// 📍 Get by coords
async function getWeatherByCoords(lat, lon) {
  showLoader();

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);
  const data = await res.json();

  updateUI(data);

  hideLoader();
}

// 🎯 Update UI
weatherContent.classList.add("fade-in");

// animation repeat aaganum na
setTimeout(() => {
  weatherContent.classList.remove("fade-in");
}, 800);
function updateUI(data) {
  weatherContent.classList.remove("hidden");

  cityName.textContent = data.name;
  temperature.textContent = data.main.temp + "°C";
  condition.textContent = data.weather[0].main;
  humidity.textContent = data.main.humidity + "%";
  wind.textContent = data.wind.speed + " m/s";

  icon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  setBackground(data.weather[0].main);
  checkAlerts(data);
}

// 📅 Forecast
async function getForecast(city) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);
  const data = await res.json();

  forecastDiv.innerHTML = "";

  for (let i = 0; i < data.list.length; i += 8) {
    const item = data.list[i];

    forecastDiv.innerHTML += `
      <div>
        <p>${new Date(item.dt_txt).toDateString().slice(0, 3)}</p>
        <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png">
        <p>${item.main.temp}°C</p>
      </div>
    `;
  }
}

// 🎨 Background
function setBackground(weather) {
  let bgUrl = "";

  if (weather === "Clear") bgUrl = "https://source.unsplash.com/1600x900/?sunny";
  else if (weather === "Clouds") bgUrl = "https://source.unsplash.com/1600x900/?clouds";
  else if (weather === "Rain") bgUrl = "https://source.unsplash.com/1600x900/?rain";
  else bgUrl = "https://source.unsplash.com/1600x900/?weather";

  bgOverlay.style.backgroundImage = `url('${bgUrl}')`;
}

// ⚠️ Alerts
function checkAlerts(weather) {
  const temp = weather.main.temp;
  const wind = weather.wind.speed * 3.6;
  const condition = weather.weather[0].main.toLowerCase();

  let alertMsg = null;

  if (temp > 40) alertMsg = "Extreme Heat!";
  else if (wind > 80) alertMsg = "High Wind!";
  else if (condition.includes("storm")) alertMsg = "Storm Alert!";

  if (alertMsg) {
    alertMessage.textContent = alertMsg;
    alertBanner.classList.remove("hidden");
  } else {
    alertBanner.classList.add("hidden");
  }
}

// ⭐ Save city
function saveCity(city) {
  if (!savedCities.includes(city)) {
    savedCities.unshift(city);
    if (savedCities.length > 5) savedCities.pop();
    localStorage.setItem("weatherCities", JSON.stringify(savedCities));
    renderSavedCities();
  }
}

// ⭐ Render saved
function renderSavedCities() {
  savedCitiesContainer.innerHTML = "";

  savedCities.forEach(city => {
    const btn = document.createElement("button");
    btn.textContent = city;
    btn.onclick = () => getWeatherByCity(city);
    savedCitiesContainer.appendChild(btn);
  });
}

// Loader
function showLoader() {
  loader.classList.remove("hidden");
  weatherContent.classList.add("hidden");
}

function hideLoader() {
  loader.classList.add("hidden");
}

// Start
renderSavedCities();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("SW Registered"));
}
const toggleBtn = document.getElementById("themeToggle");

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    toggleBtn.textContent = "☀️";
  } else {
    toggleBtn.textContent = "🌙";
  }
});
const aiTip = document.getElementById("aiTip");

function generateAITip(data) {
  const temp = data.main.temp;
  const condition = data.weather[0].main.toLowerCase();

  let tip = "";

  if (condition.includes("rain")) {
    tip = "☔ Take an umbrella!";
  } else if (condition.includes("clear")) {
    tip = "😎 Wear sunglasses!";
  } else if (temp > 35) {
    tip = "🔥 Stay hydrated, it's hot!";
  } else if (temp < 15) {
    tip = "🧥 Wear a jacket!";
  } else {
    tip = "🌤 Have a nice day!";
  }

  aiTip.textContent = tip;
}
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

recognition.onresult = function (event) {
  const city = event.results[0][0].transcript;
  cityInput.value = city;
  getWeatherByCity(city);
};
function greeting() {
  const hour = new Date().getHours();
  let msg = "";

  if (hour < 12) msg = "🌅 Good Morning!";
  else if (hour < 18) msg = "☀️ Good Afternoon!";
  else msg = "🌙 Good Evening!";

  alert(msg);
}

greeting();
