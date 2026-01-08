import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
	Alert,
	Typography,
	Slider,
	Button,
	Space,
	Row,
	Col,
	Statistic,
	message,
	Spin,
	Card,
} from 'antd'
import { ScissorOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons'
import TrackVisualizer from './components/TrackVisualizer'
import styles from './GpxEditor.module.css'
import SaveTrackModal from './components/SaveTrackModal'
import supabase from '../../../supabase'
import TrackPlayer from './components/TrackPlayer'

const { Text } = Typography

export default function GpxEditor({ track, onTrackUpdated, user }) {
	const [loading, setLoading] = useState(false)
	const [trackPoints, setTrackPoints] = useState([])
	const [trimStart, setTrimStart] = useState(0)
	const [trimEnd, setTrimEnd] = useState(0)
	const [trimmedStats, setTrimmedStats] = useState(null)
	const [hasLoaded, setHasLoaded] = useState(false)
	const [saveModalVisible, setSaveModalVisible] = useState(false)
	const [saving, setSaving] = useState(false)
	const [mapInstance, setMapInstance] = useState(null)

	useEffect(() => {
		if (!track) {
			setLoading(false)
			setHasLoaded(false)
			setMapInstance(null)
			return
		}

		setTrackPoints([])
		setTrimmedStats(null)
		setTrimStart(0)
		setTrimEnd(0)
		setHasLoaded(false)
	}, [track])

	const handleSaveTrack = async saveData => {
		console.log('Сохранение трека с данными:', saveData)

		if (!track || !trackPoints.length || !user || !trimmedStats) {
			message.warning('Нет данных для сохранения')
			return
		}

		try {
			setSaving(true)

			// 1. Подготавливаем обрезанные точки
			const trimmedPoints = trackPoints.slice(trimStart, trimEnd + 1)

			// 2. Создаем GPX файл
			const gpxContent = createGPXFromPoints(
				trimmedPoints,
				track,
				saveData.description
			)

			// 3. Подготавливаем имя файла
			let filename = saveData.filename || ''

			// Если имя пустое - генерируем автоматически
			if (!filename || filename.trim() === '') {
				const baseName = track.filename || 'track'
				const nameWithoutExt = baseName.replace(/\.gpx$/i, '')
				filename = `${nameWithoutExt}_edited_${Date.now()}.gpx`
			}

			// Убеждаемся, что есть расширение .gpx
			if (!filename.toLowerCase().endsWith('.gpx')) {
				filename = filename + '.gpx'
			}

			// Для перезаписи используем оригинальное имя
			if (saveData.saveOption === 'overwrite') {
				filename = track.filename || filename
			}

			const filePath = `${Date.now()}_${user.id}_${filename}`

			console.log('Сохраняем файл:', {
				filePath,
				filename,
				saveOption: saveData.saveOption,
			})

			// 4. Загружаем файл в Supabase Storage
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('gpx-tracks')
				.upload(filePath, gpxContent, {
					contentType: 'application/gpx+xml',
				})

			if (uploadError) throw uploadError

			// 5. Получаем публичный URL
			const { data: urlData } = supabase.storage
				.from('gpx-tracks')
				.getPublicUrl(filePath)

			const newTimeSeconds = Math.floor(trimmedStats.duration)

			// 6. Сохраняем в базу данных
			if (saveData.saveOption === 'overwrite') {
				// Перезапись существующего трека
				const { error: updateError } = await supabase
					.from('lap_times')
					.update({
						time_seconds: newTimeSeconds,
						gpx_track_url: urlData.publicUrl,
						updated_at: new Date().toISOString(),
						comment: saveData.description || track.comment || '',
					})
					.eq('id', track.id)

				if (updateError) throw updateError
				message.success('Трек успешно обновлен!')
			} else {
				// Создание нового трека - БЕЗ ПОЛЯ filename
				const insertData = {
					user_id: user.id,
					time_seconds: newTimeSeconds,
					gpx_track_url: urlData.publicUrl,
					date: new Date().toISOString(),
					comment: saveData.description || '',
				}

				// Добавляем ski_model только если он есть
				if (track.skiModel) {
					insertData.ski_model = track.skiModel
				}

				// Вставляем в базу
				const { error: insertError } = await supabase
					.from('lap_times')
					.insert(insertData)

				if (insertError) throw insertError
				message.success('Новый трек успешно сохранен!')
			}

			setSaveModalVisible(false)
			onTrackUpdated?.()
		} catch (error) {
			console.error('Ошибка сохранения:', error)
			message.error(`Ошибка при сохранении трека: ${error.message}`)
		} finally {
			setSaving(false)
		}
	}

	const createGPXFromPoints = (points, originalTrack, description = '') => {
		const now = new Date().toISOString()

		let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="Ski Leaderboard" version="1.0" xmlns="http://www.topografix.com/GPX/1/0">
	<metadata>
		<time>${now}</time>
		<name>${originalTrack.name || 'Edited Track'}</name>
		${description ? `<desc>${description}</desc>` : ''}
	</metadata>
	<trk>
		<name>${originalTrack.name || 'Edited Track'}</name>
		${description ? `<desc>${description}</desc>` : ''}
		<trkseg>`

		points.forEach((point, index) => {
			gpx += `
			<trkpt lat="${point.lat.toFixed(6)}" lon="${point.lng.toFixed(6)}">
				${point.elevation ? `<ele>${point.elevation.toFixed(1)}</ele>` : ''}
				${point.time ? `<time>${point.time}</time>` : ''}
			</trkpt>`
		})

		gpx += `
		</trkseg>
	</trk>
</gpx>`

		return gpx
	}

	const handleTrackLoaded = useCallback(
		(track, stats, points, gpxData) => {
			if (hasLoaded) return

			const extensionTime = gpxData?.totalTime
			const hasTimestamps = points.some(p => p.timestamp)

			let duration = 0
			if (extensionTime && extensionTime > 0) {
				duration = extensionTime
			} else if (
				hasTimestamps &&
				points[0].timestamp &&
				points[points.length - 1].timestamp
			) {
				duration =
					(points[points.length - 1].timestamp - points[0].timestamp) / 1000
			} else {
				duration = track.get_total_time ? track.get_total_time() : 0
			}

			setTrackPoints(points)

			if (points.length > 0) {
				setTrimStart(0)
				setTrimEnd(points.length - 1)
				calculateTrimmedStats(points, 0, points.length - 1)
			}

			setHasLoaded(true)
			setLoading(false)
		},
		[hasLoaded]
	)

	const calculateTrimmedStats = useCallback((points, start, end) => {
		if (!points || points.length === 0 || start >= end) {
			setTrimmedStats(null)
			return
		}

		const trimmedPoints = points.slice(start, end + 1)

		let distance = 0
		let elevationGain = 0
		let prevPoint = trimmedPoints[0]

		for (let i = 1; i < trimmedPoints.length; i++) {
			const currentPoint = trimmedPoints[i]
			const segmentDistance = calculateDistance(
				prevPoint.lat,
				prevPoint.lng,
				currentPoint.lat,
				currentPoint.lng
			)
			distance += segmentDistance

			if (currentPoint.elevation && prevPoint.elevation) {
				const elevationDiff = currentPoint.elevation - prevPoint.elevation
				if (elevationDiff > 0) {
					elevationGain += elevationDiff
				}
			}

			prevPoint = currentPoint
		}

		let duration = 0
		if (
			trimmedPoints[0].timestamp &&
			trimmedPoints[trimmedPoints.length - 1].timestamp
		) {
			const startTime = trimmedPoints[0].timestamp
			const endTime = trimmedPoints[trimmedPoints.length - 1].timestamp
			duration = (endTime - startTime) / 1000
		}

		const stats = {
			points: trimmedPoints.length,
			percentage: ((trimmedPoints.length / points.length) * 100).toFixed(1),
			startIndex: start,
			endIndex: end,
			distance: distance,
			duration: duration,
			elevationGain: elevationGain,
		}

		setTrimmedStats(stats)
	}, [])

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
		return R * c
	}

	const formatTime = seconds => {
		if (!seconds || seconds < 0) return '—'

		const hours = Math.floor(seconds / 3600)
		const minutes = Math.floor((seconds % 3600) / 60)
		const secs = Math.floor(seconds % 60)

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
				.toString()
				.padStart(2, '0')}`
		}
		return `${minutes}:${secs.toString().padStart(2, '0')}`
	}

	// Один слайдер с двумя ползунками
	const handleRangeChange = useCallback(
		value => {
			const [start, end] = value
			const newStart = Math.min(start, trackPoints.length - 2)
			const newEnd = Math.max(end, 1)

			if (newStart >= newEnd) {
				// Если ползунки пересеклись, корректируем
				const middle = Math.floor((newStart + newEnd) / 2)
				const adjustedStart = Math.max(0, middle - 1)
				const adjustedEnd = Math.min(trackPoints.length - 1, middle + 1)

				setTrimStart(adjustedStart)
				setTrimEnd(adjustedEnd)
				setTimeout(() => {
					calculateTrimmedStats(trackPoints, adjustedStart, adjustedEnd)
				}, 0)
			} else {
				setTrimStart(newStart)
				setTrimEnd(newEnd)
				setTimeout(() => {
					calculateTrimmedStats(trackPoints, newStart, newEnd)
				}, 0)
			}
		},
		[trackPoints, calculateTrimmedStats]
	)

	const handleReset = () => {
		if (!trackPoints.length) return
		setTrimStart(0)
		setTrimEnd(trackPoints.length - 1)
		calculateTrimmedStats(trackPoints, 0, trackPoints.length - 1)
	}

	const handleSaveTrimmed = () => {
		setSaveModalVisible(true)
	}

	const handleMapReady = useCallback(mapInst => {
		setMapInstance(mapInst)
	}, [])

	if (!track) {
		return (
			<Alert
				message='Трек не выбран'
				description="Выберите трек из списка 'Мои треки' для редактирования"
				type='info'
				showIcon
				className={styles.alert}
			/>
		)
	}

	return (
		<div className={styles.container}>
			{/* Карта */}
			<div className={styles.mapSection}>
				<TrackVisualizer
					gpxUrl={track.url}
					onTrackLoaded={handleTrackLoaded}
					onMapReady={handleMapReady}
					startMarker={trimStart}
					endMarker={trimEnd}
					trimmedSegment={
						trackPoints.length > 0 ? { start: trimStart, end: trimEnd } : null
					}
				/>
			</div>

			{loading && !hasLoaded ? (
				<div className={styles.loadingContainer}>
					<Spin size='large' />
					<div className={styles.loadingText}>Загрузка трека...</div>
				</div>
			) : trackPoints.length > 0 ? (
				<>
					{/* Один слайдер с двумя ползунками */}
					<div className={styles.rangeSliderSection}>
						<Text
							strong
							style={{ fontSize: '12px', marginBottom: 8, display: 'block' }}
						>
							Выбор участка:
						</Text>
						<Slider
							range
							min={0}
							max={trackPoints.length - 1}
							value={[trimStart, trimEnd]}
							onChange={handleRangeChange}
							tooltip={{
								formatter: value => `Точка ${value + 1}`,
							}}
							className={styles.rangeSlider}
							trackStyle={[
								{ backgroundColor: '#d9d9d9' }, // До начала
								{ backgroundColor: '#52c41a' }, // Между ползунками (зеленый)
								{ backgroundColor: '#d9d9d9' }, // После конца
							]}
							handleStyle={[
								{
									borderColor: '#52c41a',
									backgroundColor: '#52c41a',
								},
								{
									borderColor: '#f5222d',
									backgroundColor: '#f5222d',
								},
							]}
							railStyle={{ backgroundColor: '#d9d9d9' }}
						/>
					</div>

					{/* Плеер под картой */}
					{mapInstance && trackPoints.length > 0 && (
						<div className={styles.playerSection}>
							<TrackPlayer
								trackPoints={trackPoints}
								startIndex={trimStart}
								endIndex={trimEnd}
								mapInstance={mapInstance}
								className={styles.fullWidthPlayer} // ← ДОБАВЛЯЕМ
							/>
						</div>
					)}

					{/* Статистика */}
					{trimmedStats && (
						<Card size='small' className={styles.statsCard}>
							<Row gutter={[16, 8]} align='middle' className={styles.statsRow}>
								<Col flex={1}>
									<Row gutter={[16, 8]} justify='space-between'>
										<Col>
											<Statistic
												title='Точек'
												value={trimmedStats.points}
												suffix={`(${trimmedStats.percentage}%)`}
												size='small'
												className={styles.compactStat}
											/>
										</Col>
										<Col>
											<Statistic
												title='Дистанция'
												value={(trimmedStats.distance / 1000).toFixed(2)}
												suffix='км'
												size='small'
												className={styles.compactStat}
											/>
										</Col>
										<Col>
											<Statistic
												title='Время'
												value={formatTime(trimmedStats.duration)}
												size='small'
												className={styles.compactStat}
											/>
										</Col>
										<Col>
											<Statistic
												title='Набор высоты'
												value={
													trimmedStats.elevationGain
														? trimmedStats.elevationGain.toFixed(0)
														: '—'
												}
												suffix='м'
												size='small'
												className={styles.compactStat}
											/>
										</Col>
									</Row>
								</Col>
								<Col style={{ flex: '0 0 auto' }}>
									<Space>
										<Button
											size='small'
											icon={<UndoOutlined />}
											onClick={handleReset}
											disabled={
												trimStart === 0 && trimEnd === trackPoints.length - 1
											}
										>
											Сброс
										</Button>
										<Button
											size='small'
											type='primary'
											icon={<SaveOutlined />}
											onClick={handleSaveTrimmed}
											loading={loading}
										>
											Сохранить
										</Button>
									</Space>
								</Col>
							</Row>
						</Card>
					)}
				</>
			) : null}

			<SaveTrackModal
				visible={saveModalVisible}
				onCancel={() => setSaveModalVisible(false)}
				onSave={handleSaveTrack}
				originalFilename={track.filename}
				loading={saving}
			/>
		</div>
	)
}
