import React, { useEffect, useState, useCallback } from 'react'
import L from 'leaflet'
import { supabase } from '../../../shared/api/supabase'
import { Alert, Spin, Button, message } from 'antd'
import {
	LoadingOutlined,
	LikeOutlined,
	DislikeOutlined,
} from '@ant-design/icons'

const TrailMarksDisplay = ({ map, user }) => {
	const [marks, setMarks] = useState([])
	const [error, setError] = useState(null)
	const [loading, setLoading] = useState(true)
	const [userVotes, setUserVotes] = useState({}) // { markId: 'up'|'down' }
	const [updatingVote, setUpdatingVote] = useState(null)

	// Иконки для разных категорий
	// Иконки для разных категорий - уменьшенный размер
	const categoryIcons = {
		dangerous_turn: L.divIcon({
			html: '<div style="font-size: 18px; line-height: 1;">⚠️</div>', // Встраиваем размер
			className: 'custom-div-icon',
			iconSize: [18, 18], // Размер контейнера
			iconAnchor: [9, 18], // Точка привязки к координатам
			popupAnchor: [0, -18], // Смещение popup
		}),
		steep_slope: L.divIcon({
			html: '<div style="font-size: 18px; line-height: 1;">⛰️</div>',
			className: 'custom-div-icon',
			iconSize: [18, 18],
			iconAnchor: [9, 18],
			popupAnchor: [0, -18],
		}),
		branches: L.divIcon({
			html: '<div style="font-size: 18px; line-height: 1;">🌿</div>',
			className: 'custom-div-icon',
			iconSize: [18, 18],
			iconAnchor: [9, 18],
			popupAnchor: [0, -18],
		}),
		sand: L.divIcon({
			html: '<div style="font-size: 18px; line-height: 1;">🏖️</div>',
			className: 'custom-div-icon',
			iconSize: [18, 18],
			iconAnchor: [9, 18],
			popupAnchor: [0, -18],
		}),
		loggers: L.divIcon({
			html: '<div style="font-size: 18px; line-height: 1;">🚜</div>',
			className: 'custom-div-icon',
			iconSize: [18, 18],
			iconAnchor: [9, 18],
			popupAnchor: [0, -18],
		}),
		untrodden: L.divIcon({
			html: '<div style="font-size: 18px; line-height: 1;">❄️</div>',
			className: 'custom-div-icon',
			iconSize: [18, 18],
			iconAnchor: [9, 18],
			popupAnchor: [0, -18],
		}),
		perfect: L.divIcon({
			html: '<div style="font-size: 18px; line-height: 1;">⭐</div>',
			className: 'custom-div-icon',
			iconSize: [18, 18],
			iconAnchor: [9, 18],
			popupAnchor: [0, -18],
		}),
		other: L.divIcon({
			html: '<div style="font-size: 18px; line-height: 1;">📍</div>',
			className: 'custom-div-icon',
			iconSize: [18, 18],
			iconAnchor: [9, 18],
			popupAnchor: [0, -18],
		}),
	}

	// Цвета для разных типов
	const categoryColors = {
		dangerous_turn: '#f5222d',
		steep_slope: '#fa8c16',
		branches: '#faad14',
		sand: '#d48806',
		loggers: '#722ed1',
		untrodden: '#13c2c2',
		perfect: '#52c41a',
		other: '#1890ff',
	}

	// Загрузка меток
	const loadMarks = useCallback(async () => {
		try {
			console.log('🔄 Загрузка меток...')
			setLoading(true)

			// Загружаем метки через RPC
			const { data: marksData, error: marksError } = await supabase.rpc(
				'get_marks_with_geojson'
			)

			if (marksError) throw marksError

			if (!marksData || marksData.length === 0) {
				setMarks([])
				setLoading(false)
				return
			}

			// Загружаем голоса текущего пользователя
			if (user) {
				const { data: votesData } = await supabase
					.from('mark_confirmations')
					.select('mark_id, vote_type')
					.eq('user_id', user.id)

				const votesMap = {}
				votesData?.forEach(vote => {
					votesMap[vote.mark_id] = vote.vote_type
				})
				setUserVotes(votesMap)
			}

			// Отображаем метки
			displayMarksOnMap(marksData)
		} catch (err) {
			console.error('❌ Ошибка загрузки:', err)
			setError('Не удалось загрузить метки')
		} finally {
			setLoading(false)
		}
	}, [map, user])

	// Отображение меток на карте
	const displayMarksOnMap = marksData => {
		if (!map) return

		// Очищаем старые метки
		marks.forEach(marker => {
			if (marker && map.hasLayer(marker)) {
				map.removeLayer(marker)
			}
		})

		const newMarkers = []

		marksData.forEach(mark => {
			try {
				// Получаем координаты центра линии
				let centerLat = 52.416925 // координаты по умолчанию
				let centerLng = 103.738906

				if (mark.geometry && mark.geometry.coordinates) {
					const coords = mark.geometry.coordinates
					if (mark.geometry.type === 'LineString' && coords.length > 0) {
						// Берем среднюю точку линии
						const midIndex = Math.floor(coords.length / 2)
						const [lng, lat] = coords[midIndex]
						centerLat = lat
						centerLng = lng
					} else if (mark.geometry.type === 'Point') {
						const [lng, lat] = coords
						centerLat = lat
						centerLng = lng
					}
				}

				// Создаем маркер с иконкой
				const icon = categoryIcons[mark.category] || categoryIcons.other
				const marker = L.marker([centerLat, centerLng], {
					icon,
					title: getCategoryLabel(mark.category),
				}).addTo(map)

				// Создаем popup с кнопками голосования
				const popupContent = createPopupContent(mark)
				marker.bindPopup(popupContent)

				newMarkers.push(marker)
			} catch (err) {
				console.error('Ошибка создания маркера:', err)
			}
		})

		setMarks(newMarkers)
		console.log(`✅ Отображено меток: ${newMarkers.length}`)
	}

	// Создание содержимого popup
	// Создание содержимого popup
	const createPopupContent = mark => {
		const userVote = userVotes[mark.id]
		const isOwnMark = user && mark.user_id === user.id
		const color = categoryColors[mark.category] || '#1890ff'

		return `
		<div style="min-width: 280px; padding: 0;">
			<div style="
				background: ${color}20;
				padding: 15px;
				border-radius: 8px 8px 0 0;
				border-bottom: 2px solid ${color};
				position: relative;
			">
				${
					isOwnMark
						? `
					<button 
						id="delete-mark-${mark.id}"
						style="
							position: absolute;
							top: 10px;
							right: 10px;
							background: #ff4d4f;
							color: white;
							border: none;
							border-radius: 4px;
							width: 24px;
							height: 24px;
							display: flex;
							align-items: center;
							justify-content: center;
							cursor: pointer;
							font-size: 12px;
							padding: 0;
						"
						title="Удалить метку"
					>
						🗑️
					</button>
				`
						: ''
				}
				
				<div style="display: flex; align-items: center; gap: 12px;">
					<span style="font-size: 32px">${getCategoryIcon(mark.category)}</span>
					<div>
						<strong style="font-size: 16px; display: block; color: ${color};">
							${getCategoryLabel(mark.category)}
						</strong>
						<span style="font-size: 12px; color: #666;">
							${mark.type === 'permanent' ? '🔒 Постоянная' : '⏰ Временная'}
							${
								mark.expiry_time
									? ` • до ${new Date(mark.expiry_time).toLocaleTimeString(
											'ru-RU',
											{
												hour: '2-digit',
												minute: '2-digit',
											}
									  )}`
									: ''
							}
						</span>
					</div>
				</div>
			</div>
			
			<div style="padding: 15px;">
				${
					mark.description
						? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #333;">${mark.description}</p>`
						: '<p style="margin: 0 0 12px 0; font-size: 14px; color: #999; font-style: italic;">Нет описания</p>'
				}
				
				<div style="
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 12px;
					padding: 10px;
					background: #fafafa;
					border-radius: 6px;
				">
					<button 
						id="vote-up-${mark.id}"
						style="
							flex: 1;
							padding: 8px;
							background: ${userVote === 'up' ? '#52c41a' : '#f0f0f0'};
							color: ${userVote === 'up' ? 'white' : '#666'};
							border: none;
							border-radius: 6px 0 0 6px;
							cursor: pointer;
							font-weight: bold;
							display: flex;
							align-items: center;
							justify-content: center;
							gap: 6px;
						"
						${
							updatingVote === mark.id
								? 'disabled style="opacity: 0.5; cursor: not-allowed;"'
								: ''
						}
					>
						<span style="font-size: 16px">👍</span>
						<span>${mark.up_votes || 0}</span>
					</button>
					
					<button 
						id="vote-down-${mark.id}"
						style="
							flex: 1;
							padding: 8px;
							background: ${userVote === 'down' ? '#f5222d' : '#f0f0f0'};
							color: ${userVote === 'down' ? 'white' : '#666'};
							border: none;
							border-radius: 0 6px 6px 0;
							cursor: pointer;
							font-weight: bold;
							display: flex;
							align-items: center;
							justify-content: center;
							gap: 6px;
						"
						${
							updatingVote === mark.id
								? 'disabled style="opacity: 0.5; cursor: not-allowed;"'
								: ''
						}
					>
						<span style="font-size: 16px">👎</span>
						<span>${mark.down_votes || 0}</span>
					</button>
				</div>
				
				${
					isOwnMark
						? `
					<button 
						id="delete-confirm-${mark.id}"
						style="
							width: 100%;
							padding: 10px;
							background: #fff2f0;
							color: #f5222d;
							border: 1px solid #ffccc7;
							border-radius: 6px;
							cursor: pointer;
							font-weight: bold;
							margin-bottom: 12px;
							display: flex;
							align-items: center;
							justify-content: center;
							gap: 8px;
							font-size: 14px;
						"
						title="Удалить эту метку навсегда"
					>
						🗑️ Удалить метку
					</button>
				`
						: ''
				}
				
				<div style="font-size: 12px; color: #888; border-top: 1px solid #f0f0f0; padding-top: 10px;">
					<div style="margin-bottom: 4px;">👤 <strong>${
						mark.created_by_username || 'Аноним'
					}</strong></div>
					<div style="margin-bottom: 4px;">🕐 ${new Date(mark.created_at).toLocaleString(
						'ru-RU'
					)}</div>
					<div style="color: #52c41a;">✅ Подтверждений: ${
						mark.confirmed_count || 0
					}</div>
					${
						isOwnMark
							? '<div style="color: #1890ff; margin-top: 4px;">✨ Это ваша метка</div>'
							: ''
					}
				</div>
			</div>
		</div>
	`
	}
	// Функция удаления метки
	const handleDeleteMark = async markId => {
		if (!user) {
			message.warning('Нужно войти в систему')
			return
		}

		// Подтверждение удаления
		if (!window.confirm('Удалить эту метку? Это действие нельзя отменить.')) {
			return
		}

		try {
			// 1. Удаляем голоса за эту метку
			await supabase.from('mark_confirmations').delete().eq('mark_id', markId)

			// 2. Удаляем саму метку
			const { error } = await supabase
				.from('trail_marks')
				.delete()
				.eq('id', markId)

			if (error) throw error

			message.success('Метка удалена!')

			// 3. Удаляем маркер с карты
			const markerToRemove = marks.find(marker => {
				const content = marker.getPopup()?.getContent()
				return content && content.includes(`id="vote-up-${markId}"`)
			})

			if (markerToRemove && map) {
				map.removeLayer(markerToRemove)
			}

			// 4. Обновляем список меток
			setMarks(prev => prev.filter(marker => marker !== markerToRemove))

			// 5. Перезагружаем метки с сервера
			setTimeout(() => {
				loadMarks()
			}, 500)
		} catch (err) {
			console.error('Ошибка удаления метки:', err)
			message.error('Ошибка при удалении метки')
		}
	}
	// Обработка голосования
	const handleVote = async (markId, voteType) => {
		if (!user) {
			message.warning('Нужно войти в систему для голосования')
			return
		}

		setUpdatingVote(markId)

		try {
			// Удаляем старый голос, если есть
			await supabase
				.from('mark_confirmations')
				.delete()
				.eq('mark_id', markId)
				.eq('user_id', user.id)

			// Добавляем новый голос
			const { error } = await supabase.from('mark_confirmations').insert({
				mark_id: markId,
				user_id: user.id,
				vote_type: voteType,
			})

			if (error) throw error

			// Обновляем счетчики в таблице trail_marks
			const { data: votesData } = await supabase
				.from('mark_confirmations')
				.select('vote_type')
				.eq('mark_id', markId)

			const upVotes = votesData?.filter(v => v.vote_type === 'up').length || 0
			const downVotes =
				votesData?.filter(v => v.vote_type === 'down').length || 0

			await supabase
				.from('trail_marks')
				.update({
					confirmed_count: upVotes,
					updated_at: new Date().toISOString(),
				})
				.eq('id', markId)

			// Обновляем локальное состояние
			setUserVotes(prev => ({
				...prev,
				[markId]: voteType,
			}))

			// Перезагружаем метки
			loadMarks()
			message.success('Голос учтен!')
		} catch (err) {
			console.error('Ошибка голосования:', err)
			message.error('Ошибка при голосовании')
		} finally {
			setUpdatingVote(null)
		}
	}

	// Инициализация обработчиков для кнопок в popup
	// Инициализация обработчиков для кнопок в popup
	useEffect(() => {
		if (!map || marks.length === 0) return

		const handlePopupOpen = e => {
			const popup = e.popup
			const content = popup._content

			// Ищем ID метки в содержимом popup
			const voteMatch = content.match(/id="vote-(up|down)-(\d+)"/)
			const deleteMatch = content.match(/id="delete-(?:mark|confirm)-(\d+)"/)

			if (voteMatch) {
				const [_, type, markId] = voteMatch

				setTimeout(() => {
					const upBtn = document.getElementById(`vote-up-${markId}`)
					const downBtn = document.getElementById(`vote-down-${markId}`)

					if (upBtn) {
						upBtn.onclick = () => handleVote(parseInt(markId), 'up')
					}
					if (downBtn) {
						downBtn.onclick = () => handleVote(parseInt(markId), 'down')
					}
				}, 100)
			}

			if (deleteMatch) {
				const [_, markId] = deleteMatch

				setTimeout(() => {
					const deleteBtn = document.getElementById(`delete-mark-${markId}`)
					const deleteConfirmBtn = document.getElementById(
						`delete-confirm-${markId}`
					)

					if (deleteBtn) {
						deleteBtn.onclick = () => handleDeleteMark(parseInt(markId))
					}
					if (deleteConfirmBtn) {
						deleteConfirmBtn.onclick = () => handleDeleteMark(parseInt(markId))
					}
				}, 100)
			}
		}

		map.on('popupopen', handlePopupOpen)

		return () => {
			map.off('popupopen', handlePopupOpen)
		}
	}, [map, marks, user, loadMarks])
	// Автоматическое обновление каждые 30 секунд
	useEffect(() => {
		if (!map) return

		// Первая загрузка
		loadMarks()

		// Сохраняем функцию для обновления извне
		window.reloadMarks = loadMarks

		// Интервал обновления
		const interval = setInterval(loadMarks, 300000)

		return () => {
			clearInterval(interval)
			if (window.reloadMarks) {
				delete window.reloadMarks
			}
		}
	}, [map, user, loadMarks])

	// Вспомогательные функции
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

	const getCategoryIcon = category => {
		const icons = {
			dangerous_turn: '⚠️',
			steep_slope: '⛰️',
			branches: '🌿',
			sand: '🏖️',
			loggers: '🚜',
			untrodden: '❄️',
			perfect: '⭐',
			other: '📍',
		}
		return icons[category] || '📍'
	}

	// Рендер состояния загрузки
	if (loading && marks.length === 0) {
		return (
			<div
				style={{
					position: 'absolute',
					top: '60px',
					right: '20px',
					zIndex: 1000,
					background: 'white',
					padding: '12px 16px',
					borderRadius: '8px',
					boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
					border: '2px solid #1890ff',
					display: 'flex',
					alignItems: 'center',
				}}
			>
				<Spin
					indicator={<LoadingOutlined style={{ color: '#1890ff' }} spin />}
				/>
				<span style={{ marginLeft: '10px', fontSize: '13px', fontWeight: 500 }}>
					Загрузка меток...
				</span>
			</div>
		)
	}

	return (
		<>
			{error && (
				<div
					style={{
						position: 'absolute',
						top: '60px',
						right: '20px',
						zIndex: 1000,
						maxWidth: '300px',
					}}
				>
					<Alert
						message='Ошибка загрузки'
						description={error}
						type='error'
						showIcon
						closable
						onClose={() => setError(null)}
					/>
				</div>
			)}

			{/* Счетчик меток */}
			<div
				style={{
					position: 'absolute',
					top: '60px',
					right: '20px',
					zIndex: 1000,
					background: 'white',
					padding: '10px 14px',
					borderRadius: '8px',
					boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
					fontSize: '13px',
					fontWeight: 500,
					border: '2px solid #52c41a',
					color: '#389e0d',
				}}
			>
				📍 Меток на карте: <strong>{marks.length}</strong>
				<div
					style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}
				></div>
			</div>
		</>
	)
}

export default TrailMarksDisplay
