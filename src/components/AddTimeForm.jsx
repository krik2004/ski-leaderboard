import React, { useState, useEffect } from 'react'
import {
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
	Card,
} from 'antd'
import {
	UploadOutlined,
	PlusOutlined,
	CheckCircleOutlined,
	FileTextOutlined,
} from '@ant-design/icons'
import { supabase } from '../../../shared/api/supabase'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Text } = Typography

export default function AddTimeForm({ user, onTimeAdded, isMobile }) {
	const [form] = Form.useForm()
	const [uploading, setUploading] = useState(false)
	const [loading, setLoading] = useState(false)
	const [fileList, setFileList] = useState([])
	const [userProfile, setUserProfile] = useState(null)
	const [autoFilledSkiModel, setAutoFilledSkiModel] = useState('')

	// Устанавливаем текущую дату по умолчанию и загружаем профиль
	useEffect(() => {
		// Устанавливаем текущую дату
		form.setFieldsValue({
			date: dayjs(),
		})

		// Загружаем профиль пользователя для авто-заполнения модели лыж
		async function loadUserProfile() {
			if (user) {
				const { data } = await supabase
					.from('profiles')
					.select('ski_model')
					.eq('id', user.id)
					.single()

				if (data?.ski_model) {
					setAutoFilledSkiModel(data.ski_model)
					form.setFieldsValue({
						skiModel: data.ski_model,
					})
				}
			}
		}

		loadUserProfile()
	}, [user, form])

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
			const fileName = `${Date.now()}_${user.id}_${
				safeName || 'track'
			}.${fileExt}`
			const finalFileName = safeName
				? fileName
				: `${Date.now()}_${user.id}_track.${fileExt}`

			const { error } = await supabase.storage
				.from('gpx-tracks')
				.upload(finalFileName, file)

			if (error) {
				console.error('Ошибка Supabase при загрузке:', error)
				throw error
			}

			const {
				data: { publicUrl },
			} = supabase.storage.from('gpx-tracks').getPublicUrl(finalFileName)

			return { url: publicUrl }
		} catch (error) {
			console.error('Ошибка загрузки GPX:', error)
			message.error('Ошибка загрузки файла: ' + error.message)
			return null
		} finally {
			setUploading(false)
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
			let gpxData = null
			if (fileList.length > 0) {
				gpxData = await uploadGpxFile(fileList[0])
			}

			const dateTime = date ? date.toISOString() : new Date().toISOString()

			const { error } = await supabase.from('lap_times').insert({
				user_id: user.id,
				time_seconds: totalSeconds,
				comment: comment?.trim() || null,
				ski_model: skiModel?.trim() || null,
				gpx_track_url: gpxData?.url || null,
				verified: !!gpxData,
				date: dateTime,
				user_name: user.email.split('@')[0],
			})

			if (error) throw error

			// Успешное добавление
			message.success(
				gpxData ? 'Заезд добавлен с подтверждением!' : 'Заезд добавлен!',
				3
			)

			// Сброс формы
			form.resetFields()
			setFileList([])

			// Восстанавливаем авто-заполненную модель лыж
			if (autoFilledSkiModel) {
				form.setFieldsValue({
					skiModel: autoFilledSkiModel,
				})
			}

			// Устанавливаем текущую дату
			form.setFieldsValue({
				date: dayjs(),
			})

			onTimeAdded?.()
		} catch (error) {
			console.error('Ошибка добавления заезда:', error)
			message.error('Ошибка: ' + error.message)
		} finally {
			setLoading(false)
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

	return (
		<Card
			title={
				<Space>
					<PlusOutlined />
					<span>Добавить новый заезд</span>
				</Space>
			}
			bordered={false}
			style={{ width: '100%' }}
		>
			<Spin spinning={loading || uploading}>
				<Form
					form={form}
					layout='vertical'
					onFinish={handleSubmit}
					size='middle'
					disabled={loading || uploading}
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
							extra={
								autoFilledSkiModel
									? 'Модель из вашего профиля. Можете изменить для этого заезда.'
									: 'Укажите модель лыж для этого заезда'
							}
						>
							<Input
								placeholder='Например: Fischer Speedmax'
								list='ski-models'
							/>
							<datalist id='ski-models'>
								<option value='Brados' />
								<option value='Fischer' />
								<option value='Rossignol' />
								<option value='Madshus' />
								<option value='Salomon' />
								<option value='Atomic' />
								<option value='Tisa' />
							</datalist>
						</Form.Item>

						{/* GPX трек и комментарий */}
						<div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
							<Form.Item
								label='GPX трек (необязательно)'
								style={{ flex: 1, minWidth: '200px' }}
							>
								<Space
									direction='vertical'
									size='small'
									style={{ width: '100%' }}
								>
									<Upload {...uploadProps}>
										<Button icon={<UploadOutlined />}>
											{fileList.length > 0
												? fileList[0].name
												: 'Выберите GPX файл'}
										</Button>
									</Upload>

									<Text type='secondary'>
										{uploading
											? 'Загрузка файла...'
											: 'Загрузите трек для подтверждения заезда'}
									</Text>
								</Space>
							</Form.Item>

							<Form.Item
								label='Комментарий'
								name='comment'
								style={{ flex: 1, minWidth: '200px' }}
							>
								<Input
									placeholder='Погода, состояние трассы...'
									maxLength={100}
								/>
							</Form.Item>
						</div>

						{/* Информация о подтверждении */}
						{fileList.length > 0 && (
							<Alert
								message='Подтверждение заезда'
								description="Этот заезд будет отмечен как 'Подтвержденный' после загрузки GPX трека."
								type='success'
								showIcon
								icon={<CheckCircleOutlined />}
							/>
						)}

						{/* Кнопка отправки */}
						<Form.Item style={{ marginBottom: 0 }}>
							<Button
								type='primary'
								htmlType='submit'
								icon={<PlusOutlined />}
								loading={loading}
								disabled={uploading}
								size='large'
								block={isMobile}
								style={{
									backgroundColor: '#52c41a',
									borderColor: '#52c41a',
									height: '48px',
									fontSize: '16px',
								}}
							>
								{uploading
									? 'Загрузка трека...'
									: loading
									? 'Добавление...'
									: '🎿 Добавить заезд'}
							</Button>
						</Form.Item>

						{/* Подсказки */}
						<Alert
							message='Подсказки'
							description={
								<Space
									direction='vertical'
									size='small'
									style={{ width: '100%' }}
								>
									<Text type='secondary'>
										• GPX файлы подтверждают заезд и добавляют статус
										"Подтвержденный"
									</Text>
									<Text type='secondary'>
										• Модель лыж можно указать для каждого заезда отдельно
									</Text>
									<Text type='secondary'>
										• Комментарий помогает запомнить условия заезда
									</Text>
								</Space>
							}
							type='info'
							showIcon
						/>
					</Space>
				</Form>
			</Spin>
		</Card>
	)
}
