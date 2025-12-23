import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Profile({ user, onUpdate }) {
	const [username, setUsername] = useState('')
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')

	useEffect(() => {
		loadProfile()
	}, [user])

	async function loadProfile() {
		const { data } = await supabase
			.from('profiles')
			.select('username')
			.eq('id', user.id)
			.single()
		if (data?.username) setUsername(data.username)
	}
async function handleSave(e) {
	e.preventDefault()
	if (!username.trim()) return

	setLoading(true)
	setMessage('')

	try {
		// 1. Получаем текущую сессию
		const {
			data: { session },
		} = await supabase.auth.getSession()
		if (!session) throw new Error('Нет активной сессии')

		const userId = session.user.id

		// 2. Проверяем существует ли профиль
		const { data: existingProfile } = await supabase
			.from('profiles')
			.select('id')
			.eq('id', userId)
			.single()

		// 3. Если профиля нет - создаем, если есть - обновляем
		const { error: profileError } = await supabase.from('profiles').upsert({
			id: userId,
			username: username.trim(),
			full_name: username.trim(),
			updated_at: new Date().toISOString(),
			...(existingProfile ? {} : { created_at: new Date().toISOString() }),
		})

		if (profileError) {
			console.error('Ошибка профиля:', profileError)
			throw new Error('Не удалось сохранить профиль: ' + profileError.message)
		}

		// 4. Обновляем заезды
		const { error: timesError } = await supabase
			.from('lap_times')
			.update({ user_name: username.trim() })
			.eq('user_id', userId)

		if (timesError) {
			console.error('Ошибка обновления заездов:', timesError)
			// Не прерываем - главное профиль сохранился
		}

		setMessage('✅ Профиль обновлен!')
		onUpdate?.()
	} catch (error) {
		setMessage('❌ Ошибка: ' + error.message)
		console.error('Полная ошибка:', error)
	} finally {
		setLoading(false)
	}
}

	return (
		<div className='profile-card'>
			<h2>👤 Мой профиль</h2>
			{message && <div className='message-box'>{message}</div>}

			<form onSubmit={handleSave} className='profile-form'>
				<div>
					<label>Имя в таблице:</label>
					<input
						type='text'
						value={username}
						onChange={e => setUsername(e.target.value)}
						placeholder='Придумайте имя'
						minLength='3'
						required
						disabled={loading}
					/>
				</div>

				<div>
					<label>Email:</label>
					<input type='text' value={user.email} disabled className='disabled' />
				</div>

				<button type='submit' disabled={loading}>
					{loading ? 'Сохранение...' : '💾 Сохранить'}
				</button>
			</form>
		</div>
	)
}
