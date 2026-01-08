import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-gpx'
import styles from './TrackVisualizer.module.css'

const TrackVisualizer = ({
	gpxUrl,
	onTrackLoaded,
	startMarker,
	endMarker,
	onMapReady,
	trimmedSegment,
}) => {
	const mapContainerRef = useRef(null)
	const mapInstanceRef = useRef(null)
	const gpxLayerRef = useRef(null)
	const [loading, setLoading] = useState(true)
	const [trackStats, setTrackStats] = useState(null)
	const [mapReady, setMapReady] = useState(false)
	const [allTrackPoints, setAllTrackPoints] = useState([])
	const [markers, setMarkers] = useState({ start: null, end: null })

	// Инициализация карты
	useEffect(() => {
		if (!mapContainerRef.current || mapInstanceRef.current) return

		console.log('🗺️ Инициализирую карту...')

		const mapInstance = L.map(mapContainerRef.current).setView(
			[52.416925, 103.738906],
			15
		)

		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap',
			maxZoom: 19,
		}).addTo(mapInstance)

		mapInstanceRef.current = mapInstance

		setTimeout(() => {
			setMapReady(true)
			console.log('✅ Карта готова')
			if (onMapReady) {
				onMapReady(mapInstance)
			}
		}, 300)

		return () => {
			console.log('🗑️ Удаляю карту')
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove()
				mapInstanceRef.current = null
				setMapReady(false)
			}
		}
	}, [])

	// Загрузка GPX
	useEffect(() => {
		if (!mapReady || !mapInstanceRef.current || !gpxUrl) {
			console.log('⏳ Ожидаю:', { mapReady, gpxUrl: !!gpxUrl })
			return
		}

		console.log('🚀 Загружаю GPX')

		const loadGpx = async () => {
			try {
				setLoading(true)

				// Очистка старого слоя
				if (gpxLayerRef.current) {
					mapInstanceRef.current.removeLayer(gpxLayerRef.current)
				}

				// Загрузка и парсинг GPX файла
				let parsedData = { points: [], totalTime: null, totalDistance: null }
				try {
					const response = await fetch(gpxUrl)
					const gpxText = await response.text()

					// Парсим GPX с учетом namespace
					parsedData = parseGPXFile(gpxText)
					console.log(`📊 Извлечено ${parsedData.points.length} точек из GPX`)
					console.log(
						'⏱️ Общее время из extensions:',
						parsedData.totalTime,
						'секунд'
					)
					console.log('📏 Общая дистанция:', parsedData.totalDistance, 'метров')
				} catch (fetchError) {
					console.error('❌ Ошибка загрузки GPX файла:', fetchError)
				}

				const points = parsedData.points

				// СОЗДАЕМ GPX СЛОЙ ПЕРЕД ТЕМ КАК ВЕШАТЬ ОБРАБОТЧИКИ
				gpxLayerRef.current = new L.GPX(gpxUrl, {
					async: true,
					polyline_options: {
						color: '#1890ff',
						weight: 4,
						opacity: 0.8,
						lineCap: 'round',
					},
					marker_options: null,
				})

				// ТЕПЕРЬ ВЕШАЕМ ОБРАБОТЧИКИ
				gpxLayerRef.current.on('loaded', e => {
					console.log('✅ GPX отображен на карте')
					const track = e.target

					// Если не удалось получить точки из файла, пробуем извлечь из полилинии
					let finalPoints = points
					if (points.length === 0) {
						console.log('🔍 Пробую извлечь точки из полилинии...')
						finalPoints = extractPointsFromPolyline(track)
					}

					console.log(`🎯 Итоговое количество точек: ${finalPoints.length}`)

					setAllTrackPoints(finalPoints)

					const stats = {
						distance: track.get_distance ? track.get_distance() : 0,
						name: track.get_name ? track.get_name() : 'Трек',
						pointsCount: finalPoints.length,
						duration: track.get_total_time ? track.get_total_time() : 0,
						elevationGain: track.get_elevation_gain
							? track.get_elevation_gain()
							: 0,
					}

					setTrackStats(stats)
					setLoading(false)

					// Центрируем карту
					if (track.getBounds) {
						mapInstanceRef.current.fitBounds(track.getBounds().pad(0.1))
					}

					// Передаем данные в редактор
					if (onTrackLoaded) {
						console.log(
							'📤 Отправляю данные в редактор, точек:',
							finalPoints.length
						)
						onTrackLoaded(track, stats, finalPoints, {
							totalTime: parsedData.totalTime,
							totalDistance: parsedData.totalDistance,
						})
					}
				})

				gpxLayerRef.current.on('error', err => {
					console.error('❌ Ошибка отображения GPX:', err)
					setLoading(false)
				})

				// ДОБАВЛЯЕМ НА КАРТУ ПОСЛЕ СОЗДАНИЯ
				gpxLayerRef.current.addTo(mapInstanceRef.current)
			} catch (error) {
				console.error('❌ Ошибка создания GPX слоя:', error)
				setLoading(false)
			}
		}
		loadGpx()

		return () => {
			if (gpxLayerRef.current && mapInstanceRef.current) {
				mapInstanceRef.current.removeLayer(gpxLayerRef.current)
				gpxLayerRef.current = null
			}
		}
	}, [gpxUrl, mapReady, onTrackLoaded])

	// Обновление маркеров обрезки
	useEffect(() => {
		if (
			!mapReady ||
			!mapInstanceRef.current ||
			startMarker === undefined ||
			endMarker === undefined ||
			allTrackPoints.length === 0
		) {
			return
		}

		console.log('📍 Обновляю маркеры обрезки:', { startMarker, endMarker })

		// Убираем старые маркеры
		if (markers.start) {
			mapInstanceRef.current.removeLayer(markers.start)
		}
		if (markers.end) {
			mapInstanceRef.current.removeLayer(markers.end)
		}

		// Используем реальные координаты из точек трека
		const startPoint =
			allTrackPoints[Math.min(startMarker, allTrackPoints.length - 1)]
		const endPoint =
			allTrackPoints[Math.min(endMarker, allTrackPoints.length - 1)]

		// Создаем минималистичные маркеры
		const startIcon = L.divIcon({
			className: styles.minimalMarker,
			html: `
		<div style="
			position: relative;
		">
			<!-- Круг СВЕРХУ -->
			<div style="
				position: absolute;
				top: -15px;                    /* Круг ВЫШЕ треугольника */
				left: -4px;
				width: 8px;
				height: 8px;
				background: #52c41a;
				border-radius: 50%;
				border: 2px solid white;
				box-shadow: 0 0 3px rgba(0,0,0,0.5);
				z-index: 10;
			"></div>
			<!-- Треугольник ВНИЗУ, острие на треке -->
			<div style="
				width: 0;
				height: 0;
				border-left: 8px solid transparent;
				border-right: 8px solid transparent;
				border-top: 14px solid #52c41a;  /* Треугольник смотрит ВНИЗ */
				position: absolute;
				top: -8px;                      /* Треугольник под кругом */
				left: -8px;
			"></div>
		</div>
	`,
			iconSize: [16, 22] /* Высота учитывает круг сверху */,
			iconAnchor: [0, 0] /* Якорь в ВЕРХНЕЙ точке (где круг) */,
		})

		const endIcon = L.divIcon({
			className: styles.minimalMarker,
			html: `
		<div style="
			position: relative;
		">
			<!-- Круг СВЕРХУ -->
			<div style="
				position: absolute;
				top: -15px;                    /* Круг ВЫШЕ треугольника */
				left: -4px;
				width: 8px;
				height: 8px;
				background: #f5222d;
				border-radius: 50%;
				border: 2px solid white;
				box-shadow: 0 0 3px rgba(0,0,0,0.5);
				z-index: 10;
			"></div>
			<!-- Треугольник ВНИЗУ, острие на треке -->
			<div style="
				width: 0;
				height: 0;
				border-left: 8px solid transparent;
				border-right: 8px solid transparent;
				border-top: 14px solid #f5222d;  /* Треугольник смотрит ВНИЗ */
				position: absolute;
				top: -8px;                      /* Треугольник под кругом */
				left: -8px;
			"></div>
		</div>
	`,
			iconSize: [16, 22],
			iconAnchor: [-2, 0] /* Якорь в ВЕРХНЕЙ точке (где круг) */,
		})
		const newMarkers = {}

		if (startPoint) {
			newMarkers.start = L.marker([startPoint.lat, startPoint.lng], {
				icon: startIcon,
			})
				.addTo(mapInstanceRef.current)
				.bindPopup(
					`<div style="font-size: 12px;">Начало<br>Точка ${startMarker + 1}/${
						allTrackPoints.length
					}</div>`
				)
		}

		if (endPoint) {
			newMarkers.end = L.marker([endPoint.lat, endPoint.lng], { icon: endIcon })
				.addTo(mapInstanceRef.current)
				.bindPopup(
					`<div style="font-size: 12px;">Конец<br>Точка ${endMarker + 1}/${
						allTrackPoints.length
					}</div>`
				)
		}

		setMarkers(newMarkers)

		// Очистка при размонтировании
		return () => {
			if (markers.start && mapInstanceRef.current) {
				mapInstanceRef.current.removeLayer(markers.start)
			}
			if (markers.end && mapInstanceRef.current) {
				mapInstanceRef.current.removeLayer(markers.end)
			}
		}
	}, [startMarker, endMarker, mapReady, allTrackPoints])
	useEffect(() => {
		if (
			!mapReady ||
			!mapInstanceRef.current ||
			!trimmedSegment ||
			!allTrackPoints.length
		) {
			return
		}

		const { start, end } = trimmedSegment

		// Удаляем старый выделенный участок
		if (window.trimmedSegmentLayer) {
			mapInstanceRef.current.removeLayer(window.trimmedSegmentLayer)
		}

		// Создаем точки для выделенного участка
		const segmentPoints = allTrackPoints
			.slice(start, end + 1)
			.map(point => [point.lat, point.lng])

		if (segmentPoints.length > 1) {
			// Создаем штрихпунктирную линию
			window.trimmedSegmentLayer = L.polyline(segmentPoints, {
				color: '#ff4d4f',
				weight: 4,
				opacity: 0.8,
				dashArray: '10, 10', // ← ШТРИХПУНКТИР
				lineCap: 'round',
				className: styles.trimmedSegment,
			}).addTo(mapInstanceRef.current)
		}

		return () => {
			if (window.trimmedSegmentLayer && mapInstanceRef.current) {
				mapInstanceRef.current.removeLayer(window.trimmedSegmentLayer)
			}
		}
	}, [trimmedSegment, mapReady, allTrackPoints])
	// Функция парсинга GPX файла
	const parseGPXFile = gpxText => {
		const points = []
		try {
			const parser = new DOMParser()
			const xmlDoc = parser.parseFromString(gpxText, 'text/xml')

			// GPX namespace
			const gpxNs = 'http://www.topografix.com/GPX/1/0'

			// Получаем элементы с учетом namespace
			const trkpts = xmlDoc.getElementsByTagNameNS(gpxNs, 'trkpt')
			console.log(`Найдено trkpt элементов (с namespace): ${trkpts.length}`)

			// Парсим время из metadata или extensions
			let totalTime = null
			let totalDistance = null

			// Пробуем получить из extensions
			const extensions = xmlDoc.getElementsByTagNameNS(gpxNs, 'extensions')[0]
			if (extensions) {
				const timeElem = extensions.getElementsByTagName('totalTime')[0]
				const distElem = extensions.getElementsByTagName('totalDistance')[0]

				if (timeElem) totalTime = parseFloat(timeElem.textContent)
				if (distElem) totalDistance = parseFloat(distElem.textContent)

				console.log('📊 Данные из extensions:', {
					totalTime,
					totalDistance,
					timeElemText: timeElem?.textContent,
					distElemText: distElem?.textContent,
				})
			}

			// Парсим точки
			for (let i = 0; i < trkpts.length; i++) {
				const trkpt = trkpts[i]
				const lat = parseFloat(trkpt.getAttribute('lat'))
				const lon = parseFloat(trkpt.getAttribute('lon'))

				if (!isNaN(lat) && !isNaN(lon)) {
					// Получаем время с учетом namespace
					const timeElem = trkpt.getElementsByTagNameNS(gpxNs, 'time')[0]
					const timeText = timeElem?.textContent

					// Парсим время
					let timestamp = null
					if (timeText) {
						try {
							const date = new Date(timeText)
							if (!isNaN(date.getTime())) {
								timestamp = date.getTime()
							}
						} catch (error) {
							console.warn('Ошибка парсинга времени:', error)
						}
					}

					const eleElem = trkpt.getElementsByTagNameNS(gpxNs, 'ele')[0]

					points.push({
						lat: lat,
						lng: lon,
						index: i,
						time: timeText,
						timestamp: timestamp,
						elevation: eleElem ? parseFloat(eleElem.textContent) : null,
						type: 'track',
					})
				}
			}

			// Возвращаем дополнительно totalTime и totalDistance
			return {
				points,
				totalTime, // 3418 секунд
				totalDistance, // 5720 метров
			}
		} catch (error) {
			console.error('Ошибка при парсинге GPX:', error)
			return { points: [], totalTime: null, totalDistance: null }
		}
	}

	// Функция извлечения точек из полилинии Leaflet
	const extractPointsFromPolyline = track => {
		const points = []

		if (!track._layers) {
			console.log('Нет слоев в track._layers')
			return points
		}

		Object.values(track._layers).forEach(layer => {
			if (layer instanceof L.Polyline) {
				try {
					const latLngs = layer.getLatLngs()

					if (Array.isArray(latLngs)) {
						if (latLngs.length > 0 && latLngs[0].lat !== undefined) {
							latLngs.forEach((ll, index) => {
								points.push({
									lat: ll.lat,
									lng: ll.lng,
									index: points.length,
									source: 'polyline-flat',
								})
							})
						} else if (Array.isArray(latLngs[0])) {
							latLngs.forEach((segment, segmentIndex) => {
								if (Array.isArray(segment)) {
									segment.forEach((ll, pointIndex) => {
										if (ll && ll.lat !== undefined) {
											points.push({
												lat: ll.lat,
												lng: ll.lng,
												index: points.length,
												segment: segmentIndex,
												source: 'polyline-nested',
											})
										}
									})
								}
							})
						}
					}
				} catch (error) {
					console.warn('Ошибка извлечения точек из полилинии:', error)
				}
			}
		})

		console.log(`Извлечено ${points.length} точек из полилинии`)
		return points
	}

	return (
		<div className={styles.container}>
			<div
				ref={mapContainerRef}
				className={styles.mapContainer}
				style={{
					width: '100%',
					height: '400px',
					minHeight: '400px',
					borderRadius: '8px',
					overflow: 'hidden',
					border: '1px solid #f0f0f0',
					position: 'relative',
				}}
			/>

			{loading && (
				<div className={styles.loadingOverlay}>
					<div className={styles.spinner} />
					<div>Загрузка трека...</div>
				</div>
			)}

			{!mapReady && !loading && (
				<div className={styles.loadingOverlay}>
					<div>Инициализация карты...</div>
				</div>
			)}
		</div>
	)
}

export default TrackVisualizer
