// (Сравнение треков)
// Назначение: Визуальное сравнение двух GPX треков

// Функции: Отображение двух треков на карте, расчет отставаний, анимация воспроизведения

// Особенности: Двухцветное отображение, статистика сравнения

import React, { useState, useEffect, useRef } from 'react'
import L from 'leaflet' // ← ДОБАВЬТЕ ИМПОРТ L
import 'leaflet/dist/leaflet.css' // ← ДОБАВЬТЕ
import 'leaflet-gpx' // ← ДОБАВЬТЕ
import {
	Card,
	Alert,
	Typography,
	Row,
	Col,
	Statistic,
	Button,
	Tabs,
	Spin,
	Empty,
} from 'antd'
import {
	PlayCircleOutlined,
	PauseCircleOutlined,
	BarChartOutlined,
	AreaChartOutlined,
	LineChartOutlined,
} from '@ant-design/icons'
import styles from './GpxComparator.module.css'
import { calculateLag, findKeySegments } from '../utils/gpxCalculations'
import useGpxLoader from '../hooks/useGpxLoader'

const { Text } = Typography
const { TabPane } = Tabs

export default function GpxComparator({ tracks = [], user }) {

	// useRef хуки
	const playerIntervalRef = useRef(null)
	const mapRef = useRef(null)
	const mapInstanceRef = useRef(null)
	const gpx1Ref = useRef(null)
	const gpx2Ref = useRef(null)

	// useState хуки
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentPointIndex, setCurrentPointIndex] = useState(0)
	const [lags, setLags] = useState([])
	const [keySegments, setKeySegments] = useState([])

	// Инициализация карты (useEffect должен быть внутри компонента)
	useEffect(() => {
		if (!mapRef.current || mapInstanceRef.current) return

		console.log('🗺️ Инициализирую карту в GpxComparator')

		const map = L.map(mapRef.current).setView([52.416925, 103.738906], 15)

		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap',
			maxZoom: 19,
		}).addTo(map)

		mapInstanceRef.current = map

		return () => {
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove()
				mapInstanceRef.current = null
			}
		}
	}, [])

	// Проверка на 2 трека
	if (tracks.length !== 2) {
		return (
			<Card className={styles.container}>
				<Alert
					message='Необходимо выбрать 2 трека для сравнения'
					description="Вернитесь на вкладку 'Мои треки' и выберите два трека"
					type='warning'
					showIcon
				/>
			</Card>
		)
	}

	// Получаем первый и второй треки
	const track1 = tracks[0]
	const track2 = tracks[1]

	// === ОТЛАДКА ===
	console.log('=== GpxComparator Debug ===')
	console.log('Tracks array:', tracks)
	console.log('Track 1 object:', track1)
	console.log('Track 2 object:', track2)
	console.log('Track 1 filename:', track1?.filename)
	console.log('Track 2 filename:', track2?.filename)
	console.log('Track 1 URL from prop:', track1?.url)
	console.log('Track 2 URL from prop:', track2?.url)
	// === КОНЕЦ ОТЛАДКИ ===

	// Функция для получения URL трека
	const getTrackUrl = track => {
		if (!track || !track.filename) return null
		return `https://xsqelqxwthjufdwfdecf.supabase.co/storage/v1/object/public/gpx-tracks/${track.filename}`
	}

	// Используем хук для загрузки точек
  useEffect(() => {
		if (tracks.length >= 2) {
			const loadTracks = async () => {
				const url1 = getTrackUrl(tracks[0])
				const url2 = getTrackUrl(tracks[1])

				if (url1) {
					setLoading1(true)
					try {
						// Используем loadGpx напрямую
						const loader1 = new GpxLoader() // или ваш метод загрузки
						const result1 = await loader1.load(url1)
						setTrack1Points(result1.points)
						setStats1(result1.stats)
					} catch (err) {
						setError1(err.message)
					} finally {
						setLoading1(false)
					}
				}

				if (url2) {
					setLoading2(true)
					try {
						// Аналогично для второго трека
						const loader2 = new GpxLoader()
						const result2 = await loader2.load(url2)
						setTrack2Points(result2.points)
						setStats2(result2.stats)
					} catch (err) {
						setError2(err.message)
					} finally {
						setLoading2(false)
					}
				}
			}
			loadTracks()
		}
	}, [tracks])

	const loading = loading1 || loading2

	// 🔥 ИЛИ проще: создайте кастомный хук который безопасно обрабатывает отсутствие URL
	// Например:
	const useSafeGpxLoader = url => {
		const [points, setPoints] = useState([])
		const [loading, setLoading] = useState(false)
		const [error, setError] = useState(null)
		const [stats, setStats] = useState(null)

		useEffect(() => {
			if (!url) {
				setPoints([])
				setStats(null)
				return
			}

			// Ваша логика загрузки...
		}, [url])

		return { points, loading, error, stats }
	}



	// Загрузка треков на карту (этот useEffect тоже должен быть внутри компонента)
	useEffect(() => {
		if (!mapInstanceRef.current || !track1 || !track2) return

		console.log('📥 Загружаю треки на карту:', track1.url, track2.url)

		// Очистка старых слоев
		if (gpx1Ref.current) mapInstanceRef.current.removeLayer(gpx1Ref.current)
		if (gpx2Ref.current) mapInstanceRef.current.removeLayer(gpx2Ref.current)

		// Загрузка трека 1
		gpx1Ref.current = new L.GPX(track1.url, {
			async: true,
			polyline_options: { color: '#1890ff', weight: 3, opacity: 0.8 },
			marker_options: null,
		})

		gpx1Ref.current.on('loaded', e => {
			console.log('✅ Трек 1 загружен')
		})

		gpx1Ref.current.on('error', e => {
			console.error('❌ Ошибка трека 1:', e.error)
		})

		gpx1Ref.current.addTo(mapInstanceRef.current)

		// Загрузка трека 2
		gpx2Ref.current = new L.GPX(track2.url, {
			async: true,
			polyline_options: { color: '#f5222d', weight: 3, opacity: 0.8 },
			marker_options: null,
		})

		gpx2Ref.current.on('loaded', e => {
			console.log('✅ Трек 2 загружен')
			// Когда оба загружены, центрируем карту
			if (gpx1Ref.current) {
				const bounds1 = gpx1Ref.current.getBounds()
				const bounds2 = e.target.getBounds()
				const bounds = bounds1.extend(bounds2)
				mapInstanceRef.current.fitBounds(bounds.pad(0.1))
			}
		})

		gpx2Ref.current.on('error', e => {
			console.error('❌ Ошибка трека 2:', e.error)
		})

		gpx2Ref.current.addTo(mapInstanceRef.current)
	}, [track1, track2])

	// Расчет отставания при изменении треков
	useEffect(() => {
		if (track1Points.length > 0 && track2Points.length > 0) {
			const calculatedLags = calculateLag(track1Points, track2Points)
			setLags(calculatedLags)

			const segments = findKeySegments(calculatedLags)
			setKeySegments(segments)
		}
	}, [track1Points, track2Points])

	// Управление воспроизведением
	const handlePlayPause = () => {
		if (isPlaying) {
			// Останавливаем анимацию
			setIsPlaying(false)
			if (playerIntervalRef.current) {
				clearInterval(playerIntervalRef.current)
				playerIntervalRef.current = null
			}
		} else {
			// Запускаем анимацию
			setIsPlaying(true)
			const maxPoints = Math.min(track1Points.length, track2Points.length)

			playerIntervalRef.current = setInterval(() => {
				setCurrentPointIndex(prev => {
					const next = prev + 1
					if (next >= maxPoints) {
						// Достигли конца - останавливаем
						setIsPlaying(false)
						if (playerIntervalRef.current) {
							clearInterval(playerIntervalRef.current)
							playerIntervalRef.current = null
						}
						return prev
					}
					return next
				})
			}, 100) // 10 точек в секунду
		}
	}

	// Очистка интервала при размонтировании
	useEffect(() => {
		return () => {
			if (playerIntervalRef.current) {
				clearInterval(playerIntervalRef.current)
			}
		}
	}, [])

	// Получение статистики для отображения
	const getComparisonStats = () => {
		if (lags.length === 0) return null

		const maxDistanceLag = Math.max(...lags.map(lag => lag.distance))
		const maxTimeLag = Math.max(...lags.map(lag => lag.time))
		const avgDistanceLag =
			lags.reduce((sum, lag) => sum + lag.distance, 0) / lags.length
		const avgTimeLag =
			lags.reduce((sum, lag) => sum + lag.time, 0) / lags.length

		return {
			maxDistanceLag: maxDistanceLag.toFixed(1),
			maxTimeLag: maxTimeLag.toFixed(1),
			avgDistanceLag: avgDistanceLag.toFixed(1),
			avgTimeLag: avgTimeLag.toFixed(1),
		}
	}

	const stats = getComparisonStats()

	return (
		<Card className={styles.container}>
			{/* Карта */}
			<div className={styles.mapSection}>
				<Card size='small' title='Карта сравнения'>
					<div
						ref={mapRef}
						style={{
							width: '100%',
							height: '400px',
							borderRadius: '8px',
							overflow: 'hidden',
							border: '1px solid #f0f0f0',
						}}
					/>
					<div
						style={{
							padding: '8px',
							background: '#fafafa',
							borderTop: '1px solid #f0f0f0',
							fontSize: '12px',
							color: '#666',
						}}
					>
						Синий: {track1?.filename} • Красный: {track2?.filename}
					</div>
				</Card>
			</div>

			{/* Информация о треках */}
			<div className={styles.trackInfoHeader}>
				<Row gutter={[16, 16]}>
					<Col span={12}>
						<Card size='small'>
							<Text strong>Трек 1</Text>
							<div className={styles.trackName}>{track1?.filename}</div>
							<Text type='secondary'>
								{track1?.time
									? `${Math.floor(track1.time / 60)}:${(track1.time % 60)
											.toString()
											.padStart(2, '0')}`
									: ''}
							</Text>
						</Card>
					</Col>
					<Col span={12}>
						<Card size='small'>
							<Text strong>Трек 2</Text>
							<div className={styles.trackName}>{track2?.filename}</div>
							<Text type='secondary'>
								{track2?.time
									? `${Math.floor(track2.time / 60)}:${(track2.time % 60)
											.toString()
											.padStart(2, '0')}`
									: ''}
							</Text>
						</Card>
					</Col>
				</Row>
			</div>

			{/* Остальной код остается... */}
		</Card>
	)
}
