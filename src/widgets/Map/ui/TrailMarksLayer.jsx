import React, { useEffect, useState } from 'react'
import L from 'leaflet'
import { supabase } from '../../../shared/api/supabase'
import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

const TrailMarksLayer = ({ map }) => {
	const [loading, setLoading] = useState(true)
	const [marks, setMarks] = useState([])

	// Иконки для разных категорий
	const categoryStyles = {
		dangerous_turn: { color: '#f5222d', icon: '⚠️' },
		steep_slope: { color: '#fa8c16', icon: '⛰️' },
		branches: { color: '#faad14', icon: '🌿' },
		sand: { color: '#d48806', icon: '🏖️' },
		loggers: { color: '#722ed1', icon: '🚜' },
		untrodden: { color: '#13c2c2', icon: '❄️' },
		perfect: { color: '#52c41a', icon: '⭐' },
		other: { color: '#1890ff', icon: '📍' },
	}

	useEffect(() => {
		if (!map) return

		const loadMarks = async () => {
			try {
				setLoading(true)

				// Получаем все метки
				const { data, error } = await supabase
					.from('trail_marks')
					.select('*')
					.order('created_at', { ascending: false })

				if (error) throw error

				console.log('Загружено меток:', data?.length || 0)

				const marksLayers = []

				// Отображаем каждую метку на карте
				data?.forEach(mark => {
					try {
						const style = categoryStyles[mark.category] || categoryStyles.other

						// Для постоянных меток - сплошная линия
						// Для временных - пунктирная
						const isTemporary = mark.type === 'temporary'
						const isExpired =
							mark.expiry_time && new Date(mark.expiry_time) < new Date()

						if (isExpired) return // Не показываем просроченные

						// Создаем линию из геометрии
						// TODO: Здесь нужно парсить geometry из базы
						// Пока используем заглушку

						const line = L.polyline(
							[
								[52.4169, 103.7388],
								[52.417, 103.739],
								[52.4168, 103.7386],
							],
							{
								color: style.color,
								weight: isTemporary ? 3 : 4,
								opacity: isTemporary ? 0.6 : 0.8,
								dashArray: isTemporary ? '5, 10' : null,
							}
						).addTo(map)

						// Popup с информацией
						const popupContent = `
              <div style="min-width: 200px">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
                  <span style="font-size: 20px">${style.icon}</span>
                  <strong>${getCategoryLabel(mark.category)}</strong>
                </div>
                <div><strong>Тип:</strong> ${
									mark.type === 'permanent' ? 'Постоянная' : 'Временная'
								}</div>
                <div><strong>Добавил:</strong> ${
									mark.created_by_username || 'Аноним'
								}</div>
                ${
									mark.description
										? `<div><strong>Описание:</strong> ${mark.description}</div>`
										: ''
								}
                ${
									mark.expiry_time
										? `<div><strong>Истекает:</strong> ${new Date(
												mark.expiry_time
										  ).toLocaleString('ru-RU')}</div>`
										: ''
								}
                <div><strong>Подтверждений:</strong> ${
									mark.confirmed_count || 0
								}</div>
                <hr style="margin: 8px 0">
                <small>${new Date(mark.created_at).toLocaleString(
									'ru-RU'
								)}</small>
              </div>
            `

						line.bindPopup(popupContent)
						marksLayers.push(line)
					} catch (markError) {
						console.error('Ошибка отображения метки:', markError)
					}
				})

				setMarks(marksLayers)
				setLoading(false)
			} catch (err) {
				console.error('Ошибка загрузки меток:', err)
				setLoading(false)
			}
		}

		loadMarks()

		// Очистка
		return () => {
			marks.forEach(layer => {
				if (layer && map.hasLayer(layer)) {
					map.removeLayer(layer)
				}
			})
		}
	}, [map])

	const getCategoryLabel = category => {
		const labels = {
			dangerous_turn: 'Опасный поворот',
			steep_slope: 'Крутой склон',
			branches: 'Ветки на трассе',
			sand: 'Песок/грунт',
			loggers: 'Следы лесовозов',
			untrodden: 'Незатроплено',
			perfect: 'Идеально',
			other: 'Другое',
		}
		return labels[category] || category
	}
	const renderMark = mark => {
		if (!map || !mark) return null

		try {
			// Парсим geometry из базы (пока заглушка)
			const style =
				mark.type === 'permanent'
					? { color: '#f5222d', weight: 4, opacity: 0.8 }
					: { color: '#faad14', weight: 3, opacity: 0.6, dashArray: '5, 10' }

			// Временные координаты - потом заменим на парсинг
			const coordinates = [
				[52.4169 + Math.random() * 0.001, 103.7388 + Math.random() * 0.001],
				[52.417 + Math.random() * 0.001, 103.739 + Math.random() * 0.001],
				[52.4168 + Math.random() * 0.001, 103.7386 + Math.random() * 0.001],
			]

			const line = L.polyline(coordinates, style).addTo(map)

			const popupContent = `
      <div style="min-width: 200px">
        <strong>${mark.category}</strong><br>
        <div>Тип: ${
					mark.type === 'permanent' ? 'Постоянная' : 'Временная'
				}</div>
        ${mark.description ? `<div>${mark.description}</div>` : ''}
        <div><small>Добавил: ${
					mark.created_by_username || 'Аноним'
				}</small></div>
        <div><small>${new Date(mark.created_at).toLocaleString(
					'ru-RU'
				)}</small></div>
      </div>
    `

			line.bindPopup(popupContent)
			return line
		} catch (err) {
			console.error('Ошибка отрисовки метки:', err, mark)
			return null
		}
	}
	if (loading) {
		return (
			<div
				style={{
					position: 'absolute',
					top: '50px',
					right: '10px',
					zIndex: 1000,
					background: 'rgba(255,255,255,0.9)',
					padding: '8px 12px',
					borderRadius: '4px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
					fontSize: '12px',
				}}
			>
				<Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} />
				<span style={{ marginLeft: '8px' }}>Загрузка меток...</span>
			</div>
		)
	}

	return (
		<div
			style={{
				position: 'absolute',
				top: '50px',
				right: '10px',
				zIndex: 1000,
				background: 'rgba(255,255,255,0.9)',
				padding: '8px 12px',
				borderRadius: '4px',
				boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
				fontSize: '12px',
			}}
		>
			Меток на карте: {marks.length}
		</div>
	)
}

export default TrailMarksLayer
