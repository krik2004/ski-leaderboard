import React, { useState, useEffect } from 'react'
import {
	FloatButton,
	Modal,
	Form,
	Input,
	Select,
	Radio,
	message,
	Button,
} from 'antd'
import {
	PlusOutlined,
	EnvironmentOutlined,
	CloseOutlined,
	CheckOutlined,
} from '@ant-design/icons'
import L from 'leaflet'
import { supabase } from '../../../shared/api/supabase'
import styles from './MapClickMenu.module.css'

const { Option } = Select
const { TextArea } = Input

const MapClickMenu = ({ map, user }) => {
	const [modalVisible, setModalVisible] = useState(false)
	const [drawingMode, setDrawingMode] = useState(false)
	const [currentLine, setCurrentLine] = useState([])
	const [clickPosition, setClickPosition] = useState(null)
	const [form] = Form.useForm()
	const [tempLine, setTempLine] = useState(null)

	const categories = [
		{ value: 'dangerous_turn', label: 'Опасный поворот', icon: '⚠️' },
		{ value: 'steep_slope', label: 'Крутой склон', icon: '⛰️' },
		{ value: 'branches', label: 'Ветки на трассе', icon: '🌿' },
		{ value: 'sand', label: 'Песок/грунт', icon: '🏖️' },
		{ value: 'loggers', label: 'Следы лесовозов', icon: '🚜' },
		{ value: 'untrodden', label: 'Незатроплено', icon: '❄️' },
		{ value: 'perfect', label: 'Идеально', icon: '⭐' },
		{ value: 'other', label: 'Другое', icon: '📍' },
	]

	// Удаляем все обработчики при размонтировании
	useEffect(() => {
		return () => {
			if (window.currentDrawingHandlers) {
				cleanupDrawingHandlers()
			}
		}
	}, [])

	const cleanupDrawingHandlers = () => {
		if (!map) return

		// Убираем обработчик клика
		if (window.currentDrawingHandlers?.click) {
			map.off('click', window.currentDrawingHandlers.click)
		}
		window.currentDrawingHandlers = null

		// Убираем временную линию
		if (window.currentTempLine && map.hasLayer(window.currentTempLine)) {
			map.removeLayer(window.currentTempLine)
			window.currentTempLine = null
		}

		removeDrawingInstructions()
	}

	const showContextMenu = e => {
		if (!map) return // ← добавляем проверку

		const menu = L.popup()
			.setLatLng(e.latlng)
			.setContent(
				`
			<div class="${styles.contextMenu}">
				<h4>Добавить метку</h4>
				<button onclick="window.addMarkerPoint(${e.latlng.lat}, ${e.latlng.lng})">
					📍 Точку
				</button>
				<button onclick="window.startDrawingLine(${e.latlng.lat}, ${e.latlng.lng})">
					📏 Участок трассы
				</button>
				<button onclick="window.cancelMarker()">
					❌ Отмена
				</button>
			</div>
		`
			)
			.openOn(map)

		window.addMarkerPoint = (lat, lng) => {
			map.closePopup()
			setClickPosition({ lat, lng })
			setCurrentLine([])
			setModalVisible(true)
		}

		window.startDrawingLine = (lat, lng) => {
			map.closePopup()
			startDrawing([lat, lng])
		}

		window.cancelMarker = () => {
			map.closePopup()
		}
	}

	const startDrawing = startPoint => {
		console.log('🎨 Начало рисования, точек:', startPoint)

		// Проверяем, не запущено ли уже рисование
		if (drawingMode) {
			message.warning('Рисование уже начато!')
			return
		}

		// Проверяем, не открыт ли уже инструкционный блок
		if (window.drawingInstructions) {
			removeDrawingInstructions()
		}

		setDrawingMode(true)
		setCurrentLine([startPoint])
		setClickPosition(null)

		// Очищаем старые обработчики
		cleanupDrawingHandlers()

		// Создаем первую точку
		window.currentTempLine = L.polyline([startPoint], {
			color: '#ff0000',
			weight: 3,
			dashArray: '5, 10',
			opacity: 0.7,
		}).addTo(map)

		// Обработчик клика для добавления точек
		const handleClick = e => {
			e.originalEvent.stopPropagation()
			e.originalEvent.preventDefault()

			console.log('🖱️ Клик в режиме рисования:', e.latlng)

			const newPoint = [e.latlng.lat, e.latlng.lng]

			setCurrentLine(prev => {
				const updatedLine = [...prev, newPoint]
				console.log('📈 Добавлена точка, всего:', updatedLine.length)

				// Удаляем старую линию если есть
				if (window.currentTempLine && map.hasLayer(window.currentTempLine)) {
					map.removeLayer(window.currentTempLine)
				}

				// Создаем новую линию
				window.currentTempLine = L.polyline(updatedLine, {
					color: '#ff0000',
					weight: 3,
					dashArray: '5, 10',
					opacity: 0.7,
				}).addTo(map)

				// Обновляем счетчик в инструкции
				updateInstructionsCount(updatedLine.length)

				return updatedLine
			})
		}

		// Сохраняем обработчики
		window.currentDrawingHandlers = {
			click: handleClick,
		}

		// Вешаем обработчик
		map.on('click', handleClick)

		showDrawingInstructions()
		message.info('Рисование начато. Кликайте на карту для добавления точек.')
	}
	const finishDrawing = () => {
		console.log('✅ Завершение рисования, всего точек:', currentLine.length)

		if (currentLine.length < 2) {
			message.warning('Нужно как минимум 2 точки для участка!')
			return
		}

		setDrawingMode(false)

		// Меняем цвет на зеленый для предпросмотра
		if (window.currentTempLine && map.hasLayer(window.currentTempLine)) {
			window.currentTempLine.setStyle({
				color: '#52c41a',
				weight: 4,
				opacity: 0.8,
				dashArray: null,
			})
		}

		// Очищаем обработчики
		cleanupDrawingHandlers()

		// Открываем модальное окно
		setModalVisible(true)
		message.success('Участок нарисован! Заполните данные метки.')
	}

	const cancelDrawing = () => {
		setDrawingMode(false)
		setCurrentLine([])
		cleanupDrawingHandlers()
		message.info('Рисование отменено')
	}

	const showDrawingInstructions = () => {
		removeDrawingInstructions()

		window.drawingInstructions = L.control({ position: 'topright' })
		window.drawingInstructions.onAdd = function () {
			const div = L.DomUtil.create('div', 'drawing-instructions')

			// Создаем содержимое с обработчиками сразу
			div.innerHTML = `
			<div style="
				background: white; 
				padding: 15px; 
				border-radius: 8px; 
				box-shadow: 0 4px 12px rgba(0,0,0,0.25);
				border: 3px solid #1890ff;
				max-width: 250px;
				font-size: 14px;
			">
				<div style="color: #1890ff; font-weight: bold; margin-bottom: 10px; font-size: 16px;">
					🎯 Рисование участка
				</div>
				<div style="margin-bottom: 8px; color: #666;">
					• <strong>Клик</strong> - добавить точку
					<br>• <strong>Добавьте минимум 2 точки</strong>
				</div>
				<div style="color: #666; margin-bottom: 12px;">
					Точек: <strong id="points-counter">${currentLine.length}</strong>
				</div>
				
				<div style="display: flex; gap: 8px; margin-bottom: 10px;">
					<button 
						id="finish-drawing-btn" 
						style="
							flex: 1;
							padding: 8px;
							background: #52c41a; 
							color: white; 
							border: none; 
							border-radius: 4px; 
							cursor: pointer;
							font-weight: bold;
							font-size: 14px;
						"
					>
						✓ Готово (${currentLine.length})
					</button>
					
					<button 
						id="cancel-drawing-btn" 
						style="
							flex: 1;
							padding: 8px;
							background: #ff4d4f; 
							color: white; 
							border: none; 
							border-radius: 4px; 
							cursor: pointer;
							font-weight: bold;
							font-size: 14px;
						"
					>
						✕ Отмена
					</button>
				</div>
				
				<div style="font-size: 12px; color: #999; text-align: center;">
					Двойной клик не работает - используйте кнопку "Готово"
				</div>
			</div>
		`

			// НЕМЕДЛЕННО добавляем обработчики
			const finishBtn = div.querySelector('#finish-drawing-btn')
			const cancelBtn = div.querySelector('#cancel-drawing-btn')

			if (finishBtn) {
				finishBtn.onclick = e => {
					e.stopPropagation()
					finishDrawing()
				}
			}

			if (cancelBtn) {
				cancelBtn.onclick = e => {
					e.stopPropagation()
					cancelDrawing()
				}
			}

			return div
		}

		window.drawingInstructions.addTo(map)
	}
	const removeDrawingInstructions = () => {
		if (window.drawingInstructions && map) {
			map.removeControl(window.drawingInstructions)
			window.drawingInstructions = null
		}
	}

	const updateInstructionsCount = count => {
		// Обновляем счетчик в инструкции
		const counter = document.getElementById('points-counter')
		if (counter) {
			counter.innerHTML = count
		}

		// Обновляем текст кнопки
		const finishBtn = document.getElementById('finish-drawing-btn')
		if (finishBtn) {
			finishBtn.innerHTML = `✓ Готово (${count})`
		}
	}

	const handleFormSubmit = async values => {
		try {
			let geometry

			if (currentLine.length > 0) {
				// Участок из нескольких точек
				const coordinates = currentLine
					.map(coord => `${coord[1]} ${coord[0]}`)
					.join(', ')
				geometry = `LINESTRING(${coordinates})`
			} else if (clickPosition) {
				// Одиночная точка - делаем маленький отрезок
				const lat = clickPosition.lat
				const lng = clickPosition.lng
				geometry = `LINESTRING(${lng} ${lat}, ${lng + 0.0001} ${lat + 0.0001})`
			} else {
				throw new Error('Нет координат для метки')
			}

			const expiryTime =
				values.type === 'temporary'
					? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
					: null

			// Получаем username из profiles
			let username = 'Аноним'
			if (user) {
				const { data: profile } = await supabase
					.from('profiles')
					.select('username')
					.eq('id', user.id)
					.single()

				username = profile?.username || user.email?.split('@')[0] || 'Аноним'
			}

			const { data, error } = await supabase
				.from('trail_marks')
				.insert({
					user_id: user?.id,
					type: values.type,
					category: values.category,
					geometry: geometry,
					description: values.description,
					expiry_time: expiryTime,
					created_by_username: username, // Используем username из профиля
					confirmed_count: 0,
				})
				.select()

			if (error) throw error

			message.success('Метка добавлена!')
			setModalVisible(false)
			form.resetFields()
			setCurrentLine([])
			setClickPosition(null)

			// Убираем временную линию
			if (tempLine) {
				map.removeLayer(tempLine)
				setTempLine(null)
			}

			// Перезагружаем метки
			if (window.reloadMarks) {
				window.reloadMarks()
			}
		} catch (error) {
			console.error('Ошибка сохранения:', error)
			message.error('Ошибка: ' + error.message)
		}
	}

	// Инициализация кликов на карте

	useEffect(() => {
		if (!map) return

		const handleMapClick = e => {
			// Если в режиме рисования - НЕ показываем контекстное меню
			if (!drawingMode) {
				showContextMenu(e)
			}
			// Если в режиме рисования - обработчик в startDrawing сам обработает клик
		}

		map.on('click', handleMapClick)

		return () => {
			map.off('click', handleMapClick)
			cleanupDrawingHandlers()
		}
	}, [map, drawingMode]) // Добавляем drawingMode в зависимости

	return (
		<>
			{/* Кнопка добавления метки */}
			<div className={styles.floatButtonContainer}>
				<FloatButton
					icon={<EnvironmentOutlined />}
					type='primary'
					tooltip='Добавить метку на карту'
					onClick={() => {
						if (map) {
							const center = map.getCenter()
							showContextMenu({ latlng: center })
						}
					}}
					className={styles.floatButton}
				/>
			</div>

			{/* Модальное окно */}
			<Modal
				title={
					currentLine.length > 0 ? '📏 Добавить участок' : '📍 Добавить точку'
				}
				open={modalVisible}
				onCancel={() => {
					setModalVisible(false)
					setCurrentLine([])
					setClickPosition(null)
					if (tempLine) {
						map.removeLayer(tempLine)
						setTempLine(null)
					}
				}}
				onOk={() => form.submit()}
				okText='Сохранить'
				cancelText='Отмена'
				width={500}
				footer={[
					<Button key='cancel' onClick={() => setModalVisible(false)}>
						Отмена
					</Button>,
					<Button key='submit' type='primary' onClick={() => form.submit()}>
						<CheckOutlined /> Сохранить метку
					</Button>,
				]}
			>
				<Form
					form={form}
					layout='vertical'
					onFinish={handleFormSubmit}
					initialValues={{
						type: 'temporary',
						category: 'branches',
					}}
				>
					<Form.Item name='type' label='Тип метки' rules={[{ required: true }]}>
						<Radio.Group>
							<Radio value='permanent'>Постоянная</Radio>
							<Radio value='temporary'>Временная (24ч)</Radio>
						</Radio.Group>
					</Form.Item>

					<Form.Item
						name='category'
						label='Что на трассе?'
						rules={[{ required: true }]}
					>
						<Select placeholder='Выберите тип'>
							{categories.map(cat => (
								<Option key={cat.value} value={cat.value}>
									<span style={{ marginRight: 8 }}>{cat.icon}</span>
									{cat.label}
								</Option>
							))}
						</Select>
					</Form.Item>

					<Form.Item name='description' label='Описание (необязательно)'>
						<TextArea
							placeholder="Например: 'глубокий снег на повороте' или 'много веток после вчерашнего ветра'"
							rows={3}
						/>
					</Form.Item>

					<div className={styles.coordinatesInfo}>
						{currentLine.length > 0 ? (
							<p>
								📏 Участок: <strong>{currentLine.length}</strong> точек
							</p>
						) : clickPosition ? (
							<p>
								📍 Точка: {clickPosition.lat.toFixed(6)},{' '}
								{clickPosition.lng.toFixed(6)}
							</p>
						) : null}
					</div>
				</Form>
			</Modal>
		</>
	)
}

export default MapClickMenu
