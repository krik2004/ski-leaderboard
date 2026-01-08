import React, { useState, useEffect } from 'react'
import {
	Modal,
	Form,
	Input,
	Radio,
	Space,
	Alert,
	Typography,
	message,
} from 'antd'
import { SaveOutlined, WarningOutlined } from '@ant-design/icons'

const { Text } = Typography

const SaveTrackModal = ({
	visible,
	onCancel,
	onSave,
	originalFilename,
	loading = false,
}) => {
	const [form] = Form.useForm()
	const [saveOption, setSaveOption] = useState('new') // 'new' или 'overwrite'

	// Генерируем имя файла с timestamp
	const generateFilename = baseName => {
		if (!baseName) return 'track.gpx'
		const nameWithoutExt = baseName.replace(/\.gpx$/i, '')
		const timestamp = new Date()
			.toLocaleString('ru-RU', {
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
			})
			.replace(/[:\s]/g, '_')
			.replace(/\//g, '-')
		return `${nameWithoutExt}_${timestamp}.gpx`
	}

	// Сбрасываем форму при открытии
	useEffect(() => {
		if (visible) {
			const suggestedName = generateFilename(originalFilename)
			form.setFieldsValue({
				filename: suggestedName,
				description: '',
				saveOption: 'new',
			})
			setSaveOption('new')
		}
	}, [visible, originalFilename, form])

	const handleOptionChange = e => {
		const value = e.target.value
		setSaveOption(value)

		// Если переключились на "новый", обновляем имя файла
		if (value === 'new') {
			const suggestedName = generateFilename(originalFilename)
			form.setFieldValue('filename', suggestedName)
		}
	}

	const handleOk = async () => {
		try {
			const values = await form.validateFields()

			// Убеждаемся, что у файла есть расширение .gpx
			let filename = values.filename || ''
			if (saveOption === 'new') {
				// Добавляем .gpx если его нет
				if (filename && !filename.toLowerCase().endsWith('.gpx')) {
					filename = filename + '.gpx'
				}

				// Если имя пустое, генерируем автоматически
				if (!filename || filename === '.gpx') {
					filename = generateFilename(originalFilename)
				}
			} else {
				// Для перезаписи используем оригинальное имя
				filename = originalFilename || 'track.gpx'
			}

			onSave({
				filename: filename,
				description: values.description || '',
				saveOption: saveOption,
			})
		} catch (error) {
			console.error('Ошибка валидации формы:', error)
		}
	}

	return (
		<Modal
			title={
				<Space>
					<SaveOutlined />
					<span>Сохранение трека</span>
				</Space>
			}
			open={visible}
			onOk={handleOk}
			onCancel={onCancel}
			confirmLoading={loading}
			okText='Сохранить'
			cancelText='Отмена'
			width={500}
			destroyOnClose
		>
			<Form form={form} layout='vertical'>
				<Form.Item name='saveOption'>
					<Radio.Group onChange={handleOptionChange} style={{ width: '100%' }}>
						<Space direction='vertical' style={{ width: '100%' }}>
							<Radio value='new' style={{ display: 'block', marginBottom: 8 }}>
								<Text strong>Сохранить как новый трек</Text>
								<br />
								<Text type='secondary'>
									Создаст копию трека с новым именем файла
								</Text>
							</Radio>

							<Radio value='overwrite' style={{ display: 'block' }}>
								<Text strong>Перезаписать текущий трек</Text>
								<br />
								<Text type='secondary'>
									Заменяет оригинальный файл (старые данные будут потеряны)
								</Text>
							</Radio>
						</Space>
					</Radio.Group>
				</Form.Item>

				{saveOption === 'new' && (
					<Form.Item
						label='Имя файла'
						name='filename'
						rules={[
							{ required: true, message: 'Введите имя файла' },
							{
								pattern: /^[^.]*$/i, // ← ИЗМЕНИЛИ: не проверяем .gpx в поле ввода
								message:
									'Не указывайте расширение .gpx - оно добавится автоматически',
							},
						]}
						help='Расширение .gpx добавится автоматически'
						extra={`Пример: ${generateFilename(originalFilename)}`}
					>
						<Input placeholder='например: my_track_edited' addonAfter='.gpx' />
					</Form.Item>
				)}

				{saveOption === 'overwrite' && (
					<Alert
						message='Внимание!'
						description='Вы перезаписываете оригинальный трек. Это действие нельзя отменить.'
						type='warning'
						showIcon
						icon={<WarningOutlined />}
						style={{ marginBottom: 16 }}
					/>
				)}

				<Form.Item label='Описание (необязательно)' name='description'>
					<Input.TextArea
						rows={3}
						placeholder='Добавьте описание изменений...'
						maxLength={500}
						showCount
					/>
				</Form.Item>
			</Form>
		</Modal>
	)
}

export default SaveTrackModal
