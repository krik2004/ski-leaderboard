import React, { useState } from 'react';
import { Button, Modal, Form, Input, Select, Alert, Radio, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import L from 'leaflet';
import { supabase } from '../../../shared/api/supabase';

const { Option } = Select;
const { TextArea } = Input;

const MarkControls = ({ map, user, onMarkAdded }) => {
	const [drawing, setDrawing] = useState(false)
	const [currentLine, setCurrentLine] = useState([])
	const [modalVisible, setModalVisible] = useState(false)
	const [form] = Form.useForm()

	const categories = [
		{ value: 'dangerous_turn', label: 'Опасный поворот' },
		{ value: 'steep_slope', label: 'Крутой склон' },
		{ value: 'branches', label: 'Ветки на трассе' },
		{ value: 'sand', label: 'Песок/грунт' },
		{ value: 'loggers', label: 'Следы лесовозов' },
		{ value: 'untrodden', label: 'Незатроплено' },
		{ value: 'perfect', label: 'Идеально' },
		{ value: 'other', label: 'Другое' },
	]

	const startDrawing = () => {
		if (!map) return

		setDrawing(true)
		setCurrentLine([])
		console.log('Начало рисования метки')

		// Очищаем временные элементы
		if (window.tempLine) {
			map.removeLayer(window.tempLine)
			window.tempLine = null
		}

		// Новый обработчик клика
		// Новый обработчик клика
		const handleClick = e => {
			e.originalEvent.stopPropagation()
			const { lat, lng } = e.latlng

			console.log(`Добавлена точка:`, lat, lng)

			// Используем функциональное обновление чтобы получить актуальное состояние
			setCurrentLine(prev => {
				const newLine = [...prev, [lat, lng]]

				// Рисуем/обновляем временную линию
				if (window.tempLine) {
					map.removeLayer(window.tempLine)
				}

				if (newLine.length > 1) {
					window.tempLine = L.polyline(newLine, {
						color: '#ff0000',
						weight: 3,
						dashArray: '5, 10',
						opacity: 0.7,
					}).addTo(map)
				}

				console.log(`Точки линии:`, newLine.length, newLine)

				// Обновляем текст в инструкции
				if (window.drawingInstructions) {
					updateInstructionsCount(newLine.length)
				}

				return newLine
			})
		}

		// Обработчик двойного клика для завершения
	// Обработчик двойного клика для завершения
const handleDblClick = (e) => {
  e.originalEvent.stopPropagation();
  
  // Проверяем текущую длину через setTimeout, чтобы состояние обновилось
  setTimeout(() => {
    console.log('Двойной клик - завершение, текущих точек:', currentLine.length);
    
    if (currentLine.length >= 2) {
      finishDrawing();
    } else {
      console.log('Нужно как минимум 2 точки!');
      alert('Нужно как минимум 2 точки! Добавьте еще точки кликами.');
    }
  }, 0);
};

		// Сохраняем текущие обработчики
		const originalClick = map._handlers?.click || []
		const originalDblClick = map._handlers?.dblclick || []

		// Отключаем текущие обработчики
		if (originalClick.length > 0) {
			originalClick.forEach(handler => map.off('click', handler))
		}
		if (originalDblClick.length > 0) {
			originalDblClick.forEach(handler => map.off('dblclick', handler))
		}

		// Вешаем наши обработчики
		map.on('click', handleClick)
		map.on('dblclick', handleDblClick)

		// Сохраняем для восстановления
		window.currentDrawingHandlers = {
			click: handleClick,
			dblclick: handleDblClick,
			originalClick: originalClick,
			originalDblClick: originalDblClick,
		}

		// Показываем инструкцию
		showDrawingInstructions()
	}

	const finishDrawing = () => {
		console.log('Завершение рисования, проверка точек:', currentLine.length)

		if (!map || currentLine.length < 2) {
			console.log('Ошибка: меньше 2 точек')
			if (currentLine.length < 2) {
				alert('Ошибка: нужно как минимум 2 точки для метки!')
			}
			return
		}

		setDrawing(false)

		// Убираем временную линию
		if (window.tempLine) {
			map.removeLayer(window.tempLine)
			window.tempLine = null
		}

		// Восстанавливаем оригинальные обработчики
		if (window.currentDrawingHandlers) {
			map.off('click', window.currentDrawingHandlers.click)
			map.off('dblclick', window.currentDrawingHandlers.dblclick)

			if (window.currentDrawingHandlers.originalClick) {
				window.currentDrawingHandlers.originalClick.forEach(handler => {
					map.on('click', handler)
				})
			}
			if (window.currentDrawingHandlers.originalDblClick) {
				window.currentDrawingHandlers.originalDblClick.forEach(handler => {
					map.on('dblclick', handler)
				})
			}

			window.currentDrawingHandlers = null
		}

		// Убираем инструкцию
		removeDrawingInstructions()

		// Показываем финальную линию
		if (currentLine.length >= 2) {
			const finalLine = L.polyline(currentLine, {
				color: '#52c41a',
				weight: 4,
				opacity: 0.8,
			}).addTo(map)

			// Центрируем карту на линии
			const bounds = finalLine.getBounds()
			map.fitBounds(bounds.pad(0.1))

			setTimeout(() => {
				setModalVisible(true)
			}, 500)
		}
	}

	const cancelDrawing = () => {
		setDrawing(false)
		setCurrentLine([])

		if (window.tempLine) {
			map.removeLayer(window.tempLine)
			window.tempLine = null
		}

		if (window.currentDrawingHandlers) {
			map.off('click', window.currentDrawingHandlers.click)
			map.off('dblclick', window.currentDrawingHandlers.dblclick)

			if (window.currentDrawingHandlers.originalClick) {
				window.currentDrawingHandlers.originalClick.forEach(handler => {
					map.on('click', handler)
				})
			}
			if (window.currentDrawingHandlers.originalDblClick) {
				window.currentDrawingHandlers.originalDblClick.forEach(handler => {
					map.on('dblclick', handler)
				})
			}

			window.currentDrawingHandlers = null
		}

		removeDrawingInstructions()
	}

	// Вспомогательные функции
	const showDrawingInstructions = () => {
		if (!map) return

		removeDrawingInstructions()

		window.drawingInstructions = L.control({ position: 'topright' })
		window.drawingInstructions.onAdd = function () {
			const div = L.DomUtil.create('div', 'drawing-instructions')
			div.innerHTML = `
        <div style="
          background: white; 
          padding: 12px; 
          border-radius: 6px; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 2px solid #1890ff;
          max-width: 200px;
          font-size: 13px;
        ">
          <div style="color: #1890ff; font-weight: bold; margin-bottom: 8px;">
            �� Рисование метки (точек: ${currentLine.length})
          </div>
          <div style="margin-bottom: 6px;">• <strong>Клик</strong> - добавить точку</div>
          <div style="margin-bottom: 8px;">• <strong>Двойной клик</strong> - завершить</div>
          
          <button 
            id="finish-drawing-btn" 
            style="
              width: 100%; 
              padding: 6px; 
              background: #52c41a; 
              color: white; 
              border: none; 
              border-radius: 4px; 
              cursor: pointer;
              font-weight: bold;
              margin-bottom: 5px;
            "
          >
            ✓ Завершить (${currentLine.length} точек)
          </button>
          
          <button 
            id="cancel-drawing-btn" 
            style="
              width: 100%; 
              padding: 6px; 
              background: #ff4d4f; 
              color: white; 
              border: none; 
              border-radius: 4px; 
              cursor: pointer;
              font-weight: bold;
            "
          >
            ✕ Отменить
          </button>
        </div>
      `

			return div
		}
		window.drawingInstructions.addTo(map)

		// Добавляем обработчики кнопок
		setTimeout(() => {
			const finishBtn = document.getElementById('finish-drawing-btn')
			const cancelBtn = document.getElementById('cancel-drawing-btn')

			if (finishBtn) {
				finishBtn.onclick = () => {
					if (currentLine.length >= 2) {
						finishDrawing()
					} else {
						alert(
							'Нужно как минимум 2 точки! Кликните на карту чтобы добавить точки.'
						)
					}
				}
			}

			if (cancelBtn) {
				cancelBtn.onclick = cancelDrawing
			}
		}, 100)
	}

	const removeDrawingInstructions = () => {
		if (window.drawingInstructions) {
			map.removeControl(window.drawingInstructions)
			window.drawingInstructions = null
		}
	}

	const handleFormSubmit = async values => {
		try {
			console.log('Сохранение метки:', values, currentLine)

			if (currentLine.length < 2) {
				message.error('Нужно как минимум 2 точки')
				return
			}

			// Конвертируем координаты в LineString для PostGIS
			const coordinates = currentLine
				.map(coord => `${coord[1]} ${coord[0]}`)
				.join(', ')
			const lineString = `LINESTRING(${coordinates})`

			// Срок жизни для временных меток (24 часа)
			const expiryTime =
				values.type === 'temporary'
					? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
					: null

			console.log('LineString для PostGIS:', lineString)
			console.log('User ID:', user?.id)

			// Сохраняем в базу
			const { data, error } = await supabase
				.from('trail_marks')
				.insert({
					user_id: user?.id,
					type: values.type,
					category: values.category,
					geometry: lineString,
					description: values.description,
					expiry_time: expiryTime,
					created_by_username: user?.email?.split('@')[0] || 'Аноним',
					confirmed_count: 0,
				})
				.select()

			if (error) {
				console.error('Supabase ошибка:', error)
				throw error
			}

			console.log('Метка сохранена в базу:', data)
			message.success('Метка успешно добавлена на карту!')

			// Закрываем и сбрасываем
			setModalVisible(false)
			form.resetFields()
			setCurrentLine([])

			// Обновляем метки на карте
			if (onMarkAdded) {
				onMarkAdded()
			}
		} catch (error) {
			console.error('Полная ошибка сохранения:', error)
			message.error('Ошибка при сохранении метки: ' + error.message)
		}
	}
	// Функция для обновления счетчика точек в инструкции
	const updateInstructionsCount = count => {
		const instructionsDiv = document.querySelector('.drawing-instructions')
		if (instructionsDiv) {
			const countElement = instructionsDiv.querySelector(
				'[style*="color: #1890ff"]'
			)
			if (countElement) {
				countElement.innerHTML = `🎯 Рисование метки (точек: ${count})`
			}

			const finishBtn = document.getElementById('finish-drawing-btn')
			if (finishBtn) {
				finishBtn.innerHTML = `✓ Завершить (${count} точек)`
			}
		}
	}
	return (
		<>
			<div
				style={{
					position: 'absolute',
					bottom: '20px',
					left: '50%',
					transform: 'translateX(-50%)',
					zIndex: 1000,
					display: 'flex',
					gap: '10px',
				}}
			>
				<Button
					type='primary'
					icon={<PlusOutlined />}
					onClick={startDrawing}
					disabled={drawing}
					size='large'
				>
					Добавить метку на трассу
				</Button>

				{drawing && (
					<Button type='default' onClick={cancelDrawing} danger size='large'>
						Отменить рисование
					</Button>
				)}
			</div>

			<Modal
				title='Добавить метку на трассу'
				open={modalVisible}
				onCancel={() => setModalVisible(false)}
				onOk={() => form.submit()}
				okText='Сохранить метку'
				cancelText='Отмена'
				width={500}
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
							<Radio value='permanent'>
								Постоянная (опасный поворот и т.д.)
							</Radio>
							<Radio value='temporary'>Временная (ветки, песок и т.д.)</Radio>
						</Radio.Group>
					</Form.Item>

					<Form.Item
						name='category'
						label='Категория'
						rules={[{ required: true }]}
					>
						<Select placeholder='Выберите категорию'>
							{categories.map(cat => (
								<Option key={cat.value} value={cat.value}>
									{cat.label}
								</Option>
							))}
						</Select>
					</Form.Item>

					<Form.Item name='description' label='Описание'>
						<TextArea
							placeholder='Подробное описание проблемы или ситуации...'
							rows={3}
						/>
					</Form.Item>

					<Alert
						message='Информация'
						description={`Длина участка: ${currentLine.length} точек`}
						type='info'
						showIcon
					/>
				</Form>
			</Modal>
		</>
	)
};

export default MarkControls;
