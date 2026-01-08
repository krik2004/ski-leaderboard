import React, { useState, useEffect, useRef } from 'react'
import {
	Card,
	Alert,
	Typography,
	Select,
	Row,
	Col,
	Statistic,
	Button,
	Space,
	Tabs,
	Spin,
	Empty,
} from 'antd'
import {
	SwapOutlined,
	PlayCircleOutlined,
	PauseCircleOutlined,
	LineChartOutlined,
	BarChartOutlined,
	AreaChartOutlined,
} from '@ant-design/icons'
import styles from './GpxComparator.module.css'
import {
	calculateDistance,
	calculateSpeed,
	calculateLag,
	findKeySegments,
} from '../utils/gpxCalculations' // ← Импортируем утилиты
import useGpxLoader from '../hooks/useGpxLoader'

import ComparisonMap from './components/ComparisonMap'

const { Title, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs

export default function GpxComparator({ track, tracks, user }) {
	const [selectedTrack1, setSelectedTrack1] = useState(null)
	const [selectedTrack2, setSelectedTrack2] = useState(null)
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentPointIndex, setCurrentPointIndex] = useState(0)
	// Используем хук для загрузки точек
	const {
		points: track1Points,
		loading: loading1,
		error: error1,
		stats: stats1,
	} = useGpxLoader(selectedTrack1?.url)
	const playerIntervalRef = useRef(null)

	const {
		points: track2Points,
		loading: loading2,
		error: error2,
		stats: stats2,
	} = useGpxLoader(selectedTrack2?.url)

	const loading = loading1 || loading2
	const [lags, setLags] = useState([])
	const [keySegments, setKeySegments] = useState([])

	if (tracks.length === 0) {
		return (
			<Card className={styles.container}>
				<Empty
					description='Нет треков для сравнения'
					image={Empty.PRESENTED_IMAGE_SIMPLE}
				/>
			</Card>
		)
	}
	useEffect(() => {
		if (tracks.length > 0 && !selectedTrack1) {
			setSelectedTrack1(tracks[0])
		}
	}, [tracks, selectedTrack1])

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
	useEffect(() => {
		return () => {
			if (playerIntervalRef.current) {
				clearInterval(playerIntervalRef.current)
			}
		}
	}, [])

	return (
		<Card className={styles.container}>
			<div className={styles.comparisonSetup}>
				<div className={styles.trackSelection}>
					<div className={styles.trackCard}>
						<Text strong>Трек 1 (основной)</Text>
						<Select
							placeholder='Выберите первый трек'
							className={styles.select}
							size='middle'
							onChange={trackId => {
								const selected = tracks.find(t => t.id === trackId)
								setSelectedTrack1(selected)
							}}
							value={selectedTrack1?.id}
							disabled={loading}
						>
							{tracks.map(t => (
								<Option key={t.id} value={t.id}>
									{t.filename} ({Math.floor(t.time / 60)}:
									{(t.time % 60).toString().padStart(2, '0')})
								</Option>
							))}
						</Select>
						{selectedTrack1 && (
							<div className={styles.selectedTrackInfo}>
								<Text className={styles.trackName}>
									{selectedTrack1.filename}
								</Text>
								<Text type='secondary' className={styles.trackTime}>
									{Math.floor(selectedTrack1.time / 60)}:
									{(selectedTrack1.time % 60).toString().padStart(2, '0')}
								</Text>
							</div>
						)}
					</div>

					<div className={styles.vsLabel}>VS</div>

					<div className={styles.trackCard}>
						<Text strong>Трек 2 (для сравнения)</Text>
						<Select
							placeholder='Выберите второй трек'
							className={styles.select}
							size='middle'
							onChange={trackId => {
								const selected = tracks.find(t => t.id === trackId)
								setSelectedTrack2(selected)
							}}
							value={selectedTrack2?.id}
							disabled={loading || !selectedTrack1}
						>
							{tracks
								.filter(t => !selectedTrack1 || t.id !== selectedTrack1.id)
								.map(t => (
									<Option key={t.id} value={t.id}>
										{t.filename} ({Math.floor(t.time / 60)}:
										{(t.time % 60).toString().padStart(2, '0')})
									</Option>
								))}
						</Select>
						{selectedTrack2 && (
							<div className={styles.selectedTrackInfo}>
								<Text className={styles.trackName}>
									{selectedTrack2.filename}
								</Text>
								<Text type='secondary' className={styles.trackTime}>
									{Math.floor(selectedTrack2.time / 60)}:
									{(selectedTrack2.time % 60).toString().padStart(2, '0')}
								</Text>
							</div>
						)}
					</div>
				</div>

				{selectedTrack1 && selectedTrack2 && (
					<>
						<div className={styles.controls}>
							<Button
								type={isPlaying ? 'default' : 'primary'}
								icon={
									isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />
								}
								onClick={handlePlayPause}
								disabled={
									track1Points.length === 0 || track2Points.length === 0
								}
							>
								{isPlaying ? 'Пауза' : 'Старт'}
							</Button>
							<Button
								onClick={() => setCurrentPointIndex(0)}
								disabled={currentPointIndex === 0 || isPlaying}
							>
								Сбросить
							</Button>
							<Text type='secondary' className={styles.controlHint}>
								{isPlaying
									? `Точка ${currentPointIndex + 1} из ${Math.min(
											track1Points.length,
											track2Points.length
									  )}`
									: 'Запускает одновременное движение двух точек по трекам'}
							</Text>
						</div>

						{/* Добавьте карту */}
						<div className={styles.mapSection}>
							<ComparisonMap
								track1Points={track1Points}
								track2Points={track2Points}
								currentIndex={currentPointIndex}
								isPlaying={isPlaying}
							/>
						</div>
					</>
				)}
			</div>

			{loading ? (
				<div className={styles.loading}>
					<Spin size='large' />
					<Text type='secondary'>Загрузка треков для сравнения...</Text>
				</div>
			) : selectedTrack1 && selectedTrack2 && stats ? (
				<>
					<Tabs defaultActiveKey='stats' className={styles.tabs}>
						<TabPane tab='Статистика' key='stats' icon={<BarChartOutlined />}>
							<div className={styles.statsGrid}>
								<Row gutter={[16, 16]}>
									<Col span={12}>
										<Card size='small'>
											<Statistic
												title='Макс. отставание (расстояние)'
												value={stats.maxDistanceLag}
												suffix='м'
												valueStyle={{ color: '#cf1322' }}
											/>
										</Card>
									</Col>
									<Col span={12}>
										<Card size='small'>
											<Statistic
												title='Макс. отставание (время)'
												value={stats.maxTimeLag}
												suffix='сек'
												valueStyle={{ color: '#cf1322' }}
											/>
										</Card>
									</Col>
									<Col span={12}>
										<Card size='small'>
											<Statistic
												title='Среднее отставание (расстояние)'
												value={stats.avgDistanceLag}
												suffix='м'
												valueStyle={{ color: '#1890ff' }}
											/>
										</Card>
									</Col>
									<Col span={12}>
										<Card size='small'>
											<Statistic
												title='Среднее отставание (время)'
												value={stats.avgTimeLag}
												suffix='сек'
												valueStyle={{ color: '#1890ff' }}
											/>
										</Card>
									</Col>
								</Row>
							</div>
						</TabPane>

						<TabPane
							tab='Ключевые участки'
							key='segments'
							icon={<AreaChartOutlined />}
						>
							{keySegments.length > 0 ? (
								<div className={styles.segmentsList}>
									{keySegments.map((segment, index) => (
										<Card
											key={index}
											size='small'
											className={styles.segmentCard}
										>
											<Row gutter={[16, 8]}>
												<Col span={12}>
													<Text strong>Участок {index + 1}</Text>
													<Text
														type='secondary'
														className={styles.segmentRange}
													>
														Точки: {segment.startIndex + 1} -{' '}
														{segment.endIndex + 1}
													</Text>
												</Col>
												<Col span={12}>
													<Statistic
														title='Среднее отставание'
														value={segment.avgDistance.toFixed(1)}
														suffix='м'
														size='small'
													/>
												</Col>
											</Row>
										</Card>
									))}
								</div>
							) : (
								<Empty description='Недостаточно данных для анализа участков' />
							)}
						</TabPane>

						<TabPane tab='Графики' key='charts' icon={<LineChartOutlined />}>
							<Alert
								message='Графики скоростей и высот в разработке'
								description='Совмещенные графики скоростей и высот появятся в следующем обновлении.'
								type='info'
								showIcon
							/>
						</TabPane>
					</Tabs>
				</>
			) : selectedTrack2 ? (
				<Alert
					message='Недостаточно данных'
					description='Для сравнения необходимо загрузить точки обоих треков'
					type='warning'
					showIcon
				/>
			) : (
				<Alert
					message='Выберите второй трек'
					description='Выберите трек для сравнения из выпадающего списка'
					type='info'
					showIcon
				/>
			)}
		</Card>
	)
}
