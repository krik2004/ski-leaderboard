// Назначение: Загрузка и парсинг GPX файлов через Leaflet-GPX

// Возвращает: точки трека, статистику (дистанция, время, набор высоты), состояния загрузки/ошибки

// Особенности: Асинхронная загрузка, обработка метаданных

import { useState, useEffect, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet-gpx'

const useGpxLoader = gpxUrl => {
	const [points, setPoints] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [stats, setStats] = useState(null)

	const loadGpx = useCallback(async url => {
		if (!url) {
			setPoints([])
			setStats(null)
			return
		}

		setLoading(true)
		setError(null)

		try {
			// Создаем временный элемент для парсинга GPX
			const gpx = new L.GPX(url, {
				async: true,
				max_point_interval: 10000,
				parseElements: ['track', 'route', 'waypoint'],
			})

			// Ждем загрузки GPX
			await new Promise((resolve, reject) => {
				gpx.on('loaded', function (e) {
					const track = e.target
					const pointsArray = []

					// Извлекаем все точки из трека
					track.getLayers().forEach(layer => {
						if (layer instanceof L.Polyline) {
							const latlngs = layer.getLatLngs()
							latlngs.forEach((latlng, index) => {
								const point = {
									lat: latlng.lat,
									lng: latlng.lng,
									elevation: latlng.meta?.ele,
									time: latlng.meta?.time,
									timestamp: latlng.meta?.time
										? new Date(latlng.meta.time).getTime()
										: null,
								}
								pointsArray.push(point)
							})
						}
					})

					setPoints(pointsArray)

					// Получаем статистику из расширений GPX
					
					const extensionData = track.get_duration_string
						? track.get_duration_string()
						: null

					// Получаем базовую статистику
					const totalDistance = track.get_distance ? track.get_distance() : 0
					const totalTime = track.get_total_time ? track.get_total_time() : 0
					const elevationGain = track.get_elevation_gain
						? track.get_elevation_gain()
						: 0
					const elevationLoss = track.get_elevation_loss
						? track.get_elevation_loss()
						: 0

					setStats({
						totalDistance: totalDistance || 0,
						totalTime: totalTime || 0,
						elevationGain: elevationGain || 0,
						elevationLoss: elevationLoss || 0,
						pointsCount: pointsArray.length,
						extensionData: extensionData || {},
					})

					resolve()
				})

				gpx.on('error', function (e) {
					reject(new Error(`Ошибка загрузки GPX: ${e.error}`))
				})
			})
		} catch (err) {
			console.error('Ошибка загрузки GPX:', err)
			setError(err.message)
			setPoints([])
			setStats(null)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		loadGpx(gpxUrl)
	}, [gpxUrl, loadGpx])

	return { points, loading, error, stats, reload: () => loadGpx(gpxUrl) }
}

export default useGpxLoader
