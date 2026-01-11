/**
 * Утилиты для парсинга GPX файлов
 */

/**
Назначение: Низкоуровневый парсинг GPX XML

Функции: parseGPX (парсинг из текста), getGPXPoints (извлечение из Leaflet слоя)
 */
export function parseGPX(gpxText) {
	const points = []

	try {
		const parser = new DOMParser()
		const xmlDoc = parser.parseFromString(gpxText, 'text/xml')

		// Проверяем на ошибки парсинга
		const parserError = xmlDoc.getElementsByTagName('parsererror')
		if (parserError.length > 0) {
			console.error('Ошибка парсинга XML:', parserError[0].textContent)
			return points
		}

		// Ищем все возможные типы точек
		const pointTypes = ['trkpt', 'rtept', 'wpt']

		pointTypes.forEach(type => {
			const elements = xmlDoc.getElementsByTagName(type)
			if (elements.length > 0) {
				console.log(`Найдено <${type}> элементов: ${elements.length}`)
			}
		})

		// В первую очередь ищем трекпоинты (trkpt)
		const trkpts = xmlDoc.getElementsByTagName('trkpt')

		if (trkpts.length > 0) {
			for (let i = 0; i < trkpts.length; i++) {
				const trkpt = trkpts[i]
				const point = parseTrackPoint(trkpt, i)
				if (point) {
					points.push(point)
				}
			}
		} else {
			// Если нет трекпоинтов, ищем точки маршрута (rtept)
			const rtepts = xmlDoc.getElementsByTagName('rtept')
			if (rtepts.length > 0) {
				for (let i = 0; i < rtepts.length; i++) {
					const rtept = rtepts[i]
					const point = parseRoutePoint(rtept, i)
					if (point) {
						points.push(point)
					}
				}
			}
		}
	} catch (error) {
		console.error('Ошибка при парсинге GPX:', error)
	}

	return points
}

/**
 * Парсит трекпоинт (trkpt)
 */
function parseTrackPoint(trkpt, index) {
	try {
		const lat = parseFloat(trkpt.getAttribute('lat'))
		const lon = parseFloat(trkpt.getAttribute('lon'))

		if (isNaN(lat) || isNaN(lon)) {
			return null
		}

		const eleElem = trkpt.getElementsByTagName('ele')[0]
		const timeElem = trkpt.getElementsByTagName('time')[0]
		const nameElem = trkpt.getElementsByTagName('name')[0]
		const descElem = trkpt.getElementsByTagName('desc')[0]

		return {
			lat: lat,
			lng: lon,
			index: index,
			type: 'track',
			elevation: eleElem ? parseFloat(eleElem.textContent) : null,
			time: timeElem ? timeElem.textContent : null,
			name: nameElem ? nameElem.textContent : null,
			description: descElem ? descElem.textContent : null,
			timestamp: timeElem ? new Date(timeElem.textContent).getTime() : null,
		}
	} catch (error) {
		console.warn('Ошибка парсинга трекпоинта:', error)
		return null
	}
}

/**
 * Парсит точку маршрута (rtept)
 */
function parseRoutePoint(rtept, index) {
	try {
		const lat = parseFloat(rtept.getAttribute('lat'))
		const lon = parseFloat(rtept.getAttribute('lon'))

		if (isNaN(lat) || isNaN(lon)) {
			return null
		}

		const nameElem = rtept.getElementsByTagName('name')[0]
		const descElem = rtept.getElementsByTagName('desc')[0]

		return {
			lat: lat,
			lng: lon,
			index: index,
			type: 'route',
			name: nameElem ? nameElem.textContent : null,
			description: descElem ? descElem.textContent : null,
		}
	} catch (error) {
		console.warn('Ошибка парсинга точки маршрута:', error)
		return null
	}
}

/**
 * Извлекает точки из GPX слоя Leaflet
 */
export function getGPXPoints(track) {
	const points = []

	if (!track || !track._layers) {
		return points
	}

	Object.values(track._layers).forEach(layer => {
		if (layer instanceof L.Polyline) {
			try {
				const latLngs = layer.getLatLngs()
				extractLatLngs(latLngs, points)
			} catch (error) {
				console.warn('Ошибка извлечения точек из слоя:', error)
			}
		}
	})

	return points
}

/**
 * Рекурсивно извлекает координаты из Leaflet latLngs
 */
function extractLatLngs(latLngs, points) {
	if (!Array.isArray(latLngs)) {
		return
	}

	// Проверяем первый элемент для определения структуры
	if (latLngs.length > 0) {
		const firstElement = latLngs[0]

		// Если это плоский массив точек L.LatLng
		if (firstElement.lat !== undefined) {
			latLngs.forEach((ll, index) => {
				points.push({
					lat: ll.lat,
					lng: ll.lng,
					index: points.length,
				})
			})
		}
		// Если это вложенный массив (сегменты)
		else if (Array.isArray(firstElement)) {
			latLngs.forEach(segment => {
				if (Array.isArray(segment)) {
					segment.forEach(ll => {
						if (ll && ll.lat !== undefined) {
							points.push({
								lat: ll.lat,
								lng: ll.lng,
								index: points.length,
							})
						}
					})
				}
			})
		}
	}
}

export default {
	parseGPX,
	getGPXPoints,
}
