// Global variables to remember the last searched location
let currentLat = null;
let currentLon = null;
let currentCityName = "Search for a City";

// --- 0. DYNAMIC BACKGROUND & CLOCK ---
function updateBackgroundByTime() {
    const hour = new Date().getHours(); 
    let bgImage = "";
    if (hour >= 6 && hour < 12) bgImage = "url('https://images.unsplash.com/photo-1542228262-3d663bb006ce?auto=format&fit=crop&w=1920&q=80')";
    else if (hour >= 12 && hour < 17) bgImage = "url('https://upload.wikimedia.org/wikipedia/commons/0/0a/Afternoon_sun_image.jpg')";
    else if (hour >= 17 && hour < 20) bgImage = "url('https://images.unsplash.com/photo-1573634193105-c209e5ef72c0?auto=format&fit=crop&w=1920&q=80')";
    else bgImage = "url('https://images.unsplash.com/photo-1507400492013-162706c8c05e?auto=format&fit=crop&w=1920&q=80')";
    document.body.style.backgroundImage = bgImage;
}

function updateClock() {
    const now = new Date();
    document.getElementById('timeDisplay').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    if (now.getMinutes() === 0 && now.getSeconds() === 0) updateBackgroundByTime();
}
updateBackgroundByTime();
setInterval(updateClock, 1000);
updateClock();

// Set up Calendar bounds
window.onload = () => {
    const today = new Date();
    const maxDate = new Date(today); maxDate.setDate(today.getDate() + 14);
    const minDate = new Date(today); minDate.setDate(today.getDate() - 90);
    document.getElementById('datePicker').max = maxDate.toISOString().split("T")[0];
    document.getElementById('datePicker').min = minDate.toISOString().split("T")[0];
};

// --- 1. MAIN SEARCH LOGIC ---
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeatherData(pos.coords.latitude, pos.coords.longitude, "Your Location"),
            () => alert("Unable to retrieve location. Check permissions.")
        );
    } else alert("Geolocation is not supported by your browser.");
}

