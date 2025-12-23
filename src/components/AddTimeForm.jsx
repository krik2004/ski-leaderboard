import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AddTimeForm({ user, onTimeAdded }) {
	const [timeSeconds, setTimeSeconds] = useState('')
	const [comment, setComment] = useState('')
	const [skiModel, setSkiModel] = useState('')
	const [gpxFile, setGpxFile] = useState(null)
	const [isUploading, setIsUploading] = useState(false)
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')

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
			const fileName = `${Date.now()}_${user.id}_${file.name.replace(
				/\s+/g,
				'_'
			)}`

			// Загружаем файл в Supabase Storage
			const { data, error } = await supabase.storage
				.from('gpx-tracks')
				.upload(fileName, file)

			if (error) throw error

			// Получаем публичную ссылку
			const {
				data: { publicUrl },
			} = supabase.storage.from('gpx-tracks').getPublicUrl(fileName)

			// Парсим GPX для получения дистанции и высоты
			const gpxData = await parseGpxFile(file)

			return {
				url: publicUrl,
				distance: gpxData.distance,
				elevation: gpxData.elevation,
			}
		} catch (error) {
			console.error('Ошибка загрузки GPX:', error)
			return null
		} finally {
			setIsUploading(false)
		}
	}

	async function parseGpxFile(file) {
		// Простой парсинг GPX для примера
		return new Promise(resolve => {
			const reader = new FileReader()
			reader.onload = e => {
				const text = e.target.result
				const parser = new DOMParser()
				const xml = parser.parseFromString(text, 'text/xml')

				// Простая логика для примера
				const trackPoints = xml.getElementsByTagName('trkpt')
				let distance = 0
				let elevation = 0

				if (trackPoints.length > 0) {
					// Для примера: предполагаем стандартную дистанцию лыжной трассы
					distance = 5.0 // км
					elevation = 50 // метров
				}

				resolve({ distance, elevation })
			}
			reader.readAsText(file)
		})
	}

	async function handleSubmit(e) {
		e.preventDefault()
		if (!timeSeconds || timeSeconds <= 0) {
			setMessage('Введите время в секундах')
			return
		}

		setLoading(true)
		setMessage('')

		try {
			let gpxData = null
			if (gpxFile) {
				gpxData = await uploadGpxFile(gpxFile)
			}

			const { error } = await supabase.from('lap_times').insert({
				user_id: user.id,
				time_seconds: parseInt(timeSeconds),
				comment: comment || null,
				ski_model: skiModel.trim() || null,
				gpx_track_url: gpxData?.url || null,
				verified: !!gpxData, // Подтвержден если есть GPX
				track_distance: gpxData?.distance || null,
				track_elevation: gpxData?.elevation || null,
				date: new Date().toISOString(),
				user_name: user.email.split('@')[0],
			})

			if (error) throw error

			setMessage(
				gpxData ? '✅ Заезд добавлен с подтверждением!' : '✅ Заезд добавлен!'
			)
			setTimeSeconds('')
			setComment('')
			setSkiModel('')
			setGpxFile(null)
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
					<div className='input-group'>
						<label>Время (секунды) *</label>
						<input
							type='number'
							placeholder='Например: 120'
							value={timeSeconds}
							onChange={e => setTimeSeconds(e.target.value)}
							min='1'
							required
							disabled={loading || isUploading}
						/>
					</div>

					<div className='input-group'>
						<label>Модель лыж</label>
						<input
							type='text'
							value={skiModel}
							onChange={e => setSkiModel(e.target.value)}
							placeholder='Модель лыж'
							disabled={loading || isUploading}
						/>
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
					disabled={loading || isUploading}
				>
					{isUploading
						? '📤 Загрузка трека...'
						: loading
						? '⏳ Добавление...'
						: '🎿 Добавить заезд'}
				</button>

				<div className='verification-info'>
					{gpxFile && (
						<div className='verification-badge'>
							✅ Этот заезд будет отмечен как "Подтвержденный"
						</div>
					)}
				</div>
			</form>
		</div>
	)
}
