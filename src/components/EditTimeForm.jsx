import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function EditTimeForm({ time, onUpdate, onClose }) {
	const [minutes, setMinutes] = useState('')
	const [seconds, setSeconds] = useState('')
	const [selectedDate, setSelectedDate] = useState('')
	const [comment, setComment] = useState('')
	const [skiModel, setSkiModel] = useState('')
	const [gpxFile, setGpxFile] = useState(null)
	const [isUploading, setIsUploading] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
const [isDeletingEntry, setIsDeletingEntry] = useState(false)
const [showDeleteEntryConfirm, setShowDeleteEntryConfirm] = useState(false)


	// Заполняем форму данными заезда
	useEffect(() => {
		if (time) {
			// Преобразуем секунды в минуты и секунды
			const totalSeconds = time.time_seconds
			const mins = Math.floor(totalSeconds / 60)
			const secs = totalSeconds % 60

			setMinutes(mins.toString())
			setSeconds(secs.toString())
			setSelectedDate(
				time.date
					? time.date.split('T')[0]
					: new Date().toISOString().split('T')[0]
			)
			setComment(time.comment || '')
			setSkiModel(time.ski_model || '')
		}
	}, [time])

	const handleFileChange = e => {
		const file = e.target.files[0]
		if (file && file.name.endsWith('.gpx')) {
			setGpxFile(file)
		} else {
			alert('Пожалуйста, выберите GPX файл')
			e.target.value = ''
		}
	}

	// Функция для извлечения имени файла из URL
	function extractFileNameFromUrl(url) {
		if (!url) return null
		const parts = url.split('/')
		return parts[parts.length - 1]
	}

	// Функция удаления GPX файла из Storage
	async function deleteGpxFile() {
		if (!time.gpx_track_url) return null

		setIsDeleting(true)
		try {
			const fileName = extractFileNameFromUrl(time.gpx_track_url)
			if (!fileName) {
				throw new Error('Не удалось определить имя файла')
			}

			const { error } = await supabase.storage
				.from('gpx-tracks')
				.remove([fileName])

			if (error) throw error

			return true
		} catch (error) {
			console.error('Ошибка удаления GPX:', error)
			setMessage('❌ Ошибка при удалении трека: ' + error.message)
			return false
		} finally {
			setIsDeleting(false)
		}
	}
async function handleDeleteEntry() {
	setIsDeletingEntry(true)
	try {
		// Сначала удаляем GPX файл если есть
		if (time.gpx_track_url) {
			await deleteGpxFile()
		}

		// Закрываем окно подтверждения
		setShowDeleteEntryConfirm(false)

		// Вызываем callback для удаления заезда (нужно добавить в родительский компонент)
		onDelete(time.id)

		setMessage('Заезд удален')
	} catch (error) {
		setMessage('Ошибка при удалении: ' + error.message)
	} finally {
		setIsDeletingEntry(false)
	}
}
	// Обработчик подтверждения удаления
	async function handleDeleteConfirm() {
		setShowDeleteConfirm(false)
		const success = await deleteGpxFile()

		if (success) {
			// Обновляем данные заезда - убираем ссылку на GPX
			const updatedData = {
				...time,
				gpx_track_url: null,
				verified: false,
				updated_at: new Date().toISOString(),
			}

			onUpdate(updatedData)
			setMessage('✅ GPX трек удален!')

			// Обновляем родительский компонент через 2 секунды
			setTimeout(() => {
				onClose()
			}, 2000)
		}
	}

	async function uploadGpxFile(file) {
		if (!file) return null

		setIsUploading(true)
		try {
			const fileName = `${Date.now()}_${time.user_id}_${file.name.replace(
				/\s+/g,
				'_'
			)}`

			const { data, error } = await supabase.storage
				.from('gpx-tracks')
				.upload(fileName, file)

			if (error) throw error

			const {
				data: { publicUrl },
			} = supabase.storage.from('gpx-tracks').getPublicUrl(fileName)

			return { url: publicUrl }
		} catch (error) {
			console.error('Ошибка загрузки GPX:', error)
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
				// Если загружается новый файл и есть старый - удаляем старый
				if (time.gpx_track_url && gpxFile) {
					await deleteGpxFile()
				}
				gpxData = await uploadGpxFile(gpxFile)
			}

			// Формируем обновленные данные
			const updatedData = {
				time_seconds: totalSeconds,
				comment: comment.trim() || null,
				ski_model: skiModel.trim() || null,
				date: selectedDate ? new Date(selectedDate).toISOString() : time.date,
				updated_at: new Date().toISOString(),
			}

			// Если загружен новый GPX файл
			if (gpxData) {
				updatedData.gpx_track_url = gpxData.url
				updatedData.verified = true
			} else if (!time.gpx_track_url) {
				// Если не было трека и не загружен новый
				updatedData.gpx_track_url = null
				updatedData.verified = false
			}
			// Если был трек и не загружен новый - оставляем старый

			// Вызываем функцию обновления из родительского компонента
			onUpdate(updatedData)

			setMessage('✅ Заезд обновлен!')

			// Закрываем форму через 2 секунды
			setTimeout(() => {
				onClose()
			}, 2000)
		} catch (error) {
			setMessage('❌ Ошибка: ' + error.message)
		} finally {
			setLoading(false)
		}
	}

	if (!time) return null

	return (
		<div className='edit-form-modal'>
			<div className='edit-form-overlay' onClick={onClose}></div>
			<div className='edit-form-card'>
				<div className='edit-form-header'>
					<h3>Редактировать заезд</h3>
					<button onClick={onClose} className='close-btn'>
						×
					</button>
				</div>

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
								disabled={loading || isUploading || isDeleting}
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
								disabled={loading || isUploading || isDeleting}
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
								disabled={loading || isUploading || isDeleting}
								className='time-input'
							/>
						</div>
					</div>

					<div className='form-row'>
						<div className='input-group'>
							<label>Модель лыж</label>
							<input
								type='text'
								placeholder='Производитель Модель'
								value={skiModel}
								onChange={e => setSkiModel(e.target.value)}
								disabled={loading || isUploading || isDeleting}
								list='ski-brands'
							/>
							<datalist id='ski-brands'>
								<option value='Brados' />
								<option value='Fischer' />
								<option value='Rossignol' />
								<option value='Madshus' />
								<option value='Salomon' />
								<option value='Atomic' />
								<option value='Tisa' />
							</datalist>
						</div>
					</div>

					<div className='form-row'>
						<div className='input-group'>
							<label>GPX трек</label>
							<div className='file-upload'>
								<label className='file-upload-label'>
									<input
										type='file'
										accept='.gpx'
										onChange={handleFileChange}
										disabled={loading || isUploading || isDeleting}
									/>
									<span className='file-upload-button'>
										{gpxFile ? '📁 ' + gpxFile.name : '📎 Загрузить новый GPX'}
									</span>
								</label>
								{time.gpx_track_url && (
									<div className='current-track-container'>
										<div className='current-track-info'>
											<small>Текущий трек: </small>
											<a
												href={time.gpx_track_url}
												target='_blank'
												rel='noopener noreferrer'
												className='current-track-link'
											>
												📊 Просмотреть
											</a>
										</div>
										<button
											type='button'
											onClick={() => setShowDeleteConfirm(true)}
											className='delete-track-btn'
											disabled={loading || isUploading || isDeleting}
										>
											{isDeleting ? '⏳ Удаление...' : '🗑️ Удалить'}
										</button>
									</div>
								)}
							</div>
							<small className='file-hint'>
								{isUploading
									? 'Загрузка файла...'
									: 'Загрузите новый трек для подтверждения'}
							</small>
						</div>

						<div className='input-group'>
							<label>Комментарий</label>
							<textarea
								placeholder='Погода, состояние трассы...'
								value={comment}
								onChange={e => setComment(e.target.value)}
								disabled={loading || isUploading || isDeleting}
								rows='2'
							/>
						</div>
					</div>

					<div className='form-actions'>
						<button
							type='button'
							onClick={onClose}
							className='cancel-btn'
							disabled={loading || isUploading || isDeleting || isDeletingEntry}
						>
							Отмена
						</button>

						<button
							type='button'
							onClick={() => setShowDeleteEntryConfirm(true)}
							className='delete-entry-btn'
							disabled={loading || isUploading || isDeleting || isDeletingEntry}
						>
							{isDeletingEntry ? 'Удаление...' : 'Удалить заезд'}
						</button>

						<button
							type='submit'
							className='save-btn'
							disabled={
								loading ||
								isUploading ||
								isDeleting ||
								isDeletingEntry ||
								(!minutes && !seconds)
							}
						>
							{loading ? 'Сохранение...' : 'Сохранить'}
						</button>
					</div>
				</form>

				{/* Модальное окно подтверждения удаления */}
				{showDeleteConfirm && (
					<div className='confirm-modal-overlay'>
						<div className='confirm-modal'>
							<h4>Удалить GPX трек?</h4>
							<p>
								Вы уверены, что хотите удалить загруженный GPX файл? Это
								действие нельзя отменить.
							</p>
							<div className='confirm-modal-actions'>
								<button
									type='button'
									onClick={() => setShowDeleteConfirm(false)}
									className='cancel-btn'
									disabled={isDeleting}
								>
									Отмена
								</button>
								<button
									type='button'
									onClick={handleDeleteConfirm}
									className='danger-btn'
									disabled={isDeleting}
								>
									{isDeleting ? 'Удаление...' : 'Да, удалить'}
								</button>
							</div>
						</div>
					</div>
				)}

				{showDeleteEntryConfirm && (
					<div className='confirm-modal-overlay'>
						<div className='confirm-modal'>
							<h4>Удалить заезд?</h4>
							<p>
								Вы уверены, что хотите удалить этот заезд полностью? Это
								действие нельзя отменить.
							</p>
							<div className='confirm-modal-actions'>
								<button
									type='button'
									onClick={() => setShowDeleteEntryConfirm(false)}
									className='cancel-btn'
									disabled={isDeletingEntry}
								>
									Отмена
								</button>
								<button
									type='button'
									onClick={handleDeleteEntry}
									className='danger-btn'
									disabled={isDeletingEntry}
								>
									{isDeletingEntry ? 'Удаление...' : 'Да, удалить'}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
