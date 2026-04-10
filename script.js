const API_KEY = '5c5c59b3d6bf21f02a10125a266706c2';
let isCelsius = true;
let currentWeatherData = null;
let tempChartInstance = null;
let deferredPrompt;
const notifiedCities = new Set();

// DOM Elements
const body = document.body;
const themeToggle = document.getElementById('theme-toggle');
const installBtn = document.getElementById('install-btn');
const alertBanner = document.getElementById('alert-banner');
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const micBtn = document.getElementById('mic-btn');
const loader = document.getElementById('loader');
const weatherCard = document.getElementById('weather-card');
const hourlyForecastContainer = document.getElementById('hourly-forecast-container');
const dailyForecastContainer = document.getElementById('daily-forecast-container');
const chartContainer = document.getElementById('chart-container');
const unitToggle = document.getElementById('unit-toggle');
const shareBtn = document.getElementById('share-btn');

// Weather Card Elements
const cityNameEl = document.getElementById('city-name');
const aqiBadge = document.getElementById('aqi-badge');
const weatherIconEl = document.getElementById('weather-icon');
const weatherConditionEl = document.getElementById('weather-condition');
const temperatureEl = document.getElementById('temperature');
const feelsLikeEl = document.getElementById('feels-like');
const humidityEl = document.getElementById('humidity');
const humidityProgress = document.getElementById('humidity-progress');
const uvIndexEl = document.getElementById('uv-index');
const uvProgress = document.getElementById('uv-progress');
const windEl = document.getElementById('wind');
const windDirEl = document.getElementById('wind-dir');
const windTextEl = document.getElementById('wind-text');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const aiTipEl = document.getElementById('ai-tip');
const lastUpdatedEl = document.getElementById('last-updated');

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(err => {
            console.error('Service worker setup failed', err);
        });
    });
}

// PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installBtn.classList.add('hidden');
        }
        deferredPrompt = null;
    }
});

// Notifications
if ('Notification' in window) {
    Notification.requestPermission();
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            () => {
                fetchWeather('Chennai');
            }
        );
    } else {
        fetchWeather('Chennai');
    }

    // Voice Search
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        micBtn.classList.remove('hidden');
        const recognition = new SpeechRecognition();
        
        micBtn.addEventListener('click', () => {
            recognition.start();
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            cityInput.value = transcript;
            fetchWeather(transcript);
        };
    }
    
    // Share Setup
    if (navigator.share) {
        shareBtn.classList.remove('hidden');
        shareBtn.addEventListener('click', () => {
            if (!currentWeatherData) return;
            const temp = Math.round(isCelsius ? currentWeatherData.main.temp : cToF(currentWeatherData.main.temp));
            const unit = isCelsius ? '°C' : '°F';
            const desc = currentWeatherData.weather[0].description;
            const city = currentWeatherData.name;
            
            navigator.share({
                title: 'Weather Update',
                text: `Weather in ${city}: ${temp}${unit}, ${desc}.`,
                url: window.location.href
            }).catch(err => console.error('Share failed:', err));
        });
    }
});

// Event Listeners
searchBtn.addEventListener('click', () => {
    if (cityInput.value.trim()) fetchWeather(cityInput.value.trim());
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && cityInput.value.trim()) fetchWeather(cityInput.value.trim());
});

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark');
    themeToggle.textContent = body.classList.contains('dark') ? '☀️' : '🌙';
    if (tempChartInstance) tempChartInstance.update(); // redraw chart text color
});

unitToggle.addEventListener('click', () => {
    isCelsius = !isCelsius;
    unitToggle.textContent = isCelsius ? '°C' : '°F';
    if (currentWeatherData) {
        updateTemperatureDisplay();
        getHourlyForecast(currentWeatherData.name, true);
        getForecast(currentWeatherData.name, true);
    }
});

function cToF(c) {
    return (c * 9/5) + 32;
}

function getWindDirection(deg) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
}

function updateTemperatureDisplay() {
    if (!currentWeatherData) return;
    const tempC = currentWeatherData.main.temp;
    const feelsC = currentWeatherData.main.feels_like;
    
    if (isCelsius) {
        temperatureEl.textContent = Math.round(tempC);
        feelsLikeEl.textContent = Math.round(feelsC);
    } else {
        temperatureEl.textContent = Math.round(cToF(tempC));
        feelsLikeEl.textContent = Math.round(cToF(feelsC));
    }
}

