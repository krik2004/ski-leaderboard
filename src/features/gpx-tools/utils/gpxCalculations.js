// Функции расчета расстояния и других метрик для GPX

/**
 * Расчет расстояния между двумя точками (метры)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
	const R = 6371000 // радиус Земли в метрах
	const dLat = ((lat2 - lat1) * Math.PI) / 180
	const dLon = ((lon2 - lon1) * Math.PI) / 180
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2)
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
	const distance = R * c

	// Фильтруем слишком маленькие расстояния (меньше 1м - скорее всего шум)
	return distance < 1 ? 0 : distance
}

/**
 * Расчет скорости между двумя точками (км/ч)
 */
export const calculateSpeed = (point1, point2) => {
	if (!point1 || !point2) return 0

	// Получаем временные метки
	const time1 =
		point1.timestamp || (point1.time ? new Date(point1.time).getTime() : null)
	const time2 =
		point2.timestamp || (point2.time ? new Date(point2.time).getTime() : null)

	if (!time1 || !time2 || time1 === time2) return 0

	// Рассчитываем расстояние
	const distance = calculateDistance(
		point1.lat,
		point1.lng,
		point2.lat,
		point2.lng
	)
	const timeDiff = (time2 - time1) / 1000 // секунды

	if (timeDiff <= 0) return 0

	// Скорость в км/ч
	return (distance / timeDiff) * 3.6
}

/**
 * Нормализация треков - приведение к одинаковому количеству точек
 */
export const normalizeTracks = (track1Points, track2Points) => {
	const maxPoints = Math.max(track1Points.length, track2Points.length)

	if (track1Points.length === track2Points.length) {
		return { track1: track1Points, track2: track2Points }
	}

	// Интерполяция недостающих точек
	const normalizedTrack1 = interpolateTrack(track1Points, maxPoints)
	const normalizedTrack2 = interpolateTrack(track2Points, maxPoints)

	return { track1: normalizedTrack1, track2: normalizedTrack2 }
}

/**
 * Интерполяция точек трека
 */
const interpolateTrack = (points, targetCount) => {
	if (points.length >= targetCount || points.length < 2) {
		return points.slice(0, targetCount)
	}

	const result = []
	const step = (points.length - 1) / (targetCount - 1)

	for (let i = 0; i < targetCount; i++) {
		const index = i * step
		const prevIndex = Math.floor(index)
		const nextIndex = Math.min(Math.ceil(index), points.length - 1)

		if (prevIndex === nextIndex) {
			result.push(points[prevIndex])
		} else {
			const ratio = index - prevIndex
			const prevPoint = points[prevIndex]
			const nextPoint = points[nextIndex]

			// Линейная интерполяция
			const interpolatedPoint = {
				lat: prevPoint.lat + (nextPoint.lat - prevPoint.lat) * ratio,
				lng: prevPoint.lng + (nextPoint.lng - prevPoint.lng) * ratio,
				elevation:
					prevPoint.elevation && nextPoint.elevation
						? prevPoint.elevation +
						  (nextPoint.elevation - prevPoint.elevation) * ratio
						: undefined,
				timestamp:
					prevPoint.timestamp && nextPoint.timestamp
						? prevPoint.timestamp +
						  (nextPoint.timestamp - prevPoint.timestamp) * ratio
						: undefined,
				time: prevPoint.time, // Используем время предыдущей точки
			}
			result.push(interpolatedPoint)
		}
	}

	return result
}

/**
 * Расчет отставания между двумя треками в каждой точке
 */
export const calculateLag = (track1Points, track2Points) => {
	const { track1, track2 } = normalizeTracks(track1Points, track2Points)
	const lags = []

	for (let i = 0; i < track1.length; i++) {
		const point1 = track1[i]
		const point2 = track2[i]

		if (!point1 || !point2) {
			lags.push({ distance: 0, time: 0 })
			continue
		}

		// Отставание по расстоянию (метры)
		const distanceLag = calculateDistance(
			point1.lat,
			point1.lng,
			point2.lat,
			point2.lng
		)

		// Отставание по времени (секунды)
		let timeLag = 0
		if (point1.timestamp && point2.timestamp) {
			timeLag = Math.abs(point1.timestamp - point2.timestamp) / 1000
		}

		lags.push({
			distance: distanceLag,
			time: timeLag,
			pointIndex: i,
		})
	}

	return lags
}

/**
 * Поиск ключевых участков с максимальным отставанием
 */
export const findKeySegments = (lags, segmentSize = 10) => {
	const segments = []

	for (let i = 0; i <= lags.length - segmentSize; i++) {
		const segment = lags.slice(i, i + segmentSize)
		const avgDistance =
			segment.reduce((sum, lag) => sum + lag.distance, 0) / segmentSize
		const avgTime =
			segment.reduce((sum, lag) => sum + lag.time, 0) / segmentSize

		segments.push({
			startIndex: i,
			endIndex: i + segmentSize - 1,
			avgDistance,
			avgTime,
			totalDistance: segment.reduce((sum, lag) => sum + lag.distance, 0),
			totalTime: segment.reduce((sum, lag) => sum + lag.time, 0),
		})
	}

	// Сортируем по отставанию
	return segments.sort((a, b) => b.avgDistance - a.avgDistance).slice(0, 5)
}
