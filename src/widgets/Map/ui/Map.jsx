import React, { useEffect, useRef } from 'react'
import { Card, Alert } from 'antd'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import styles from './Map.module.css'

const Map = ({ user }) => {
	const mapContainerRef = useRef(null)
	const mapInstanceRef = useRef(null)

	useEffect(() => {
		// Ждем пока контейнер будет доступен
		const initMap = () => {
			if (!mapInstanceRef.current && mapContainerRef.current) {
				// Проверяем высоту контейнера
				const containerHeight = mapContainerRef.current.offsetHeight
				console.log('Высота контейнера карты:', containerHeight)

				if (containerHeight < 100) {
					// Если высота маленькая - увеличиваем
					mapContainerRef.current.style.height = '400px'
					mapContainerRef.current.style.minHeight = '400px'
				}

				const mapInstance = L.map(mapContainerRef.current).setView(
					[52.416925, 103.738906],
					15
				)

				L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '© OpenStreetMap',
					maxZoom: 19,
				}).addTo(mapInstance)

				mapInstanceRef.current = mapInstance
				console.log('Карта инициализирована')
			}
		}

		// Пробуем несколько раз с задержками
		setTimeout(initMap, 100)
		setTimeout(initMap, 500)
		setTimeout(initMap, 1000)

		return () => {
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove()
				mapInstanceRef.current = null
			}
		}
	}, [])
useEffect(() => {
	// Функция обновления размеров карты
	const updateMapSize = () => {
		if (mapInstanceRef.current) {
			// Небольшая задержка для гарантии что DOM обновился
			setTimeout(() => {
				mapInstanceRef.current.invalidateSize()
				console.log('Карта обновлена, ширина окна:', window.innerWidth)
			}, 100)
		}
	}

	// Обновляем при ресайзе
	window.addEventListener('resize', updateMapSize)

	// Первоначальное обновление
	const initTimer = setTimeout(updateMapSize, 500)

	return () => {
		window.removeEventListener('resize', updateMapSize)
		clearTimeout(initTimer)
	}
}, [])
	return (
		<Card className={styles.card} title='Карта трасс'>
			<Alert
				message='Карта'
				description='Интерактивная карта трасс с метками'
				type='info'
				showIcon
				style={{ marginBottom: 16 }}
			/>

			<div
				ref={mapContainerRef}
				className={styles.mapContainer}
	
			>
				{/* Fallback текст */}
				<div
					style={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						color: '#999',
						textAlign: 'center',
					}}
				>
					Загрузка карты...
				</div>
			</div>

			<div className={styles.legend}>
				<h4>Легенда:</h4>
				<ul>
					<li>🔴 Постоянные метки (опасные участки)</li>
					<li>🟡 Временные метки (срок жизни 24ч)</li>
					<li>🟢 Свежие треки</li>
					<li>🔵 Старые треки</li>
				</ul>
			</div>
		</Card>
	)
}

export default Map
