import React, { useEffect, useRef } from 'react'
import { Card, Alert } from 'antd'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import styles from './Map.module.css'

const Map = () => {
	const mapContainerRef = useRef(null)
	const mapInstanceRef = useRef(null)

	useEffect(() => {
		if (!mapInstanceRef.current && mapContainerRef.current) {
			// Инициализация карты без маркеров (для начала)
			const mapInstance = L.map(mapContainerRef.current).setView(
				[55.715, 37.361],
				15
			)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '© OpenStreetMap',
	maxZoom: 19,
}).addTo(mapInstance)

			mapInstanceRef.current = mapInstance
		}

		return () => {
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove()
				mapInstanceRef.current = null
			}
		}
	}, [])

	return (
		<Card className={styles.card} title='Карта трасс'>
			<Alert
				message='Карта в разработке'
				description='Скоро здесь появятся треки заездов, метки проблемных участков и тепловая карта активности'
				type='info'
				showIcon
				style={{ marginBottom: 16 }}
			/>

			<div ref={mapContainerRef} className={styles.mapContainer} />

			<div className={styles.legend}>
				<h4>Легенда (в разработке):</h4>
				<ul>
					<li>🔴 Постоянные метки (опасные участки)</li>
					<li>🟡 Временные метки (срок жизни 24ч)</li>
					<li>🟢 Свежие треки (последние 24ч)</li>
					<li>🔵 Старые треки (прозрачные)</li>
				</ul>
			</div>
		</Card>
	)
}

export default Map


