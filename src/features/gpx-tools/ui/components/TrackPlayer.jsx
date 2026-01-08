import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
	Card,
	Slider,
	Button,
	Space,
	Typography,
	Row,
	Col,
	Statistic,
	Select,
	Progress,
	Tooltip,
} from 'antd'
import {
	PlayCircleOutlined,
	PauseCircleOutlined,
	ForwardOutlined,
	BackwardOutlined,
	LineChartOutlined,
	RocketOutlined,
} from '@ant-design/icons'
import L from 'leaflet'
import styles from './TrackPlayer.module.css'

const { Text } = Typography
const { Option } = Select

const TrackPlayer = ({
	trackPoints,
	startIndex = 0,
	endIndex = null,
	onTimeUpdate,
	mapInstance,
}) => {
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentPointIndex, setCurrentPointIndex] = useState(startIndex)
	const [playbackSpeed, setPlaybackSpeed] = useState(75)
	const [progress, setProgress] = useState(0)
	const [stats, setStats] = useState(null)
	const [currentSpeed, setCurrentSpeed] = useState('—')

	const playerIntervalRef = useRef(null)
	const markerRef = useRef(null)
	const startTimeRef = useRef(null)
	const lastSpeedRef = useRef('—')
	const [pauseTime, setPauseTime] = useState(0) // ← ДОБАВИМ
	const [accumulatedTime, setAccumulatedTime] = useState(0) // ← ДОБАВИМ
	const [maxSpeedPoint, setMaxSpeedPoint] = useState(null) // Точка с макс. скоростью

	const totalPoints = endIndex || trackPoints.length - 1
	const effectivePoints = trackPoints.slice(startIndex, totalPoints + 1)

	//useEffect расчета статистики с поиском точки максимальной скорости:
	useEffect(() => {
		if (effectivePoints.length < 2) return

		// Рассчитываем расстояния и скорости
		let totalDistance = 0
		const speeds = []
		let prevPoint = effectivePoints[0]
		let maxSpeed = 0
		let maxSpeedIndex = -1 // ← ДОБАВЛЯЕМ
		let maxSpeedPointData = null // ← ДОБАВЛЯЕМ

		for (let i = 1; i < effectivePoints.length; i++) {
			const currentPoint = effectivePoints[i]
			const distance = calculateDistance(
				prevPoint.lat,
				prevPoint.lng,
				currentPoint.lat,
				currentPoint.lng
			)
			totalDistance += distance

			// Расчет скорости если есть время
			if (prevPoint.timestamp && currentPoint.timestamp) {
				const timeDiff = (currentPoint.timestamp - prevPoint.timestamp) / 1000 // секунды
				if (timeDiff > 0) {
					const speed = (distance / timeDiff) * 3.6 // км/ч
					speeds.push(speed)

					// ← ДОБАВЛЯЕМ: запоминаем точку максимальной скорости
					if (speed > maxSpeed) {
						maxSpeed = speed
						maxSpeedIndex = i // Индекс текущей точки
						maxSpeedPointData = {
							point: currentPoint, // Точка, где закончился сегмент с макс. скоростью
							speed: speed.toFixed(1),
							index: i + startIndex, // Абсолютный индекс в треке
							distance: distance,
							timeDiff: timeDiff,
						}
					}
				}
			}

			prevPoint = currentPoint
		}

		// Сохраняем точку максимальной скорости
		if (maxSpeedPointData) {
			setMaxSpeedPoint(maxSpeedPointData)
		}

		// Расчет средней и максимальной скорости
		const avgSpeed =
			speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0

		setStats({
			totalDistance,
			avgSpeed: avgSpeed.toFixed(1),
			maxSpeed: maxSpeed.toFixed(1),
			points: effectivePoints.length,
		})
	}, [effectivePoints, startIndex])

	// Инициализация маркера
	useEffect(() => {
		if (!mapInstance || effectivePoints.length === 0) return

		// Удаляем старый маркер
		if (markerRef.current) {
			mapInstance.removeLayer(markerRef.current)
		}

		// ← ДОБАВЛЯЕМ: удаляем старую медальку
		if (window.maxSpeedMarker) {
			mapInstance.removeLayer(window.maxSpeedMarker)
			window.maxSpeedMarker = null
		}

		// Создаем новый маркер (зеленый кружок)
		const icon = L.divIcon({
			className: styles.playerMarker,
			html: `
			<div style="
				width: 16px;
				height: 16px;
				background: #52c41a;
				border-radius: 50%;
				border: 3px solid white;
				box-shadow: 0 0 8px rgba(0,0,0,0.5);
				animation: pulse 2s infinite;
			">
				<style>
					@keyframes pulse {
						0% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7); }
						70% { box-shadow: 0 0 0 10px rgba(82, 196, 26, 0); }
						100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0); }
					}
				</style>
			</div>
		`,
			iconSize: [22, 22],
			iconAnchor: [11, 11],
		})

		const currentPoint = effectivePoints[currentPointIndex - startIndex]
		if (currentPoint) {
			markerRef.current = L.marker([currentPoint.lat, currentPoint.lng], {
				icon,
			})
				.addTo(mapInstance)
				.bindPopup(`Точка ${currentPointIndex + 1}`)
		}

		// ← ДОБАВЛЯЕМ: создаем маркер максимальной скорости (медалька)
		if (maxSpeedPoint && maxSpeedPoint.point) {
			const medalIcon = L.divIcon({
				className: styles.medalMarker,
				html: `
    <div style="
      position: relative;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <!-- Золотая медалька -->
      <div style="
        width: 24px;
        height: 24px;
        background: radial-gradient(circle at 30% 30%, #FFD700, #FFA500);
        border-radius: 50%;
        border: 2px solid #FFF;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        position: relative;
        z-index: 2;
      ">
        🏆
      </div>
      <!-- Анимация пульсации -->
      <div style="
        position: absolute;
        top: -8px;
        left: -8px;
        width: 46px;
        height: 46px;
        border-radius: 50%;
        border: 2px solid #FFD700;
        animation: pulseMedal 2s infinite;
        z-index: 1;
      ">
        <style>
          @keyframes pulseMedal {
            0% { transform: scale(1); opacity: 1; }
            70% { transform: scale(1.4); opacity: 0; }
            100% { transform: scale(1.4); opacity: 0; }
          }
        </style>
      </div>
    </div>
  `,
				iconSize: [30, 30], // ← ФИКСИРОВАННЫЙ РАЗМЕР
				iconAnchor: [15, 15], // ← ЦЕНТРИРОВАНИЕ (15 = 30/2)
				popupAnchor: [0, -15], // ← POPUP ПОЯВЛЯЕТСЯ НАД МАРКЕРОМ
			})

			window.maxSpeedMarker = L.marker(
				[maxSpeedPoint.point.lat, maxSpeedPoint.point.lng],
				{
					icon: medalIcon,
					zIndexOffset: 1000,
				}
			).addTo(mapInstance).bindPopup(`
    <div style="font-size: 12px; text-align: center; min-width: 120px;">
      <strong>🏆 Максимальная скорость</strong><br>
      ${maxSpeedPoint.speed} км/ч<br>
      Точка: ${maxSpeedPoint.index + 1}
    </div>
  `)
		}

		return () => {
			if (markerRef.current && mapInstance) {
				mapInstance.removeLayer(markerRef.current)
			}
			// ← ДОБАВЛЯЕМ: очищаем медальку при размонтировании
			if (window.maxSpeedMarker && mapInstance) {
				mapInstance.removeLayer(window.maxSpeedMarker)
				window.maxSpeedMarker = null
			}
		}
	}, [
		mapInstance,
		currentPointIndex,
		effectivePoints,
		startIndex,
		maxSpeedPoint,
	])

	const calculateDistance = (lat1, lon1, lat2, lon2) => {
		const R = 6371000
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

	const startPlayback = () => {
		if (isPlaying) return

		setIsPlaying(true)

		// Рассчитываем время, которое должно было пройти для достижения текущей точки
		const pointsFromStart = currentPointIndex - startIndex
		const timeForCurrentPoint = (pointsFromStart / playbackSpeed) * 1000

		startTimeRef.current = Date.now() - timeForCurrentPoint
		speedBufferRef.current = [] // Сбрасываем буфер скоростей

		playerIntervalRef.current = setInterval(() => {
			const elapsed = Date.now() - startTimeRef.current
			const pointsPerSecond = playbackSpeed
			const pointsToAdvance = Math.floor((elapsed * pointsPerSecond) / 1000)

			let newIndex = startIndex + pointsToAdvance
			if (newIndex > totalPoints) {
				newIndex = totalPoints
				stopPlayback()
			}

			setCurrentPointIndex(newIndex)
			const newProgress =
				((newIndex - startIndex) / (totalPoints - startIndex)) * 100
			setProgress(newProgress)

			if (markerRef.current && effectivePoints[newIndex - startIndex]) {
				const point = effectivePoints[newIndex - startIndex]
				markerRef.current.setLatLng([point.lat, point.lng])

				// Получаем сглаженную скорость
				const rawSpeed = calculateCurrentSpeed(newIndex)

				if (rawSpeed !== '—' && rawSpeed !== '0.0') {
					// Добавляем в буфер
					const speedValue = parseFloat(rawSpeed)
					if (!isNaN(speedValue)) {
						speedBufferRef.current.push(speedValue)

						// Держим буфер ограниченного размера
						if (speedBufferRef.current.length > BUFFER_SIZE) {
							speedBufferRef.current.shift()
						}

						// Рассчитываем среднее
						const avgSpeed =
							speedBufferRef.current.length > 0
								? (
										speedBufferRef.current.reduce((a, b) => a + b, 0) /
										speedBufferRef.current.length
								  ).toFixed(1)
								: rawSpeed

						setCurrentSpeed(avgSpeed)
					} else {
						setCurrentSpeed(rawSpeed)
					}
				} else {
					setCurrentSpeed(rawSpeed)
				}
			}

			onTimeUpdate?.(newIndex)
		}, 100)
	}

	const stopPlayback = () => {
		setIsPlaying(false)

		if (playerIntervalRef.current) {
			clearInterval(playerIntervalRef.current)
			playerIntervalRef.current = null
			startTimeRef.current = null // ← СБРАСЫВАЕМ ВРЕМЯ НАЧАЛА
		}
	}

	const calculateCurrentSpeed = useCallback(
		pointIndex => {
			if (
				pointIndex <= startIndex ||
				pointIndex >= effectivePoints.length + startIndex - 1
			) {
				return '0.0'
			}

			// 1. ИСПОЛЬЗУЕМ СРЕДНЮЮ СКОРОСТЬ НА ПРОМЕЖУТКЕ (5 точек вперед)
			const lookbackPoints = 3 // Берем несколько предыдущих точек
			const lookforwardPoints = 2 // И несколько следующих

			let totalDistance = 0
			let totalTime = 0
			let validPoints = 0

			// Проверяем, что у нас достаточно точек для анализа
			const minIndex = Math.max(startIndex, pointIndex - lookbackPoints)
			const maxIndex = Math.min(totalPoints, pointIndex + lookforwardPoints)

			if (maxIndex - minIndex < 2) {
				return calculateInstantSpeed(pointIndex) // Если мало точек, используем мгновенную
			}

			// 2. Считаем общее расстояние и время на промежутке
			for (let i = minIndex; i < maxIndex; i++) {
				const currentIdx = i
				const nextIdx = i + 1

				if (
					currentIdx < startIndex ||
					nextIdx > maxIndex ||
					currentIdx >= effectivePoints.length + startIndex - 1
				) {
					continue
				}

				const prevPoint = effectivePoints[currentIdx - startIndex]
				const currentPoint = effectivePoints[nextIdx - startIndex]

				if (!prevPoint || !currentPoint) continue

				// Получаем время точек
				let prevTime =
					prevPoint.timestamp ||
					(prevPoint.time ? new Date(prevPoint.time).getTime() : null)
				let currTime =
					currentPoint.timestamp ||
					(currentPoint.time ? new Date(currentPoint.time).getTime() : null)

				if (!prevTime || !currTime || prevTime === currTime) continue

				// Рассчитываем расстояние
				const distance = calculateDistance(
					prevPoint.lat,
					prevPoint.lng,
					currentPoint.lat,
					currentPoint.lng
				)

				const timeDiff = (currTime - prevTime) / 1000 // секунды

				if (timeDiff <= 0) continue

				totalDistance += distance
				totalTime += timeDiff
				validPoints++
			}

			// 3. Если удалось посчитать, возвращаем среднюю скорость
			if (validPoints > 0 && totalTime > 0) {
				return ((totalDistance / totalTime) * 3.6).toFixed(1) // км/ч
			}

			// 4. Если не удалось, используем мгновенную скорость
			return calculateInstantSpeed(pointIndex)
		},
		[effectivePoints, startIndex]
	)

	// Добавляем вспомогательную функцию для мгновенной скорости
	const calculateInstantSpeed = useCallback(
		pointIndex => {
			if (
				pointIndex <= startIndex ||
				pointIndex >= effectivePoints.length + startIndex - 1
			) {
				return '0.0'
			}

			const prevPoint = effectivePoints[pointIndex - 1 - startIndex]
			const currentPoint = effectivePoints[pointIndex - startIndex]

			if (!prevPoint || !currentPoint) return '—'

			let prevTime =
				prevPoint.timestamp ||
				(prevPoint.time ? new Date(prevPoint.time).getTime() : null)
			let currTime =
				currentPoint.timestamp ||
				(currentPoint.time ? new Date(currentPoint.time).getTime() : null)

			if (!prevTime || !currTime || prevTime === currTime) return '—'

			const distance = calculateDistance(
				prevPoint.lat,
				prevPoint.lng,
				currentPoint.lat,
				currentPoint.lng
			)
			const timeDiff = (currTime - prevTime) / 1000

			if (timeDiff <= 0) return '—'

			return ((distance / timeDiff) * 3.6).toFixed(1)
		},
		[effectivePoints, startIndex]
	)

	// Добавляем useRef для хранения последних скоростей (скользящее среднее)
	const speedBufferRef = useRef([])
	const BUFFER_SIZE = 5 // Размер буфера для сглаживания

	const handleSpeedChange = value => {
		setPlaybackSpeed(value)
		// setAccumulatedTime(0) ← УДАЛИТЬ

		if (isPlaying) {
			stopPlayback()
			setTimeout(() => startPlayback(), 10)
		}
	}

	const handleSeek = value => {
		const newIndex =
			Math.floor((value / 100) * (totalPoints - startIndex)) + startIndex
		setCurrentPointIndex(newIndex)
		setProgress(value)

		if (markerRef.current && effectivePoints[newIndex - startIndex]) {
			const point = effectivePoints[newIndex - startIndex]
			markerRef.current.setLatLng([point.lat, point.lng])
			const speed = calculateCurrentSpeed(newIndex)
			setCurrentSpeed(speed)
		}

		if (isPlaying) {
			stopPlayback()
			setTimeout(() => startPlayback(), 10)
		}
	}

	const handleStepForward = () => {
		const stepSize = Math.max(1, Math.floor(playbackSpeed / 10))
		const newIndex = Math.min(currentPointIndex + stepSize, totalPoints)
		setCurrentPointIndex(newIndex)
		setProgress(((newIndex - startIndex) / (totalPoints - startIndex)) * 100)

		const speed = calculateCurrentSpeed(newIndex)
		setCurrentSpeed(speed)

		// Если проигрывание было активно, перезапускаем с новой позиции
		if (isPlaying) {
			stopPlayback()
			setTimeout(() => startPlayback(), 10)
		}
	}

	const handleStepBackward = () => {
		const stepSize = Math.max(1, Math.floor(playbackSpeed / 10))
		const newIndex = Math.max(currentPointIndex - stepSize, startIndex)
		setCurrentPointIndex(newIndex)
		setProgress(((newIndex - startIndex) / (totalPoints - startIndex)) * 100)

		const speed = calculateCurrentSpeed(newIndex)
		setCurrentSpeed(speed)

		// Если проигрывание было активно, перезапускаем с новой позиции
		if (isPlaying) {
			stopPlayback()
			setTimeout(() => startPlayback(), 10)
		}
	}

	// useEffect очистки:
	useEffect(() => {
		return () => {
			if (playerIntervalRef.current) {
				clearInterval(playerIntervalRef.current)
			}
			if (markerRef.current && mapInstance) {
				mapInstance.removeLayer(markerRef.current)
			}
			// ← ДОБАВЛЯЕМ: очищаем глобальную медальку
			if (window.maxSpeedMarker && mapInstance) {
				mapInstance.removeLayer(window.maxSpeedMarker)
				window.maxSpeedMarker = null
			}
		}
	}, [mapInstance])

	return (
		<Card size='small' className={styles.container}>
			{/* ПЕРВАЯ СТРОКА: Управление и скорость */}
			<div className={styles.firstRow}>
				<Space size='middle' className={styles.controlsGroup}>
					<Button
						size='small'
						icon={<BackwardOutlined />}
						onClick={handleStepBackward}
						disabled={currentPointIndex <= startIndex}
					/>

					<Button
						size='small'
						type={isPlaying ? 'default' : 'primary'}
						icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
						onClick={isPlaying ? stopPlayback : startPlayback}
					/>

					<Button
						size='small'
						icon={<ForwardOutlined />}
						onClick={handleStepForward}
						disabled={currentPointIndex >= totalPoints}
					/>

					<Tooltip title='Скорость воспроизведения'>
						<Select
							value={playbackSpeed}
							onChange={handleSpeedChange}
							size='small'
							style={{ width: 90 }}
							dropdownMatchSelectWidth={false}
						>
							<Option value={1}>1x</Option>
							<Option value={50}>50x</Option>
							<Option value={75}>75x</Option>
							<Option value={100}>100x</Option>
						</Select>
					</Tooltip>
				</Space>

				<Space size='middle' className={styles.statsGroup}>
					<Tooltip title='Текущая скорость'>
						<div className={styles.speedDisplay}>
							<LineChartOutlined style={{ color: '#52c41a', marginRight: 4 }} />
							<Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
								{currentSpeed} км/ч
							</Text>
						</div>
					</Tooltip>
				</Space>
			</div>

			{/* ВТОРАЯ СТРОКА: Прогресс-бар */}
			<div className={styles.secondRow}>
				<Slider
					value={progress}
					onChange={handleSeek}
					tooltip={{ formatter: value => `${value.toFixed(0)}%` }}
					className={styles.progressSlider}
				/>
			</div>

			{/* ТРЕТЬЯ СТРОКА: Статистика (только если есть место) */}
			{stats && (
				<div className={styles.thirdRow}>
					<Row gutter={[8, 8]} justify='space-between'>
						<Col>
							<Statistic
								title='Дистанция'
								value={(stats.totalDistance / 1000).toFixed(2)}
								suffix='км'
								size='small'
								valueStyle={{ fontSize: '12px' }}
							/>
						</Col>
						<Col>
							<Statistic
								title='Средняя'
								value={stats.avgSpeed}
								suffix='км/ч'
								size='small'
								valueStyle={{ fontSize: '12px' }}
							/>
						</Col>
						<Col>
							<Statistic
								title='Макс.'
								value={stats.maxSpeed}
								suffix='км/ч'
								size='small'
								valueStyle={{ fontSize: '12px' }}
							/>
						</Col>
					</Row>
				</div>
			)}
		</Card>
	)
}

export default TrackPlayer
