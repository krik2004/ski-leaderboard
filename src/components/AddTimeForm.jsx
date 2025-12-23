import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddTimeForm({ user, onTimeAdded }) {
	const [timeSeconds, setTimeSeconds] = useState('')
	const [comment, setComment] = useState('')
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')

	async function handleSubmit(e) {
		e.preventDefault()
		if (!timeSeconds || timeSeconds <= 0) {
			setMessage('Введите время в секундах')
			return
		}

		setLoading(true)
		setMessage('')

		try {
			const { error } = await supabase.from('lap_times').insert({
				user_id: user.id,
				time_seconds: parseInt(timeSeconds),
				comment: comment || null,
				date: new Date().toISOString(),
				user_name: user.email.split('@')[0],
			})

			if (error) throw error

			setMessage('✅ Заезд добавлен!')
			setTimeSeconds('')
			setComment('')
			onTimeAdded()
		} catch (error) {
			setMessage('❌ Ошибка: ' + error.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='add-form'>
			<h3>📝 Добавить заезд</h3>
			{message && <div className='message-box'>{message}</div>}

			<form onSubmit={handleSubmit}>
				<div className='form-row'>
					<input
						type='number'
						placeholder='Секунды (напр. 120)'
						value={timeSeconds}
						onChange={e => setTimeSeconds(e.target.value)}
						min='1'
						required
						disabled={loading}
					/>
					<input
						type='text'
						placeholder='Комментарий'
						value={comment}
						onChange={e => setComment(e.target.value)}
						disabled={loading}
					/>
				</div>
				<button type='submit' disabled={loading}>
					{loading ? 'Добавление...' : '➕ Добавить'}
				</button>
			</form>
		</div>
	)
}
