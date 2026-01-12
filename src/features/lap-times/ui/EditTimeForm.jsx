import React, { useState, useEffect } from 'react'
import {
	Modal,
	Form,
	Input,
	InputNumber,
	DatePicker,
	Button,
	Upload,
	message,
	Spin,
	Alert,
	Typography,
	Space,
	Popconfirm,
} from 'antd'
import {
	UploadOutlined,
	DeleteOutlined,
	CloseOutlined,
	SaveOutlined,
	FileTextOutlined,
	EyeOutlined,
} from '@ant-design/icons'
import { supabase } from '../../../shared/api/supabase'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Text } = Typography

export default function EditTimeForm({ time, onUpdate, onClose, onDelete }) {
	const [form] = Form.useForm()
	const [loading, setLoading] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [deletingFile, setDeletingFile] = useState(false)
	const [fileList, setFileList] = useState([])
	const [gpxData, setGpxData] = useState(null)

	// Инициализация формы данными заезда
	useEffect(() => {
		if (time) {
			const totalSeconds = time.time_seconds
			const mins = Math.floor(totalSeconds / 60)
			const secs = totalSeconds % 60

			form.setFieldsValue({
				minutes: mins,
				seconds: secs,
				date: time.date ? dayjs(time.date) : dayjs(),
				skiModel: time.ski_model || '',
				comment: time.comment || '',
			})

			if (time.gpx_track_url) {
				setGpxData({
					url: time.gpx_track_url,
					name: time.gpx_track_url.split('/').pop(),
				})
			}
		}
	}, [time, form])


	// отладка

	useEffect(() => {
		if (time) {
			console.log('Исходные данные заезда:', time)
			console.log('Тип поля date:', typeof time.date)
			console.log('Значение date:', time.date)

			const totalSeconds = time.time_seconds
			const mins = Math.floor(totalSeconds / 60)
			const secs = totalSeconds % 60

			// Парсим дату из базы данных
			let dateValue
			if (time.date) {
				// Пробуем разные форматы
				try {
					dateValue = dayjs(time.date)
					console.log('Дата распарсена как:', dateValue.format())
				} catch (e) {
					console.error('Ошибка парсинга даты:', e)
					dateValue = dayjs()
				}
			} else {
				dateValue = dayjs()
			}

			form.setFieldsValue({
				minutes: mins,
				seconds: secs,
				date: dateValue,
				skiModel: time.ski_model || '',
				comment: time.comment || '',
			})
		}
	}, [time, form])
	// Функция для транслитерации
	const transliterate = text => {
		const ru = {
			а: 'a',
			б: 'b',
			в: 'v',
			г: 'g',
			д: 'd',
			е: 'e',
			ё: 'yo',
			ж: 'zh',
			з: 'z',
			и: 'i',
			й: 'y',
			к: 'k',
			л: 'l',
			м: 'm',
			н: 'n',
			о: 'o',
			п: 'p',
			р: 'r',
			с: 's',
			т: 't',
			у: 'u',
			ф: 'f',
			х: 'h',
			ц: 'ts',
			ч: 'ch',
			ш: 'sh',
			щ: 'shch',
			ъ: '',
			ы: 'y',
			ь: '',
			э: 'e',
			ю: 'yu',
			я: 'ya',
		}

		return text
			.toLowerCase()
			.split('')
			.map(char => ru[char] || char)
			.join('')
	}

	// Загрузка GPX файла
	const uploadGpxFile = async file => {
		setUploading(true)
		try {
			const originalName = file.name.replace(/\.[^/.]+$/, '')
			const transliteratedName = transliterate(originalName)
			const safeName = transliteratedName
				.replace(/[^a-zA-Z0-9]/g, '_')
				.replace(/_+/g, '_')
				.replace(/^_+|_+$/g, '')

			const fileExt = file.name.split('.').pop().toLowerCase()
			const fileName = `${Date.now()}_${time.user_id}_${
				safeName || 'track'
			}.${fileExt}`
			const finalFileName = safeName
				? fileName
				: `${Date.now()}_${time.user_id}_track.${fileExt}`

			const { error } = await supabase.storage
				.from('gpx-tracks')
				.upload(finalFileName, file)

			if (error) throw error

			const {
				data: { publicUrl },
			} = supabase.storage.from('gpx-tracks').getPublicUrl(finalFileName)

			return { url: publicUrl, name: file.name }
		} catch (error) {
			console.error('Ошибка загрузки GPX:', error)
			message.error('Ошибка загрузки файла: ' + error.message)
			return null
		} finally {
			setUploading(false)
		}
	}

	// Удаление GPX файла
	const deleteGpxFile = async () => {
		if (!time.gpx_track_url) return true

		setDeletingFile(true)
		try {
			const fileName = time.gpx_track_url.split('/').pop()
			const { error } = await supabase.storage
				.from('gpx-tracks')
				.remove([fileName])

			if (error) throw error
			return true
		} catch (error) {
			console.error('Ошибка удаления GPX:', error)
			message.error('Ошибка при удалении трека: ' + error.message)
			return false
		} finally {
			setDeletingFile(false)
		}
	}

	// Обработчик отправки формы
	const handleSubmit = async values => {
		const { minutes, seconds, date, skiModel, comment } = values

		const totalSeconds = (minutes || 0) * 60 + (seconds || 0)

		if (totalSeconds <= 0) {
			message.error('Время должно быть больше 0 секунд')
			return
		}

		setLoading(true)

		try {
			let newGpxData = null
			if (fileList.length > 0) {
				if (time.gpx_track_url) {
					await deleteGpxFile()
				}
				newGpxData = await uploadGpxFile(fileList[0])
			}

			// ФОРМАТИРУЕМ ДАТУ ПРАВИЛЬНО
			let formattedDate
			if (date) {
				// Преобразуем dayjs в ISO строку
				const dayjsDate = dayjs(date)
				// Для Supabase timestamptz используем toISOString()
				formattedDate = dayjsDate.toISOString()
			} else {
				// Если дата не указана, используем текущую дату из записи
				formattedDate = time.date || new Date().toISOString()
			}

			// Формируем обновленные данные
			const updatedData = {
				time_seconds: totalSeconds,
				comment: comment?.trim() || null,
				ski_model: skiModel?.trim() || null,
				date: formattedDate,
				updated_at: new Date().toISOString(),
			}

			// Если загружен новый GPX файл
			if (newGpxData) {
				updatedData.gpx_track_url = newGpxData.url
				updatedData.verified = true
			} else if (!time.gpx_track_url) {
				// Если не было трека и не загружен новый
				updatedData.gpx_track_url = null
				updatedData.verified = false
			}

			console.log('Отправка данных для обновления:', updatedData)

			// Вызываем функцию обновления из родительского компонента
			await onUpdate(updatedData)

			// Сообщение об успехе уже показывается в родительском компоненте
			// Таймаут для закрытия модалки тоже в родительском компоненте
		} catch (error) {
			message.error('Ошибка: ' + error.message)
		} finally {
			setLoading(false)
		}
	}
	
	// Обработчик удаления заезда
	const handleDeleteEntry = async () => {
		try {
			if (time.gpx_track_url) {
				await deleteGpxFile()
			}
			await onDelete(time.id)
			message.success('Заезд удален')
			onClose()
		} catch (error) {
			message.error('Ошибка при удалении: ' + error.message)
		}
	}

	// Настройки загрузки файлов
	const uploadProps = {
		onRemove: () => {
			setFileList([])
		},
		beforeUpload: file => {
			if (!file.name.endsWith('.gpx')) {
				message.error('Пожалуйста, выберите GPX файл')
				return Upload.LIST_IMPORT
			}
			setFileList([file])
			return false
		},
		fileList,
		maxCount: 1,
		accept: '.gpx',
	}

	if (!time) return null

	return (
		<Modal
			title={<span style={{ fontSize: '18px' }}>✏️ Редактировать заезд</span>}
			open={true}
			onCancel={onClose}
			footer={null}
			width={600}
			centered
			maskClosable={false}
			destroyOnClose
		>
			<Spin spinning={loading || uploading || deletingFile}>
				<Form
					form={form}
					layout='vertical'
					onFinish={handleSubmit}
					size='middle'
				>
					<Space direction='vertical' size='middle' style={{ width: '100%' }}>
						{/* Дата и время */}
						<div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
							<Form.Item
								label='Дата заезда'
								name='date'
								rules={[{ required: true, message: 'Выберите дату' }]}
								style={{ flex: 1, minWidth: '150px' }}
							>
								<DatePicker
									format='DD.MM.YYYY'
									style={{ width: '100%' }}
									disabledDate={current =>
										current && current > dayjs().endOf('day')
									}
								/>
							</Form.Item>

							<Form.Item
								label='Минуты'
								name='minutes'
								rules={[
									{ required: true, message: 'Введите минуты' },
									{ type: 'number', min: 0, max: 59, message: 'От 0 до 59' },
								]}
								style={{ width: '100px' }}
							>
								<InputNumber
									min={0}
									max={59}
									placeholder='0'
									style={{ width: '100%' }}
								/>
							</Form.Item>

							<Form.Item
								label='Секунды'
								name='seconds'
								rules={[
									{ required: true, message: 'Введите секунды' },
									{ type: 'number', min: 0, max: 59, message: 'От 0 до 59' },
								]}
								style={{ width: '100px' }}
							>
								<InputNumber
									min={0}
									max={59}
									placeholder='0'
									style={{ width: '100%' }}
								/>
							</Form.Item>
						</div>

						{/* Модель лыж */}
						<Form.Item
							label='Модель лыж'
							name='skiModel'
							extra='Например: Fischer Speedmax'
						>
							<Input placeholder='Производитель Модель' list='ski-brands' />
							<datalist id='ski-brands'>
								<option value='Brados' />
								<option value='Fischer' />
								<option value='Rossignol' />
								<option value='Madshus' />
								<option value='Salomon' />
								<option value='Atomic' />
								<option value='Tisa' />
							</datalist>
						</Form.Item>

						{/* GPX трек */}
						<Form.Item label='GPX трек'>
							<Space
								direction='vertical'
								size='small'
								style={{ width: '100%' }}
							>
								{gpxData && (
									<Alert
										message='Текущий трек'
										description={
											<Space>
												<Text type='secondary'>{gpxData.name}</Text>
												<Button
													type='link'
													icon={<EyeOutlined />}
													href={gpxData.url}
													target='_blank'
													size='small'
												>
													Просмотреть
												</Button>
												<Popconfirm
													title='Удалить GPX трек?'
													description='Это действие нельзя отменить.'
													onConfirm={async () => {
														const success = await deleteGpxFile()
														if (success) {
															setGpxData(null)
															message.success('Трек удален')
														}
													}}
													okText='Да, удалить'
													cancelText='Отмена'
												>
													<Button
														type='link'
														icon={<DeleteOutlined />}
														danger
														size='small'
														loading={deletingFile}
													>
														Удалить
													</Button>
												</Popconfirm>
											</Space>
										}
										type='info'
										showIcon
										style={{ width: '100%' }}
									/>
								)}

								<Upload {...uploadProps}>
									<Button icon={<UploadOutlined />}>
										{fileList.length > 0
											? fileList[0].name
											: 'Загрузить новый GPX'}
									</Button>
								</Upload>

								<Text type='secondary'>
									{uploading
										? 'Загрузка файла...'
										: 'Загрузите новый трек для подтверждения'}
								</Text>
							</Space>
						</Form.Item>

						{/* Комментарий */}
						<Form.Item label='Комментарий' name='comment'>
							<TextArea
								placeholder='Погода, состояние трассы...'
								rows={3}
								maxLength={200}
								showCount
							/>
						</Form.Item>

						{/* Кнопки действий */}
						<Form.Item style={{ marginBottom: 0 }}>
							<Space style={{ width: '100%', justifyContent: 'space-between' }}>
								<Space>
									<Button
										onClick={onClose}
										icon={<CloseOutlined />}
										disabled={loading || uploading || deletingFile}
									>
										Отмена
									</Button>

									<Popconfirm
										title='Удалить заезд?'
										description='Это действие нельзя отменить. Удалить заезд полностью?'
										onConfirm={handleDeleteEntry}
										okText='Да, удалить'
										cancelText='Отмена'
										okType='danger'
									>
										<Button
											danger
											icon={<DeleteOutlined />}
											disabled={loading || uploading || deletingFile}
										>
											Удалить заезд
										</Button>
									</Popconfirm>
								</Space>

								<Button
									type='primary'
									htmlType='submit'
									icon={<SaveOutlined />}
									loading={loading}
									disabled={uploading || deletingFile}
								>
									Сохранить
								</Button>
							</Space>
						</Form.Item>
					</Space>
				</Form>
			</Spin>
		</Modal>
	)
}
