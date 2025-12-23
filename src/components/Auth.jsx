import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth({ onLoginSuccess }) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [isLogin, setIsLogin] = useState(true)

	async function handleAuth(e) {
		e.preventDefault()
		setLoading(true)
		setMessage('')

		try {
			if (isLogin) {
				const { data, error } = await supabase.auth.signInWithPassword({
					email,
					password,
				})
				if (error) throw error
				onLoginSuccess(data.user)
				setMessage('✅ Вход выполнен!')
			} else {
				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: { data: { username: email.split('@')[0] } },
				})
				if (error) throw error

				if (data.user) {
					await supabase.from('profiles').upsert({
						id: data.user.id,
						username: email.split('@')[0] + Math.floor(Math.random() * 1000),
						full_name: email.split('@')[0],
					})
				}

				setMessage('✅ Регистрация успешна! Теперь войдите')
				setIsLogin(true)
			}
		} catch (error) {
			setMessage('❌ Ошибка: ' + error.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='auth-card'>
			<h1>🎿 Лыжный Рейтинг</h1>
			{message && <div className='message-box'>{message}</div>}
			<h2>{isLogin ? 'Вход' : 'Регистрация'}</h2>

			<form onSubmit={handleAuth} className='auth-form'>
				<input
					type='email'
					placeholder='Email'
					value={email}
					onChange={e => setEmail(e.target.value)}
					required
				/>
				<input
					type='password'
					placeholder='Пароль'
					value={password}
					onChange={e => setPassword(e.target.value)}
					minLength='6'
					required
				/>

				<button type='submit' disabled={loading}>
					{loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
				</button>
			</form>

			<button onClick={() => setIsLogin(!isLogin)} className='toggle-btn'>
				{isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
			</button>
		</div>
	)
}
