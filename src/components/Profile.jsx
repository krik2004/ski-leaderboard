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
		try {
			// 1. Обновляем профиль
			const { error } = await supabase.from('profiles').upsert({
				id: user.id,
				username: username.trim(),
				updated_at: new Date().toISOString(),
			})
			if (error) throw error

			// 2. Обновляем все заезды
			await supabase
				.from('lap_times')
				.update({ user_name: username.trim() })
				.eq('user_id', user.id)

			setMessage('✅ Профиль обновлен!')
			onUpdate?.()
		} catch (error) {
			setMessage('❌ Ошибка: ' + error.message)
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
