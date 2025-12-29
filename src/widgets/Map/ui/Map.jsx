import React, { useEffect, useRef, useState } from 'react'
import { Card } from 'antd'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import MapClickMenu from './MapClickMenu'
import TrailMarksDisplay from './TrailMarksDisplay'
import TrailSelector from './TrailSelector'
import { trails, defaultTrail } from './trailsData'
import styles from './Map.module.css'

const Map = ({ user }) => {
	const mapContainerRef = useRef(null)
	const mapInstanceRef = useRef(null)
	const [selectedTrail, setSelectedTrail] = useState(defaultTrail)

	// Инициализация карты
	useEffect(() => {
		const initMap = () => {
			if (!mapInstanceRef.current && mapContainerRef.current) {
				const mapInstance = L.map(mapContainerRef.current).setView(
					selectedTrail.center,
					selectedTrail.zoom
				)

				L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '© OpenStreetMap',
					maxZoom: 19,
				}).addTo(mapInstance)

				mapInstanceRef.current = mapInstance
			}
		}

		setTimeout(initMap, 100)

		return () => {
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove()
				mapInstanceRef.current = null
			}
		}
	}, []) // Инициализируем карту только один раз

	// Обновление центра карты при выборе трассы
	useEffect(() => {
		if (mapInstanceRef.current && selectedTrail) {
			mapInstanceRef.current.setView(selectedTrail.center, selectedTrail.zoom)
		}
	}, [selectedTrail])

	const handleTrailChange = trail => {
		setSelectedTrail(trail)
	}

	return (
		<Card className={styles.card}>
			<div className={styles.cardHeader}>
				<TrailSelector
					selectedTrail={selectedTrail}
					onTrailChange={handleTrailChange}
				/>
			</div>

			<div ref={mapContainerRef} className={styles.mapContainer}>
				{mapInstanceRef.current && user && (
					<MapClickMenu map={mapInstanceRef.current} user={user} />
				)}
				{mapInstanceRef.current && (
					<TrailMarksDisplay map={mapInstanceRef.current} user={user} />
				)}
			</div>

			<div className={styles.legend}>
				<h4>Легенда меток:</h4>
				<ul>
					<li>⚠️ Опасный поворот</li>
					<li>⛰️ Крутой склон</li>
					<li>🌿 Ветки на трассе</li>
					<li>🏖️ Песок/грунт</li>
					<li>🚜 Следы лесовозов</li>
					<li>❄️ Незатроплено</li>
					<li>⭐ Идеально</li>
					<li>📍 Другое</li>
				</ul>
				<div className={styles.legendSubtext}>
					🔒 Постоянная метка | ⏰ Временная (24ч)
				</div>
			</div>
		</Card>
	)
}

export default Map
