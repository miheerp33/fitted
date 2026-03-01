import fetch from 'node-fetch';

const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE = 'https://api.openweathermap.org/data/2.5';

export async function getWeatherByCoords(lat, lon) {
  if (!API_KEY) throw new Error('OPENWEATHER_API_KEY not set');
  const url = `${BASE}/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather: ${res.status}`);
  const data = await res.json();
  const forecastUrl = `${BASE}/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${API_KEY}`;
  const forecastRes = await fetch(forecastUrl);
  let dailyHigh = data.main.temp;
  let dailyLow = data.main.temp;
  if (forecastRes.ok) {
    const forecast = await forecastRes.json();
    const temps = forecast.list?.map((x) => x.main.temp) || [];
    if (temps.length) {
      dailyHigh = Math.max(...temps, data.main.temp);
      dailyLow = Math.min(...temps, data.main.temp);
    }
  }
  const cityName = [data.name, data.sys?.state, data.sys?.country].filter(Boolean).join(', ');
  return {
    temp: Math.round(data.main.temp),
    condition: data.weather?.[0]?.description || 'unknown',
    high: Math.round(dailyHigh),
    low: Math.round(dailyLow),
    city: cityName,
    summary: `${data.main.temp}°F, ${data.weather?.[0]?.description || ''}. High around ${Math.round(dailyHigh)}°F, low around ${Math.round(dailyLow)}°F.`,
  };
}

export async function getWeatherByCity(city) {
  if (!API_KEY) throw new Error('OPENWEATHER_API_KEY not set');
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather geo: ${res.status}`);
  const [loc] = await res.json();
  if (!loc) throw new Error('City not found');
  return getWeatherByCoords(loc.lat, loc.lon);
}
