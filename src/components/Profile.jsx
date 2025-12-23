import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Profile({ user, onUpdate }) {
	const [username, setUsername] = useState('')
	const [skiModel, setSkiModel] = useState('')
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')

	useEffect(() => {
		loadProfile()
	}, [user])

	async function loadProfile() {
		const { data } = await supabase
			.from('profiles')
			.select('username, ski_model')
			.eq('id', user.id)
			.single()

		if (data) {
			setUsername(data.username || '')
			setSkiModel(data.ski_model || '')
		}
	}

	async function handleSave(e) {
		e.preventDefault()
		if (!username.trim()) return

		setLoading(true)
		setMessage('')

		try {
			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (!session) throw new Error('Нет сессии')

			const userId = session.user.id

			// Обновляем профиль с моделью лыж
			const { error: profileError } = await supabase.from('profiles').upsert({
				id: userId,
				username: username.trim(),
				ski_model: skiModel.trim() || null,
				updated_at: new Date().toISOString(),
			})

			if (profileError) throw profileError

			// Обновляем ВСЕ заезды пользователя
			const { error: timesError } = await supabase
				.from('lap_times')
				.update({
					user_name: username.trim(),
					ski_model: skiModel.trim() || null,
				})
				.eq('user_id', userId)

			if (timesError) {
				console.log('Ошибка обновления заездов (не критично):', timesError)
			}

			setMessage('✅ Профиль обновлен!')
			onUpdate?.()
		} catch (error) {
			setMessage('❌ Ошибка: ' + error.message)
			console.error('Ошибка:', error)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='profile-card'>
			<h2>👤 Мой профиль</h2>
			{message && <div className='message-box success'>{message}</div>}

			<form onSubmit={handleSave} className='profile-form'>
				<div className='form-group'>
					<label>Имя в таблице *</label>
					<input
						type='text'
						value={username}
						onChange={e => setUsername(e.target.value)}
						placeholder='Ваше имя'
						minLength='2'
						required
						disabled={loading}
					/>
				</div>

				<div className='form-group'>
					<label>Модель лыж (необязательно)</label>
					<input
						type='text'
						value={skiModel}
						onChange={e => setSkiModel(e.target.value)}
						placeholder='Модель ваших лыж'
						disabled={loading}
					/>
				</div>

				<div className='form-group'>
					<label>Email</label>
					<input type='text' value={user.email} disabled className='disabled' />
				</div>
				<div className='profile-info'>
					<h4>📝 Зачем указывать модель лыж?</h4>
					<ul>
						<li>Сравнивать результаты на одинаковых лыжах</li>
						<li>Видеть какие лыжи быстрее на вашей трассе</li>
						<li>Делиться опытом</li>
					</ul>
				</div>
				<button
					type='submit'
					className='primary-btn'
					disabled={loading || !username.trim()}
				>
					{loading ? '💾 Сохранение...' : '💾 Сохранить'}
				</button>
			</form>
		</div>
	)
}
