'use client';

import React, { useEffect, useState } from 'react';

interface WeatherWidgetProps {
  lat: number;
  lng: number;
  initialSummary?: {
    temp: number;
    condition: string;
    icon: string;
  };
  className?: string;
}

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

function getWeatherDescription(code: number): { condition: string; icon: string } {
  switch (code) {
    case 0:
      return { condition: 'Clear Sky', icon: '☀️' };
    case 1:
      return { condition: 'Mainly Clear', icon: '🌤️' };
    case 2:
      return { condition: 'Partly Cloudy', icon: '⛅' };
    case 3:
      return { condition: 'Overcast', icon: '☁️' };
    case 45:
    case 48:
      return { condition: 'Misty / Fog', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Light Drizzle', icon: '🌦️' };
    case 61:
    case 63:
    case 65:
      return { condition: 'Rain', icon: '🌧️' };
    case 71:
    case 73:
    case 75:
      return { condition: 'Snow', icon: '🌨️' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Showers', icon: '🌧️' };
    case 95:
    case 96:
    case 99:
      return { condition: 'Thunderstorm', icon: '⛈️' };
    default:
      return { condition: 'Pleasant', icon: '🌤️' };
  }
}

export function WeatherWidget({ lat, lng, initialSummary, className = '' }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(initialSummary || null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchWeather() {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.current_weather && !isCancelled) {
            const desc = getWeatherDescription(data.current_weather.weathercode);
            setWeather({
              temp: Math.round(data.current_weather.temperature),
              condition: desc.condition,
              icon: desc.icon,
            });
          }
        }
      } catch (err) {
        // Fallback to initialSummary if available
        if (!isCancelled && initialSummary) {
          setWeather(initialSummary);
        }
      }
    }

    if (lat && lng) {
      fetchWeather();
    }

    return () => {
      isCancelled = true;
    };
  }, [lat, lng, initialSummary]);

  if (!weather) {
    return (
      <div className={`bg-black/60 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full text-[10px] font-mono text-white flex items-center space-x-2 ${className}`}>
        <span>☀️</span>
        <span>26°C</span>
        <span className="text-white/40">•</span>
        <span className="text-white/80">Tropical Breeze</span>
      </div>
    );
  }

  return (
    <div className={`bg-black/60 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full text-[10px] font-mono text-white flex items-center space-x-2 ${className}`}>
      <span>{weather.icon}</span>
      <span>{weather.temp}°C</span>
      <span className="text-white/40">•</span>
      <span className="text-white/80">{weather.condition}</span>
    </div>
  );
}