async function fetchWeather(city) {
    showLoader();
    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`);
        if (!res.ok) throw new Error('City not found');
        const data = await res.json();
        currentWeatherData = data;
        updateUI(data);
        fetchAQI(data.coord.lat, data.coord.lon);
        getHourlyForecast(city);
        getForecast(city);
    } catch (err) {
        console.error(err);
        hideLoader();
    }
}

async function fetchWeatherByCoords(lat, lon) {
    showLoader();
    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
        if (!res.ok) throw new Error('Location error');
        const data = await res.json();
        currentWeatherData = data;
        updateUI(data);
        fetchAQI(lat, lon);
        getHourlyForecast(data.name);
        getForecast(data.name);
    } catch (err) {
        console.error(err);
        hideLoader();
    }
}

async function fetchAQI(lat, lon) {
    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        if (!res.ok) return;
        const data = await res.json();
        const aqi = data.list[0].main.aqi;
        
        let aqiText = '';
        let aqiColor = '';
        switch(aqi) {
            case 1: aqiText = 'Good'; aqiColor = '#4caf50'; break;
            case 2: aqiText = 'Fair'; aqiColor = '#8bc34a'; break;
            case 3: aqiText = 'Moderate'; aqiColor = '#ffeb3b'; break;
            case 4: aqiText = 'Poor'; aqiColor = '#ff9800'; break;
            case 5: aqiText = 'Very Poor'; aqiColor = '#f44336'; break;
            default: aqiText = 'Unknown'; aqiColor = 'gray';
        }
        
        aqiBadge.textContent = `AQI: ${aqiText}`;
        aqiBadge.style.background = aqiColor;
        aqiBadge.style.color = (aqi === 3) ? '#000' : '#fff';
    } catch (err) {
        console.error('AQI Error:', err);
    }
}

function showLoader() {
    loader.classList.remove('hidden');
    weatherCard.classList.add('hidden');
    hourlyForecastContainer.classList.add('hidden');
    dailyForecastContainer.classList.add('hidden');
    chartContainer.classList.add('hidden');
}

function hideLoader() {
    loader.classList.add('hidden');
}

function updateUI(data) {
    cityNameEl.textContent = `${data.name}, ${data.sys.country}`;
    weatherIconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    
    let condition = data.weather[0].description;
    weatherConditionEl.textContent = condition.charAt(0).toUpperCase() + condition.slice(1);
    
    updateTemperatureDisplay();
    
    const hum = data.main.humidity;
    humidityEl.textContent = hum;
    humidityProgress.style.width = `${hum}%`;
    
    // UV logic - current weather API doesn't provide UV easily, mocked or empty.
    uvIndexEl.textContent = 'N/A';
    uvProgress.style.width = '0%';
    
    const windSpeedKmh = Math.round(data.wind.speed * 3.6);
    windEl.textContent = windSpeedKmh;
    windDirEl.style.transform = `rotate(${data.wind.deg}deg)`;
    windTextEl.textContent = getWindDirection(data.wind.deg);
    
    sunriseEl.textContent = formatTime(data.sys.sunrise);
    sunsetEl.textContent = formatTime(data.sys.sunset);
    
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    lastUpdatedEl.textContent = `Last updated: ${hours}:${mins}`;
    
    updateBackground(data.weather[0].main);
    checkAlerts(data);
    generateAITip(data.weather[0].main, data.main.temp);
    
    hideLoader();
    weatherCard.classList.remove('hidden');
}

function formatTime(unixTime) {
    const date = new Date(unixTime * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function updateBackground(condition) {
    const backgrounds = {
        'Clear': 'url("https://images.unsplash.com/photo-1601297183305-6df142704ea2?w=1200")',
        'Clouds': 'url("https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1200")',
        'Rain': 'url("https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=1200")',
        'Drizzle': 'url("https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=1200")',
        'Thunderstorm': 'url("https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=1200")',
        'Snow': 'url("https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=1200")',
        'Haze': 'url("https://images.unsplash.com/photo-1485236715568-ddc5ee6ca227?w=1200")',
        'Mist': 'url("https://images.unsplash.com/photo-1485236715568-ddc5ee6ca227?w=1200")',
        'Fog': 'url("https://images.unsplash.com/photo-1485236715568-ddc5ee6ca227?w=1200")'
    };
    
    if (backgrounds[condition]) {
        body.style.backgroundImage = backgrounds[condition];
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
    } else {
        body.style.backgroundImage = '';
    }
}

function checkAlerts(data) {
    const temp = data.main.temp;
    const windKmh = data.wind.speed * 3.6;
    const condition = data.weather[0].main;
    let msg = '';
    
    if (temp > 40) {
        msg = 'Extreme Heat Warning! Stay hydrated.';
    } else if (windKmh > 80) {
        msg = 'High Wind Warning! Stay safe indoors.';
    } else if (condition === 'Thunderstorm') {
        msg = 'Thunderstorm Alert! Avoid open spaces.';
    }
    
    if (msg) {
        alertBanner.textContent = msg;
        alertBanner.classList.remove('hidden');
        
        // Push notification logic
        if (!notifiedCities.has(data.name) && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Weather Alert', { body: msg, icon: 'icon.png' });
            notifiedCities.add(data.name);
        }
    } else {
        alertBanner.classList.add('hidden');
    }
}

function generateAITip(condition, temp) {
    let tip = '';
    if (temp < 10) {
        tip = "It's freezing! Bundle up well, wear a jacket before heading out.";
    } else if (temp > 35 && condition === 'Clear') {
        tip = "Very hot and clear. Don't forget sunscreen and keep water handy!";
    } else if (condition === 'Rain' || condition === 'Drizzle') {
        tip = "Don't forget your umbrella, it's wet out there!";
    } else if (currentWeatherData && currentWeatherData.main.humidity > 80) {
        tip = "High humidity today. Stay hydrated!";
    } else {
        tip = "Have a great day ahead! Keep an eye on the weather updates.";
    }
    
    const aqiColor = aqiBadge.style.background;
    if (aqiColor === 'rgb(244, 67, 54)' || aqiColor === 'rgb(255, 152, 0)' || aqiColor === '#f44336' || aqiColor === '#ff9800') {
        tip = "Air quality is poor. Consider wearing a mask outdoors.";
    }
    
    aiTipEl.textContent = `💡 AI Tip: ${tip}`;
}

async function getHourlyForecast(city, skipFetch = false) {
    if (!skipFetch) {
        try {
            const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}`);
            if (!res.ok) return;
            window.lastHourlyData = await res.json();
        } catch(err) {
             console.error('Hourly fetch err', err);
             return;
        }
    }
    
    const data = window.lastHourlyData;
    if (!data) return;
    
    const hourlyRow = document.getElementById('hourly-forecast');
    hourlyRow.innerHTML = '';
    
    // Next 8 items (3-hour intervals = 24hrs)
    const hourlyData = data.list.slice(0, 8);
    
    for (const item of hourlyData) {
        const dateObj = new Date(item.dt * 1000);
        const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const tempC = item.main.temp;
        const displayTemp = Math.round(isCelsius ? tempC : cToF(tempC));
        
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div style="font-size: 0.8rem">${timeStr}</div>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="icon">
            <div style="font-weight: bold">${displayTemp}°</div>
        `;
        hourlyRow.appendChild(card);
    }
    hourlyForecastContainer.classList.remove('hidden');
}

async function getForecast(city, skipFetch = false) {
    if (!skipFetch) {
        try {
            const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}`);
            if (!res.ok) return;
            window.lastForecastData = await res.json();
        } catch (err) {
            console.error('Forecast error', err);
            return;
        }
    }
    
    const data = window.lastForecastData;
    if (!data) return;

    const forecastContainer = document.getElementById('forecast');
    forecastContainer.innerHTML = '';
    
    const uniqueDays = new Set();
    let daysAdded = 0;
    const chartLabels = [];
    const chartTemps = [];
    
    for (const item of data.list) {
        const dateObj = new Date(item.dt * 1000);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        
        if (!uniqueDays.has(dayName) && daysAdded < 5) {
            uniqueDays.add(dayName);
            daysAdded++;
            
            const tempC = item.main.temp;
            const displayTemp = Math.round(isCelsius ? tempC : cToF(tempC));
            
            chartLabels.push(dayName);
            chartTemps.push(displayTemp);
            
            const card = document.createElement('div');
            card.className = 'forecast-card';
            card.innerHTML = `
                <div>${dayName}</div>
                <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="icon">
                <div style="font-weight: bold">${displayTemp}°</div>
            `;
            forecastContainer.appendChild(card);
        }
    }
    dailyForecastContainer.classList.remove('hidden');
    drawTemperatureGraph(chartLabels, chartTemps);
}

function drawTemperatureGraph(labels, dataPoints) {
    chartContainer.classList.remove('hidden');
    const ctx = document.getElementById('temp-chart').getContext('2d');
    
    if (tempChartInstance) {
        tempChartInstance.destroy();
    }
    
    const isDark = body.classList.contains('dark');
    const textColor = isDark ? '#fff' : '#000';
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.5)');
    gradient.addColorStop(1, 'rgba(102, 126, 234, 0.0)');

    tempChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Temperature (${isCelsius ? '°C' : '°F'})`,
                data: dataPoints,
                borderColor: '#667eea',
                backgroundColor: gradient,
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: textColor }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        }
    });
}
