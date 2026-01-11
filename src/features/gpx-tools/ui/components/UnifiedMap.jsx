// (Плеер треков)
// Назначение: Анимированное воспроизведение трека на карте
// Функции:
// Контроль воспроизведения (play/pause)
// Регулировка скорости
// Отображение текущей скорости
// Маркер максимальной скорости (медалька)
// Интеграция: Синхронизация с картой через Leaflet маркеры


import React, { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-gpx'
import styles from './UnifiedMap.module.css'

const UnifiedMap = ({
	// Основные параметры
	center = [52.416925, 103.738906],
	zoom = 15,

	// Треки (GPX)
	trackUrls = [], // массив URL треков
	trackColors = ['#1890ff', '#f5222d', '#52c41a', '#faad14'], // цвета треков
	trackNames = [], // имена треков для легенды

	// Полилинии (прямые координаты)
	polylines = [], // массив массивов точек [{lat, lng}]
	polylineColors = ['#ff4d4f', '#fa8c16', '#13c2c2'],
	polylineOptions = [], // опции для каждой полилинии

	// Маркеры
	markers = [], // массив {lat, lng, icon?, popup?}

	// Управление
	onMapReady, // callback с инстансом карты
	onTracksLoaded, // callback при загрузке всех треков (массив точек)
	fitBounds = true, // автоцентрирование
	className = '',
	loading = false,

	// Для редактора треков
	trimStart = null,
	trimEnd = null,
	trimmedSegment = null,

	// Для плеера/сравнения
	currentPointIndex = null,
	playerMarkerOptions = null,
	showLegend = false,

	// Высота карты
	height = '400px',
}) => {
	const mapContainerRef = useRef(null)
	const mapInstanceRef = useRef(null)

	// Ссылки на слои для очистки
	const trackLayersRef = useRef([])
	const polylineLayersRef = useRef([])
	const markerLayersRef = useRef([])
	const trimmedSegmentLayerRef = useRef(null)
	const playerMarkerRef = useRef(null)

	const [mapReady, setMapReady] = useState(false)
	const [loadedTracks, setLoadedTracks] = useState([]) // массив загруженных треков с точками

	// 1. ИНИЦИАЛИЗАЦИЯ КАРТЫ (основной useEffect)
	useEffect(() => {
		if (!mapContainerRef.current || mapInstanceRef.current) return

		console.log('🗺️ UnifiedMap: Инициализирую карту...')

		const mapInstance = L.map(mapContainerRef.current).setView(center, zoom)

		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap',
			maxZoom: 19,
		}).addTo(mapInstance)

		mapInstanceRef.current = mapInstance

		setMapReady(true)
		console.log('✅ UnifiedMap: Карта готова')

		if (onMapReady) {
			onMapReady(mapInstance)
		}

		return () => {
			console.log('🗑️ UnifiedMap: Удаляю карту')
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove()
				mapInstanceRef.current = null
				setMapReady(false)
			}
		}
	}, []) // Только при монтировании

	// 2. ЗАГРУЗКА ТРЕКОВ (GPX)
	useEffect(() => {
		if (!mapReady || !mapInstanceRef.current || trackUrls.length === 0) return

		console.log(`🔄 UnifiedMap: Загружаю ${trackUrls.length} треков...`)

		// Очищаем старые треки
		trackLayersRef.current.forEach(layer => {
			if (layer && mapInstanceRef.current.hasLayer(layer)) {
				mapInstanceRef.current.removeLayer(layer)
			}
		})
		trackLayersRef.current = []
		setLoadedTracks([])

		const allTrackPoints = []
		let tracksLoadedCount = 0

		// Загружаем каждый трек
		trackUrls.forEach((url, index) => {
			const color = trackColors[index % trackColors.length]

			try {
				const gpxLayer = new L.GPX(url, {
					async: true,
					polyline_options: {
						color: color,
						weight: 3,
						opacity: 0.8,
						lineCap: 'round',
					},
					marker_options: null, // без маркеров
				})

				gpxLayer.on('loaded', e => {
					const track = e.target
					console.log(`✅ UnifiedMap: Трек ${index + 1} загружен`)

					// Извлекаем точки из трека
					const points = extractPointsFromGPX(track)
					allTrackPoints[index] = {
						points,
						color,
						name: trackNames[index] || `Трек ${index + 1}`,
					}

					tracksLoadedCount++

					// Когда все треки загружены
					if (tracksLoadedCount === trackUrls.length) {
						setLoadedTracks(allTrackPoints)

						if (onTracksLoaded) {
							onTracksLoaded(allTrackPoints.map(t => t.points))
						}

						// Центрируем карту если нужно
						if (fitBounds && allTrackPoints.length > 0) {
							setTimeout(() => {
								const bounds = getAllBounds(allTrackPoints)
								if (bounds) {
									mapInstanceRef.current.fitBounds(bounds.pad(0.1))
								}
							}, 500)
						}
					}
				})

				gpxLayer.on('error', e => {
					console.error(
						`❌ UnifiedMap: Ошибка загрузки трека ${index + 1}:`,
						e.error
					)
				})

				gpxLayer.addTo(mapInstanceRef.current)
				trackLayersRef.current[index] = gpxLayer
			} catch (error) {
				console.error(
					`❌ UnifiedMap: Ошибка создания GPX слоя ${index + 1}:`,
					error
				)
			}
		})

		return () => {
			// Очистка при размонтировании
			trackLayersRef.current.forEach(layer => {
				if (layer && mapInstanceRef.current?.hasLayer(layer)) {
					mapInstanceRef.current.removeLayer(layer)
				}
			})
		}
	}, [trackUrls, mapReady, fitBounds])

	// 3. ОТРИСОВКА ПОЛИЛИНИЙ
	useEffect(() => {
		if (!mapReady || !mapInstanceRef.current || polylines.length === 0) return

		// Очищаем старые полилинии
		polylineLayersRef.current.forEach(layer => {
			if (layer && mapInstanceRef.current.hasLayer(layer)) {
				mapInstanceRef.current.removeLayer(layer)
			}
		})
		polylineLayersRef.current = []

		// Рисуем новые полилинии
		polylines.forEach((points, index) => {
			if (!points || points.length < 2) return

			const color = polylineColors[index % polylineColors.length]
			const options = {
				color,
				weight: 3,
				opacity: 0.7,
				...polylineOptions[index],
			}

			const latlngs = points.map(p => [p.lat, p.lng])
			const polyline = L.polyline(latlngs, options).addTo(
				mapInstanceRef.current
			)

			polylineLayersRef.current[index] = polyline
		})
	}, [polylines, mapReady])

	// 4. ОТРИСОВКА МАРКЕРОВ
	useEffect(() => {
		if (!mapReady || !mapInstanceRef.current || markers.length === 0) return

		// Очищаем старые маркеры
		markerLayersRef.current.forEach(layer => {
			if (layer && mapInstanceRef.current.hasLayer(layer)) {
				mapInstanceRef.current.removeLayer(layer)
			}
		})
		markerLayersRef.current = []

		// Создаем новые маркеры
		markers.forEach((marker, index) => {
			if (!marker || !marker.lat || !marker.lng) return

			let icon = marker.icon
			if (!icon) {
				// Дефолтная иконка
				icon = L.divIcon({
					html: `<div style="
            width: 12px;
            height: 12px;
            background: #ff4d4f;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 5px rgba(0,0,0,0.5);
          "></div>`,
					iconSize: [16, 16],
					iconAnchor: [8, 8],
				})
			}

			const leafletMarker = L.marker([marker.lat, marker.lng], { icon }).addTo(
				mapInstanceRef.current
			)

			if (marker.popup) {
				leafletMarker.bindPopup(marker.popup)
			}

			markerLayersRef.current[index] = leafletMarker
		})
	}, [markers, mapReady])

	// 5. ВЫДЕЛЕННЫЙ СЕГМЕНТ (для редактора)
	useEffect(() => {
		if (
			!mapReady ||
			!mapInstanceRef.current ||
			!trimmedSegment ||
			!loadedTracks[0]
		)
			return

		const { start, end } = trimmedSegment
		const trackPoints = loadedTracks[0].points

		if (start >= end || start < 0 || end >= trackPoints.length) return

		// Удаляем старый выделенный участок
		if (trimmedSegmentLayerRef.current) {
			mapInstanceRef.current.removeLayer(trimmedSegmentLayerRef.current)
		}

		// Создаем точки для выделенного участка
		const segmentPoints = trackPoints
			.slice(start, end + 1)
			.map(point => [point.lat, point.lng])

		if (segmentPoints.length > 1) {
			trimmedSegmentLayerRef.current = L.polyline(segmentPoints, {
				color: '#ff4d4f',
				weight: 4,
				opacity: 0.8,
				dashArray: '10, 10', // штрихпунктир
				lineCap: 'round',
			}).addTo(mapInstanceRef.current)
		}

		return () => {
			if (trimmedSegmentLayerRef.current) {
				mapInstanceRef.current.removeLayer(trimmedSegmentLayerRef.current)
			}
		}
	}, [trimmedSegment, mapReady, loadedTracks])

	// 6. МАРКЕР ПЛЕЕРА (движущаяся точка)
	useEffect(() => {
		if (
			!mapReady ||
			!mapInstanceRef.current ||
			currentPointIndex == null ||
			!loadedTracks[0]
		)
			return

		const trackPoints = loadedTracks[0].points
		if (currentPointIndex < 0 || currentPointIndex >= trackPoints.length) return

		// Удаляем старый маркер
		if (playerMarkerRef.current) {
			mapInstanceRef.current.removeLayer(playerMarkerRef.current)
		}

		const point = trackPoints[currentPointIndex]
		const iconOptions = playerMarkerOptions || {
			html: `<div style="
        width: 16px;
        height: 16px;
        background: #52c41a;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 8px rgba(0,0,0,0.5);
      "></div>`,
			iconSize: [22, 22],
			iconAnchor: [11, 11],
		}

		const icon = L.divIcon(iconOptions)
		playerMarkerRef.current = L.marker([point.lat, point.lng], { icon })
			.addTo(mapInstanceRef.current)
			.bindPopup(`Точка ${currentPointIndex + 1}`)

		return () => {
			if (playerMarkerRef.current) {
				mapInstanceRef.current.removeLayer(playerMarkerRef.current)
			}
		}
	}, [currentPointIndex, mapReady, loadedTracks, playerMarkerOptions])

	// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ

	const extractPointsFromGPX = useCallback(track => {
		const points = []
		track.getLayers().forEach(layer => {
			if (layer instanceof L.Polyline) {
				const latlngs = layer.getLatLngs()
				latlngs.forEach((latlng, index) => {
					points.push({
						lat: latlng.lat,
						lng: latlng.lng,
						elevation: latlng.meta?.ele,
						time: latlng.meta?.time,
						timestamp: latlng.meta?.time
							? new Date(latlng.meta.time).getTime()
							: null,
					})
				})
			}
		})
		return points
	}, [])

	const getAllBounds = useCallback(tracks => {
		if (!tracks || tracks.length === 0) return null

		let bounds = null
		tracks.forEach(track => {
			if (track.points && track.points.length > 0) {
				const trackBounds = L.latLngBounds(
					track.points.map(p => [p.lat, p.lng])
				)
				if (!bounds) {
					bounds = trackBounds
				} else {
					bounds.extend(trackBounds)
				}
			}
		})
		return bounds
	}, [])

	// Функция для центрирования карты
	const fitMapToTracks = useCallback(() => {
		if (!mapReady || !mapInstanceRef.current || loadedTracks.length === 0)
			return

		const bounds = getAllBounds(loadedTracks)
		if (bounds) {
			mapInstanceRef.current.fitBounds(bounds.pad(0.1))
		}
	}, [mapReady, loadedTracks, getAllBounds])

	// РЕНДЕР
	return (
		<div className={`${styles.container} ${className}`}>
			<div
				ref={mapContainerRef}
				className={styles.mapContainer}
				style={{
					width: '100%',
					height: height,
					borderRadius: '8px',
					overflow: 'hidden',
					border: '1px solid #f0f0f0',
					position: 'relative',
				}}
			/>

			{/* Легенда (если нужно) */}
			{showLegend && loadedTracks.length > 0 && (
				<div className={styles.legend}>
					{loadedTracks.map((track, index) => (
						<div key={index} className={styles.legendItem}>
							<div
								className={styles.colorBox}
								style={{ backgroundColor: track.color || trackColors[index] }}
							/>
							<span>{track.name || `Трек ${index + 1}`}</span>
						</div>
					))}
				</div>
			)}

			{/* Загрузка */}
			{loading && (
				<div className={styles.loadingOverlay}>
					<div className={styles.spinner} />
					<div>Загрузка карты...</div>
				</div>
			)}
		</div>
	)
}

export default UnifiedMap
