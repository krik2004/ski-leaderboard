import React, { useEffect, useRef } from 'react'
import { Card, Typography } from 'antd'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import styles from './ComparisonMap.module.css'

const { Text } = Typography

const ComparisonMap = ({
	track1Points = [],
	track2Points = [],
	currentIndex = 0,
	isPlaying = false,
	onMapReady,
}) => {
	const mapRef = useRef(null)
	const mapInstanceRef = useRef(null)
	const track1LineRef = useRef(null)
	const track2LineRef = useRef(null)
	const marker1Ref = useRef(null)
	const marker2Ref = useRef(null)

	// Инициализация карты
	useEffect(() => {
		if (!mapRef.current || mapInstanceRef.current) return

		const map = L.map(mapRef.current, {
			zoomControl: true,
			scrollWheelZoom: true,
		}).setView([55.7558, 37.6173], 13) // Москва по умолчанию

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors',
		}).addTo(map)

		mapInstanceRef.current = map
		onMapReady?.(map)

		return () => {
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove()
				mapInstanceRef.current = null
			}
		}
	}, [onMapReady])

	// Отрисовка треков
	useEffect(() => {
		if (!mapInstanceRef.current) return

		// Удаляем старые линии
		if (track1LineRef.current) {
			mapInstanceRef.current.removeLayer(track1LineRef.current)
		}
		if (track2LineRef.current) {
			mapInstanceRef.current.removeLayer(track2LineRef.current)
		}

		// Рисуем первый трек (синий)
		if (track1Points.length > 0) {
			const latlngs1 = track1Points.map(p => [p.lat, p.lng])
			track1LineRef.current = L.polyline(latlngs1, {
				color: '#1890ff',
				weight: 3,
				opacity: 0.8,
			}).addTo(mapInstanceRef.current)
		}

		// Рисуем второй трек (красный)
		if (track2Points.length > 0) {
			const latlngs2 = track2Points.map(p => [p.lat, p.lng])
			track2LineRef.current = L.polyline(latlngs2, {
				color: '#f5222d',
				weight: 3,
				opacity: 0.8,
			}).addTo(mapInstanceRef.current)
		}

		// Центрируем карту на треках
		if (track1Points.length > 0 || track2Points.length > 0) {
			const allPoints = [...track1Points, ...track2Points]
			const bounds = L.latLngBounds(allPoints.map(p => [p.lat, p.lng]))
			mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
		}
	}, [track1Points, track2Points])

	// Обновление позиций маркеров
	useEffect(() => {
		if (!mapInstanceRef.current || currentIndex < 0) return

		// Удаляем старые маркеры
		if (marker1Ref.current) {
			mapInstanceRef.current.removeLayer(marker1Ref.current)
		}
		if (marker2Ref.current) {
			mapInstanceRef.current.removeLayer(marker2Ref.current)
		}

		// Создаем маркер для первого трека (синий)
		if (track1Points[currentIndex]) {
			const point1 = track1Points[currentIndex]
			const icon1 = L.divIcon({
				className: styles.marker1,
				html: `<div style="
					width: 16px;
					height: 16px;
					background: #1890ff;
					border-radius: 50%;
					border: 3px solid white;
					box-shadow: 0 0 8px rgba(0,0,0,0.5);
				"></div>`,
				iconSize: [22, 22],
				iconAnchor: [11, 11],
			})
			marker1Ref.current = L.marker([point1.lat, point1.lng], { icon: icon1 })
				.addTo(mapInstanceRef.current)
				.bindPopup(`Трек 1: точка ${currentIndex + 1}`)
		}

		// Создаем маркер для второго трека (красный)
		if (track2Points[currentIndex]) {
			const point2 = track2Points[currentIndex]
			const icon2 = L.divIcon({
				className: styles.marker2,
				html: `<div style="
					width: 16px;
					height: 16px;
					background: #f5222d;
					border-radius: 50%;
					border: 3px solid white;
					box-shadow: 0 0 8px rgba(0,0,0,0.5);
				"></div>`,
				iconSize: [22, 22],
				iconAnchor: [11, 11],
			})
			marker2Ref.current = L.marker([point2.lat, point2.lng], { icon: icon2 })
				.addTo(mapInstanceRef.current)
				.bindPopup(`Трек 2: точка ${currentIndex + 1}`)
		}
	}, [currentIndex, track1Points, track2Points])

	return (
		<Card title='Карта сравнения' size='small' className={styles.container}>
			<div className={styles.mapLegend}>
				<div className={styles.legendItem}>
					<div className={styles.colorBox} style={{ background: '#1890ff' }} />
					<Text>Трек 1</Text>
				</div>
				<div className={styles.legendItem}>
					<div className={styles.colorBox} style={{ background: '#f5222d' }} />
					<Text>Трек 2</Text>
				</div>
			</div>
			<div ref={mapRef} className={styles.map} />
			<div className={styles.status}>
				<Text type='secondary'>
					{isPlaying
						? `Точка ${currentIndex + 1} из ${Math.min(
								track1Points.length,
								track2Points.length
						  )}`
						: 'Выберите оба трека и нажмите "Старт"'}
				</Text>
			</div>
		</Card>
	)
}

export default ComparisonMap
