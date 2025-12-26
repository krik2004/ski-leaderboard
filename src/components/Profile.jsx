import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Profile({ user, onUpdate }) {
	const [username, setUsername] = useState('')
	const [skiModel, setSkiModel] = useState('')
	const [visibility, setVisibility] = useState('public') // 'anonymous', 'public'
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')

	useEffect(() => {
		loadProfile()
	}, [user])

	async function loadProfile() {
		const { data } = await supabase
			.from('profiles')
			.select('username, ski_model, visibility_preference')
			.eq('id', user.id)
			.single()

		if (data) {
			setUsername(data.username || '')
			setSkiModel(data.ski_model || '')
			setVisibility(data.visibility_preference || 'public')
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

			// Обновляем профиль
			const { error: profileError } = await supabase.from('profiles').upsert({
				id: userId,
				username: username.trim(),
				ski_model: skiModel.trim() || null,
				visibility_preference: visibility,
				updated_at: new Date().toISOString(),
			})

			if (profileError) throw profileError

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
			<h2>Мой профиль</h2>
			{message && <div className='message-box success'>{message}</div>}

			<form onSubmit={handleSave} className='profile-form'>
				{/* Два поля в одну строку */}
				<div className='form-row compact-profile'>
					<div className='input-group'>
						<label>Имя в таблице</label>
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

					<div className='input-group'>
						<label>Модель лыж (необязательно)</label>
						<input
							type='text'
							value={skiModel}
							onChange={e => setSkiModel(e.target.value)}
							placeholder='Производитель Модель'
							disabled={loading}
							list='ski-brands'
						/>
						<datalist id='ski-brands'>
							<option value='Fischer' />
							<option value='Rossignol' />
							<option value='Madshus' />
							<option value='Salomon' />
							<option value='Atomic' />
							<option value='Pioneer' />
							<option value='Tisa' />
							<option value='Karhu' />
							<option value='Peltonen' />
						</datalist>
					</div>
				</div>

				{/* Настройки видимости - 2 опции */}
				<div className='form-group'>
					<label>Настройки видимости</label>
					<div className='visibility-options'>
						<div className='visibility-option'>
							<label className='radio-label'>
								<input
									type='radio'
									name='visibility'
									value='public'
									checked={visibility === 'public'}
									onChange={e => setVisibility(e.target.value)}
									disabled={loading}
								/>
								<span className='radio-custom'></span>
								<span className='option-title'>Публичное участие</span>
							</label>
							<div className='option-description'>
								• Имя в общем рейтинге
								<br />• Полная конкуренция
							</div>
						</div>

						<div className='visibility-option'>
							<label className='radio-label'>
								<input
									type='radio'
									name='visibility'
									value='anonymous'
									checked={visibility === 'anonymous'}
									onChange={e => setVisibility(e.target.value)}
									disabled={loading}
								/>
								<span className='radio-custom'></span>
								<span className='option-title'>Анонимное участие</span>
							</label>
							<div className='option-description'>
								• В рейтинге как "Лыжник №Х"
								<br />• Вижу своё место
							</div>
						</div>
					</div>
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
