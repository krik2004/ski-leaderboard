import React, { useEffect, useState } from 'react'
import L from 'leaflet'
import 'leaflet-gpx'
import { supabase } from '../../../shared/api/supabase'
import { Spin, Alert } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

const GpxLayer = ({ map }) => {
	const [loading, setLoading] = useState(true)
	const [gpxLayers, setGpxLayers] = useState([])
	const [error, setError] = useState(null)

	useEffect(() => {
		if (!map) return

		const loadGpxTracks = async () => {
			try {
				setLoading(true)

				// Получаем все заезды с GPX файлами
				const { data: lapTimes, error: dbError } = await supabase
					.from('lap_times')
					.select('*')
					.not('gpx_track_url', 'is', null)
					.order('date', { ascending: false })

				if (dbError) throw dbError

				console.log('Найдено GPX треков:', lapTimes.length)
				const layers = []

				// Для каждого GPX файла создаем слой
				lapTimes.forEach(lap => {
					if (lap.gpx_track_url && lap.gpx_track_url.startsWith('http')) {
						try {
							// Определяем цвет в зависимости от возраста трека
							const trackDate = new Date(lap.date)
							const now = new Date()
							const hoursDiff = (now - trackDate) / (1000 * 60 * 60)

							let color = '#52c41a' // зеленый - свежий (< 24ч)
							let opacity = 0.8

							if (hoursDiff > 24 * 7) {
								// старше недели
								color = '#1890ff'
								opacity = 0.3
							} else if (hoursDiff > 24) {
								// старше суток
								color = '#faad14'
								opacity = 0.5
							}

							// Создаем GPX слой БЕЗ иконок маркеров
const gpxLayer = new L.GPX(lap.gpx_track_url, {
	async: true,
	polyline_options: {
		color: color,
		weight: 4,
		opacity: opacity,
		lineCap: 'round',
	},
	marker_options: null, // Полностью отключаем маркеры
})


							// Добавляем popup с информацией ИЗ БАЗЫ ДАННЫХ, а не из GPX
							gpxLayer.on('loaded', function (e) {
								// Форматируем время из seconds в MM:SS
								const minutes = Math.floor(lap.time_seconds / 60)
								const seconds = lap.time_seconds % 60
								const timeFormatted = `${minutes}:${seconds
									.toString()
									.padStart(2, '0')}`

								// Форматируем дату
								const dateFormatted = new Date(lap.date).toLocaleDateString(
									'ru-RU'
								)

								// Используем user_name из базы, а не из GPX
								const userName = lap.user_name || 'Аноним'

								gpxLayer.bindPopup(`
                  <div style="min-width: 200px">
                    <b>${userName}</b><br>
                    Время заезда: ${timeFormatted}<br>
                    Дата: ${dateFormatted}<br>
                    Лыжи: ${lap.ski_model || 'не указаны'}<br>
                    ${lap.comment ? `Комментарий: ${lap.comment}` : ''}
                    <hr style="margin: 5px 0">
                    <small><i>Дистанция из GPX: ${(
											e.target.get_distance() / 1000
										).toFixed(2)} км</i></small>
                  </div>
                `)
							})

							gpxLayer.addTo(map)
							layers.push(gpxLayer)
						} catch (gpxError) {
							console.error(`Ошибка загрузки GPX ${lap.id}:`, gpxError)
						}
					}
				})

				setGpxLayers(layers)
				setLoading(false)
			} catch (err) {
				console.error('Ошибка загрузки треков:', err)
				setError('Не удалось загрузить треки')
				setLoading(false)
			}
		}

		loadGpxTracks()

		// Очистка при размонтировании
		return () => {
			gpxLayers.forEach(layer => {
				if (layer && map.hasLayer(layer)) {
					map.removeLayer(layer)
				}
			})
		}
	}, [map])

	if (loading) {
		return (
			<div
				style={{
					position: 'absolute',
					top: '10px',
					right: '10px',
					zIndex: 1000,
					background: 'rgba(255,255,255,0.9)',
					padding: '10px',
					borderRadius: '4px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
				}}
			>
				<Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} />
				<span style={{ marginLeft: '8px' }}>Загрузка треков...</span>
			</div>
		)
	}

	if (error) {
		return (
			<div
				style={{
					position: 'absolute',
					top: '10px',
					right: '10px',
					zIndex: 1000,
				}}
			>
				<Alert message={error} type='error' showIcon />
			</div>
		)
	}

	return (
		<div
			style={{
				position: 'absolute',
				top: '10px',
				right: '10px',
				zIndex: 1000,
				background: 'rgba(255,255,255,0.9)',
				padding: '10px',
				borderRadius: '4px',
				boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
				fontSize: '12px',
			}}
		>
			Треков на карте: {gpxLayers.length}
		</div>
	)
}

export default GpxLayer
