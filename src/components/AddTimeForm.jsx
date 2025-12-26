import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AddTimeForm({ user, onTimeAdded }) {
	const [minutes, setMinutes] = useState('')
	const [seconds, setSeconds] = useState('')
	const [selectedDate, setSelectedDate] = useState('')
	const [comment, setComment] = useState('')
	const [skiModel, setSkiModel] = useState('')
	const [gpxFile, setGpxFile] = useState(null)
	const [isUploading, setIsUploading] = useState(false)
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
const [userProfile, setUserProfile] = useState(null)
const [autoFilledSkiModel, setAutoFilledSkiModel] = useState('')

async function handleSubmit(e) {
	e.preventDefault()

	// Проверяем что заполнены минуты и секунды
	if (!minutes && !seconds) {
		setMessage('Введите время заезда')
		return
	}

	// Конвертируем в секунды
	const totalSeconds = parseInt(minutes || 0) * 60 + parseInt(seconds || 0)

	if (totalSeconds <= 0) {
		setMessage('Время должно быть больше 0 секунд')
		return
	}

	setLoading(true)
	setMessage('')

	try {
		let gpxData = null
		if (gpxFile) {
			gpxData = await uploadGpxFile(gpxFile)
		}

		// Формируем полную дату с временем
		const dateTime = selectedDate
			? new Date(selectedDate).toISOString()
			: new Date().toISOString()

		const { error } = await supabase.from('lap_times').insert({
			user_id: user.id,
			time_seconds: totalSeconds,
			comment: comment.trim() || null,
			ski_model: skiModel.trim() || null, // Используем значение из поля формы
			gpx_track_url: gpxData?.url || null,
			verified: !!gpxData,
			date: dateTime,
			user_name: user.email.split('@')[0],
		})

		if (error) throw error

		setMessage(
			gpxData ? '✅ Заезд добавлен с подтверждением!' : '✅ Заезд добавлен!'
		)

		// Сброс полей формы, но оставляем модель лыж если она из профиля
		setMinutes('')
		setSeconds('')
		setComment('')
		setGpxFile(null)
		// Не сбрасываем skiModel если она из профиля
		const today = new Date().toISOString().split('T')[0]
		setSelectedDate(today)
		document.getElementById('gpx-upload').value = ''

		// Автоматически заполняем модель лыж из профиля для следующего заезда
		if (autoFilledSkiModel) {
			setSkiModel(autoFilledSkiModel)
		}

		onTimeAdded()
	} catch (error) {
		setMessage('❌ Ошибка: ' + error.message)
	} finally {
		setLoading(false)
	}
}
	// Устанавливаем текущую дату по умолчанию
	useEffect(() => {
		const today = new Date().toISOString().split('T')[0]
		setSelectedDate(today)
	}, [])

	const handleFileChange = e => {
		const file = e.target.files[0]
		if (file && file.name.endsWith('.gpx')) {
			setGpxFile(file)
		} else {
			alert('Пожалуйста, выберите GPX файл')
			e.target.value = ''
		}
	}

async function uploadGpxFile(file) {
	if (!file) return null

	setIsUploading(true)
	try {
		// Функция для транслитерации кириллицы в латиницу
		function transliterate(text) {
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

		// Получаем имя файла без расширения
		const originalName = file.name.replace(/\.[^/.]+$/, '')
		const transliteratedName = transliterate(originalName)

		// Очищаем от спецсимволов
		const safeName = transliteratedName
			.replace(/[^a-zA-Z0-9]/g, '_') // оставляем только латиницу и цифры
			.replace(/_+/g, '_') // убираем повторяющиеся _
			.replace(/^_+|_+$/g, '') // убираем _ в начале и конце

		// Получаем расширение файла
		const fileExt = file.name.split('.').pop().toLowerCase()

		// Формируем финальное имя файла
		const fileName = `${Date.now()}_${user.id}_${
			safeName || 'track'
		}.${fileExt}`

		// Если имя получилось пустым, используем просто track
		const finalFileName = safeName
			? fileName
			: `${Date.now()}_${user.id}_track.${fileExt}`

		console.log('Оригинальное имя:', file.name)
		console.log('Транслитерированное:', transliteratedName)
		console.log('Безопасное имя:', safeName)
		console.log('Финальное имя:', finalFileName)

		const { data, error } = await supabase.storage
			.from('gpx-tracks')
			.upload(finalFileName, file)

		if (error) {
			console.error('Ошибка Supabase при загрузке:', error)
			throw error
		}

		const {
			data: { publicUrl },
		} = supabase.storage.from('gpx-tracks').getPublicUrl(finalFileName)

		console.log('✅ Файл успешно загружен:', publicUrl)
		return { url: publicUrl }
	} catch (error) {
		console.error('Ошибка загрузки GPX:', error)
		alert('Ошибка загрузки файла: ' + error.message)
		return null
	} finally {
		setIsUploading(false)
	}
}

	async function handleSubmit(e) {
		e.preventDefault()

		// Проверяем что заполнены минуты и секунды
		if (!minutes && !seconds) {
			setMessage('Введите время заезда')
			return
		}

		// Конвертируем в секунды
		const totalSeconds = parseInt(minutes || 0) * 60 + parseInt(seconds || 0)

		if (totalSeconds <= 0) {
			setMessage('Время должно быть больше 0 секунд')
			return
		}

		setLoading(true)
		setMessage('')

		try {
			let gpxData = null
			if (gpxFile) {
				gpxData = await uploadGpxFile(gpxFile)
			}

			// Формируем полную дату с временем (если нужно, можно добавить выбор времени)
			const dateTime = selectedDate
				? new Date(selectedDate).toISOString()
				: new Date().toISOString()

			const { error } = await supabase.from('lap_times').insert({
				user_id: user.id,
				time_seconds: totalSeconds,
				comment: comment || null,
				ski_model: skiModel.trim() || null,
				gpx_track_url: gpxData?.url || null,
				verified: !!gpxData,
				date: dateTime,
				user_name: user.email.split('@')[0],
			})

			if (error) throw error

			setMessage(
				gpxData ? '✅ Заезд добавлен с подтверждением!' : '✅ Заезд добавлен!'
			)

			// Сброс полей формы
			setMinutes('')
			setSeconds('')
			setComment('')
			setSkiModel('')
			setGpxFile(null)
			const today = new Date().toISOString().split('T')[0]
			setSelectedDate(today)
			document.getElementById('gpx-upload').value = ''

			onTimeAdded()
		} catch (error) {
			setMessage('❌ Ошибка: ' + error.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='add-form'>
			<h3>📝 Добавить новый заезд</h3>
			{message && <div className='message-box'>{message}</div>}

			<form onSubmit={handleSubmit}>
	
				<div className='form-row'>
					{/* Поле для выбора даты */}
					<div className='input-group'>
						<label>Дата заезда</label>
						<input
							type='date'
							value={selectedDate}
							onChange={e => setSelectedDate(e.target.value)}
							max={new Date().toISOString().split('T')[0]}
							required
							disabled={loading || isUploading}
						/>
					</div>

					{/* Поля для времени */}
					<div className='input-group'>
						<label>Минуты</label>
						<input
							type='number'
							placeholder='0'
							value={minutes}
							onChange={e => {
								const value = e.target.value
								if (
									value === '' ||
									(parseInt(value) >= 0 && parseInt(value) <= 59)
								) {
									setMinutes(value)
								}
							}}
							min='0'
							max='59'
							disabled={loading || isUploading}
							className='time-input'
						/>
					</div>

					<div className='input-group'>
						<label>Секунды</label>
						<input
							type='number'
							placeholder='0'
							value={seconds}
							onChange={e => {
								const value = e.target.value
								if (
									value === '' ||
									(parseInt(value) >= 0 && parseInt(value) <= 59)
								) {
									setSeconds(value)
								}
							}}
							min='0'
							max='59'
							disabled={loading || isUploading}
							className='time-input'
						/>
					</div>
				</div>

				{/* Новое поле: Модель лыж */}
				<div className='form-row'>
					<div className='input-group'>
	
						<input
							type='text'
							placeholder='Например: Fischer Speedmax'
							value={skiModel}
							onChange={e => setSkiModel(e.target.value)}
							disabled={loading || isUploading}
							list='ski-models'
						/>
						<datalist id='ski-models'>
							<option value='Brados' />
							<option value='Fischer' />
							<option value='Rossignol' />
							<option value='Madshus' />
							<option value='Salomon' />
							<option value='Atomic' />
						</datalist>
						<small className='helper-text'>
							{autoFilledSkiModel
								? 'Модель из вашего профиля. Можете изменить для этого заезда.'
								: 'Укажите модель лыж для этого заезда'}
						</small>
					</div>
				</div>

				<div className='form-row'>
					<div className='input-group'>
						<label>GPX трек (необязательно)</label>
						<div className='file-upload'>
							<label className='file-upload-label'>
								<input
									id='gpx-upload'
									type='file'
									accept='.gpx'
									onChange={handleFileChange}
									disabled={loading || isUploading}
								/>
								<span className='file-upload-button'>
									{gpxFile ? '📁 ' + gpxFile.name : '📎 Выберите GPX файл'}
								</span>
							</label>
							{gpxFile && !isUploading && (
								<button
									type='button'
									onClick={() => {
										setGpxFile(null)
										document.getElementById('gpx-upload').value = ''
									}}
									className='remove-file-btn'
								>
									✕
								</button>
							)}
						</div>
						<small className='file-hint'>
							{isUploading
								? 'Загрузка файла...'
								: 'Загрузите трек для подтверждения заезда'}
						</small>
					</div>

					<div className='input-group'>
						<label>Комментарий</label>
						<input
							type='text'
							placeholder='Погода, состояние трассы...'
							value={comment}
							onChange={e => setComment(e.target.value)}
							disabled={loading || isUploading}
						/>
					</div>
				</div>

				<button
					type='submit'
					className='success-btn'
					disabled={loading || isUploading || (!minutes && !seconds)}
				>
					{isUploading
						? '📤 Загрузка трека...'
						: loading
						? '⏳ Добавление...'
						: '🎿 Добавить заезд'}
				</button>

				{gpxFile && (
					<div className='verification-info'>
						<div className='verification-badge'>
							✅ Этот заезд будет отмечен как "Подтвержденный"
						</div>
					</div>
				)}
			</form>
		</div>
	)
}