async function getWeather() {
    const city = document.getElementById('cityInput').value.trim();
    if (!city) return alert("Please enter a city");
    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&format=json`);
        const geoData = await geoRes.json();
        if (!geoData.results) throw new Error("City not found");
        fetchWeatherData(geoData.results[0].latitude, geoData.results[0].longitude, geoData.results[0].name);
    } catch (err) { alert(err.message); }
}

// Master function for finding current + 7-day data
async function fetchWeatherData(lat, lon, cityName) {
    currentLat = lat; currentLon = lon; currentCityName = cityName;
    document.getElementById('datePicker').value = "";
    document.getElementById('dateContext').innerText = "Right Now";

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max&past_days=3&forecast_days=4&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();

        document.getElementById('cityName').innerText = cityName;
        document.getElementById('temperature').innerText = Math.round(data.current.temperature_2m);
        document.getElementById('humidity').innerText = data.current.relative_humidity_2m;
        document.getElementById('wind').innerText = data.current.wind_speed_10m;
        
        setMainWeatherIcon(data.current.weather_code);
        updateExtendedWeather(data.daily);
    } catch (err) { alert("Error: " + err.message); }
}

// --- 2. SPECIFIC DATE LOGIC (CALENDAR) ---
async function fetchDateWeather() {
    const selectedDate = document.getElementById('datePicker').value;
    if (!selectedDate) return;
    if (currentLat === null) return alert("Please search for a city or use location first!");

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}&start_date=${selectedDate}&end_date=${selectedDate}&daily=weather_code,temperature_2m_max,wind_speed_10m_max&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.daily || data.daily.time.length === 0) return alert("Data not available for this date.");

        document.getElementById('dateContext').innerText = "Forecast for: " + formatDate(selectedDate);
        document.getElementById('temperature').innerText = Math.round(data.daily.temperature_2m_max[0]);
        document.getElementById('wind').innerText = data.daily.wind_speed_10m_max[0];
        document.getElementById('humidity').innerText = "--"; 
        
        setMainWeatherIcon(data.daily.weather_code[0]);
    } catch (err) { alert("Error fetching date: " + err.message); }
}

// --- 3. UI HELPERS ---
function setMainWeatherIcon(code) {
    const card = document.getElementById('mainCard');
    const iconBox = document.getElementById('iconBox');
    const desc = document.getElementById('description');
    
    card.classList.remove('sunny', 'rainy', 'snowy');
    if (code <= 3) { card.classList.add('sunny'); iconBox.innerHTML = '☀️'; desc.innerText = "Clear Skies"; } 
    else if (code >= 51 && code <= 67) { card.classList.add('rainy'); iconBox.innerHTML = '🌧️'; desc.innerText = "Raining"; } 
    else if (code >= 71) { card.classList.add('snowy'); iconBox.innerHTML = '❄️'; desc.innerText = "Snowing"; } 
    else { iconBox.innerHTML = '☁️'; desc.innerText = "Cloudy"; }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function updateExtendedWeather(dailyData) {
    document.getElementById('historyRow').innerHTML = `
        ${createDayCard(dailyData.weather_code[2], dailyData.temperature_2m_max[2], formatDate(dailyData.time[2]))}
        ${createDayCard(dailyData.weather_code[1], dailyData.temperature_2m_max[1], formatDate(dailyData.time[1]))}
        ${createDayCard(dailyData.weather_code[0], dailyData.temperature_2m_max[0], formatDate(dailyData.time[0]))}
    `;
    document.getElementById('forecastRow').innerHTML = `
        ${createDayCard(dailyData.weather_code[4], dailyData.temperature_2m_max[4], formatDate(dailyData.time[4]))}
        ${createDayCard(dailyData.weather_code[5], dailyData.temperature_2m_max[5], formatDate(dailyData.time[5]))}
        ${createDayCard(dailyData.weather_code[6], dailyData.temperature_2m_max[6], formatDate(dailyData.time[6]))}
    `;
}

function createDayCard(code, temp, label) {
    let emoji = '☁️';
    if (code <= 3) emoji = '☀️'; else if (code >= 51 && code <= 67) emoji = '🌧️'; else if (code >= 71) emoji = '❄️';
    return `<div class="day-card"><p class="date">${label}</p><div class="small-icon">${emoji}</div><p class="small-temp">${Math.round(temp)}°C</p></div>`;
}

// --- 4. MAP LOGIC WITH AUTOCOMPLETE ---
let map, mapMarker, selectedLat = 20.5937, selectedLon = 78.9629; 
let searchTimeout = null; // Used to delay the API call while typing

function openMap() {
    document.getElementById('mapModal').style.display = 'flex';
    document.getElementById('mapSearchInput').value = ""; // Clear old search
    document.getElementById('mapSuggestions').style.display = "none"; // Hide suggestions

    if (!map) {
        map = L.map('map').setView([selectedLat, selectedLon], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        mapMarker = L.marker([selectedLat, selectedLon], {draggable: true}).addTo(map);
        
        mapMarker.on('dragend', () => { selectedLat = mapMarker.getLatLng().lat; selectedLon = mapMarker.getLatLng().lng; });
        map.on('click', (e) => { selectedLat = e.latlng.lat; selectedLon = e.latlng.lng; mapMarker.setLatLng([selectedLat, selectedLon]); });
    }
    setTimeout(() => map.invalidateSize(), 100);
}

function closeMap() { document.getElementById('mapModal').style.display = 'none'; }

// NEW: Autocomplete fetching logic
async function handleMapSearchInput() {
    const query = document.getElementById('mapSearchInput').value.trim();
    const suggestionsBox = document.getElementById('mapSuggestions');

    if (query.length < 2) {
        suggestionsBox.style.display = 'none';
        return;
    }

    // Clear previous timeout so we don't spam the API while the user is typing quickly
    if (searchTimeout) clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&format=json`);
            const data = await res.json();

            if (!data.results || data.results.length === 0) {
                suggestionsBox.style.display = 'none';
                return;
            }

            // Build the suggestions list
            suggestionsBox.innerHTML = '';
            data.results.forEach(place => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                // Creates a string like: "Mumbai, Maharashtra, India"
                const placeName = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
                div.innerText = placeName;
                
                // When you click a suggestion, move the map there
                div.onclick = () => {
                    document.getElementById('mapSearchInput').value = place.name;
                    suggestionsBox.style.display = 'none'; // Hide dropdown
                    
                    selectedLat = place.latitude;
                    selectedLon = place.longitude;
                    map.setView([selectedLat, selectedLon], 10);
                    mapMarker.setLatLng([selectedLat, selectedLon]);
                };
                suggestionsBox.appendChild(div);
            });
            
            suggestionsBox.style.display = 'block';

        } catch (err) {
            console.error("Error fetching suggestions:", err);
        }
    }, 300); // Wait 300 milliseconds after typing stops before searching
}

// Fallback manual search button logic
async function searchInMap() {
    const query = document.getElementById('mapSearchInput').value.trim();
    if (!query) return;
    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&format=json`);
        const data = await res.json();
        if (!data.results) return alert("Location not found.");
        
        selectedLat = data.results[0].latitude;
        selectedLon = data.results[0].longitude;
        map.setView([selectedLat, selectedLon], 10); 
        mapMarker.setLatLng([selectedLat, selectedLon]);
        document.getElementById('mapSuggestions').style.display = 'none';
    } catch (err) { alert("Error searching map: " + err.message); }
}

async function confirmLocation() {
    closeMap();
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedLat}&lon=${selectedLon}`);
        const data = await res.json();
        const placeName = data?.address?.city || data?.address?.town || data?.address?.state || "Map Location";
        fetchWeatherData(selectedLat, selectedLon, placeName);
    } catch (e) { fetchWeatherData(selectedLat, selectedLon, "Map Location"); }
}