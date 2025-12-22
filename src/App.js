import React, { useState, useEffect } from 'react'
import supabase from './supabase'

function App() {
	const [user, setUser] = useState(null)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [times, setTimes] = useState([])
	const [isLogin, setIsLogin] = useState(true)

	// Проверяем авторизацию при загрузке
	useEffect(() => {
		checkUser()
	}, [])

	async function checkUser() {
		const {
			data: { session },
		} = await supabase.auth.getSession()
		setUser(session?.user || null)
		if (session) {
			loadTimes()
		}
	}

	async function loadTimes() {
		console.log('Начинаем загрузку данных...')

		try {
			// Правильный JOIN запрос
			const { data, error } = await supabase
				.from('lap_times')
				.select(
					`
        id,
        user_id,
        time_seconds,
        date,
        comment,
        created_at,
        profiles!inner (
          username,
          full_name
        )
      `
				)
				.order('time_seconds', { ascending: true })
				.limit(10)

			console.log('Результат загрузки:', { data, error })

			if (error) {
				console.error('Ошибка загрузки:', error)
				// Fallback: простой запрос без JOIN
				const { data: simpleData, error: simpleError } = await supabase
					.from('lap_times')
					.select('*')
					.order('time_seconds', { ascending: true })
					.limit(10)

				if (simpleError) {
					setMessage('Ошибка загрузки данных')
				} else {
					setTimes(simpleData)
				}
			} else {
				console.log('Данные загружены:', data?.length, 'записей')
				setTimes(data || [])
			}
		} catch (err) {
			console.error('Ошибка:', err)
			setMessage('Ошибка загрузки данных')
		}
	}

	async function handleAuth(e) {
		e.preventDefault()
		setLoading(true)
		setMessage('')

		try {
			if (isLogin) {
				// Вход
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password,
				})
				if (error) throw error
				setMessage('✅ Вход выполнен успешно!')
			} else {
				// Регистрация
				const { error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							username: email.split('@')[0],
						},
					},
				})
				if (error) throw error
				setMessage('✅ Регистрация успешна! Теперь войдите')
				setIsLogin(true)
			}
		} catch (error) {
			setMessage('❌ Ошибка: ' + error.message)
		} finally {
			setLoading(false)
		}

		// После успешной регистрации
		const { error: profileError } = await supabase.from('profiles').upsert({
			id: user.id,
			username: email.split('@')[0],
			full_name: email.split('@')[0],
		})

		if (profileError) {
			console.error('Ошибка создания профиля:', profileError)
		}
	}

	async function handleLogout() {
		await supabase.auth.signOut()
		setUser(null)
		setTimes([])
		setMessage('Вы вышли из системы')
	}

	// Функция форматирования времени
	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	// Если пользователь не авторизован
	if (!user) {
		return (
			<div style={styles.container}>
				<div style={styles.authCard}>
					<h1 style={styles.title}>🎿 Лыжный Рейтинг Друзей</h1>

					{message && <div style={styles.messageBox}>{message}</div>}

					<h2 style={styles.subtitle}>
						{isLogin ? 'Вход в систему' : 'Создание аккаунта'}
					</h2>

					<form onSubmit={handleAuth} style={styles.form}>
						<div style={styles.formGroup}>
							<label style={styles.label}>Email</label>
							<input
								type='email'
								placeholder='ваш@email.com'
								value={email}
								onChange={e => setEmail(e.target.value)}
								style={styles.input}
								required
								disabled={loading}
							/>
						</div>

						<div style={styles.formGroup}>
							<label style={styles.label}>Пароль</label>
							<input
								type='password'
								placeholder='не менее 6 символов'
								value={password}
								onChange={e => setPassword(e.target.value)}
								style={styles.input}
								minLength={6}
								required
								disabled={loading}
							/>
						</div>

						<button
							type='submit'
							style={loading ? styles.buttonLoading : styles.button}
							disabled={loading}
						>
							{loading
								? 'Загрузка...'
								: isLogin
								? 'Войти'
								: 'Зарегистрироваться'}
						</button>
					</form>

					<div style={styles.toggleContainer}>
						<button
							onClick={() => setIsLogin(!isLogin)}
							style={styles.toggleButton}
						>
							{isLogin
								? 'Нет аккаунта? Зарегистрироваться'
								: 'Уже есть аккаунт? Войти'}
						</button>
					</div>
				</div>
			</div>
		)
	}

	// Если пользователь авторизован
	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h1 style={styles.title}>🎿 Лыжный Рейтинг</h1>
				<div style={styles.userInfo}>
					<span style={styles.userEmail}>{user.email}</span>
					<button onClick={handleLogout} style={styles.logoutButton}>
						Выйти
					</button>
				</div>
			</div>

			{message && <div style={styles.messageBox}>{message}</div>}

			<div style={styles.mainCard}>
				<h2 style={styles.cardTitle}>🏆 Таблица лучших заездов</h2>

				{times.length === 0 ? (
					<div style={styles.emptyState}>
						<p style={styles.emptyText}>Пока никто не добавил заездов.</p>
						<p style={styles.emptyText}>Будьте первым!</p>
					</div>
				) : (
					<div style={styles.tableContainer}>
						<table style={styles.table}>
							<thead>
								<tr>
									<th style={styles.th}>Место</th>
									<th style={styles.th}>Лыжник</th>
									<th style={styles.th}>Время</th>
									<th style={styles.th}>Дата</th>
									<th style={styles.th}>Комментарий</th>
								</tr>
							</thead>
							<tbody>
								{times.map((time, index) => (
									<tr key={time.id} style={styles.tr}>
										<td style={styles.td}>{index + 1}</td>
										<td style={styles.td}>
											<td style={styles.td}>
												<td style={styles.td}>
													<strong>{time.user_name || 'Гость'}</strong>
												</td>
											</td>
										</td>
										<td style={styles.td}>
											<span style={styles.timeBadge}>
												{formatTime(time.time_seconds)}
											</span>
										</td>
										<td style={styles.td}>
											{new Date(time.date).toLocaleDateString('ru-RU')}
										</td>
										<td style={styles.td}>{time.comment || '—'}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				<div style={styles.actions}>
					<AddTimeForm user={user} onTimeAdded={loadTimes} />
				</div>
			</div>

			<div style={styles.infoCard}>
				<h3 style={styles.infoTitle}>📋 Как пользоваться</h3>
				<ul style={styles.infoList}>
					<li>1. Добавьте свой заезд (кнопка выше)</li>
					<li>2. Время указывайте в секундах</li>
					<li>3. Можете добавить комментарий о погоде</li>
					<li>4. Таблица автоматически сортируется по времени</li>
				</ul>
			</div>
		</div>
	)
}
// Компонент для добавления заездов
function AddTimeForm({ user, onTimeAdded }) {
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
const { data, error } = await supabase
	.from('lap_times')
	.select(
		`
    *,
    profiles!lap_times_user_id_fkey (*)
  `
	)
	.order('time_seconds', { ascending: true })
	.limit(10)

			if (error) throw error

			setMessage('✅ Заезд добавлен!')
			setTimeSeconds('')
			setComment('')

			// Обновляем таблицу
			onTimeAdded()
		} catch (error) {
			setMessage('❌ Ошибка: ' + error.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div style={addFormStyles.container}>
			<h3 style={addFormStyles.title}>📝 Добавить новый заезд</h3>

			{message && <div style={addFormStyles.message}>{message}</div>}

			<form onSubmit={handleSubmit} style={addFormStyles.form}>
				<div style={addFormStyles.formRow}>
					<div style={addFormStyles.inputGroup}>
						<label style={addFormStyles.label}>Время (секунды)</label>
						<input
							type='number'
							placeholder='Например: 120 (2 минуты)'
							value={timeSeconds}
							onChange={e => setTimeSeconds(e.target.value)}
							style={addFormStyles.input}
							min='1'
							required
							disabled={loading}
						/>
					</div>

					<div style={addFormStyles.inputGroup}>
						<label style={addFormStyles.label}>
							Комментарий (необязательно)
						</label>
						<input
							type='text'
							placeholder='Погода, состояние трассы...'
							value={comment}
							onChange={e => setComment(e.target.value)}
							style={addFormStyles.input}
							disabled={loading}
						/>
					</div>
				</div>

				<button
					type='submit'
					style={loading ? addFormStyles.buttonLoading : addFormStyles.button}
					disabled={loading}
				>
					{loading ? 'Добавляем...' : '➕ Добавить заезд'}
				</button>
			</form>

			<div style={addFormStyles.examples}>
				<p>Примеры времени:</p>
				<div style={addFormStyles.exampleButtons}>
					<button
						type='button'
						onClick={() => setTimeSeconds('60')}
						style={addFormStyles.exampleButton}
					>
						1:00
					</button>
					<button
						type='button'
						onClick={() => setTimeSeconds('90')}
						style={addFormStyles.exampleButton}
					>
						1:30
					</button>
					<button
						type='button'
						onClick={() => setTimeSeconds('120')}
						style={addFormStyles.exampleButton}
					>
						2:00
					</button>
					<button
						type='button'
						onClick={() => setTimeSeconds('150')}
						style={addFormStyles.exampleButton}
					>
						2:30
					</button>
				</div>
			</div>
		</div>
	)
}

// Стили для формы добавления
const addFormStyles = {
	container: {
		backgroundColor: '#f8fafc',
		padding: '25px',
		borderRadius: '10px',
		marginBottom: '20px',
	},
	title: {
		fontSize: '1.4rem',
		color: '#333',
		marginBottom: '20px',
		textAlign: 'center',
	},
	message: {
		backgroundColor: '#dbeafe',
		color: '#1e40af',
		padding: '12px',
		borderRadius: '6px',
		marginBottom: '20px',
		textAlign: 'center',
	},
	form: {
		marginBottom: '20px',
	},
	formRow: {
		display: 'flex',
		gap: '15px',
		marginBottom: '15px',
		flexWrap: 'wrap',
	},
	inputGroup: {
		flex: 1,
		minWidth: '200px',
	},
	label: {
		display: 'block',
		marginBottom: '8px',
		color: '#555',
		fontWeight: '500',
		fontSize: '14px',
	},
	input: {
		width: '100%',
		padding: '12px',
		border: '1px solid #ddd',
		borderRadius: '8px',
		fontSize: '16px',
	},
	button: {
		width: '100%',
		padding: '14px',
		backgroundColor: '#3b82f6',
		color: 'white',
		border: 'none',
		borderRadius: '8px',
		fontSize: '16px',
		fontWeight: '600',
		cursor: 'pointer',
	},
	buttonLoading: {
		width: '100%',
		padding: '14px',
		backgroundColor: '#9ca3af',
		color: 'white',
		border: 'none',
		borderRadius: '8px',
		fontSize: '16px',
		fontWeight: '600',
		cursor: 'not-allowed',
	},
	examples: {
		marginTop: '20px',
		textAlign: 'center',
	},
	exampleButtons: {
		display: 'flex',
		gap: '10px',
		justifyContent: 'center',
		flexWrap: 'wrap',
		marginTop: '10px',
	},
	exampleButton: {
		padding: '8px 16px',
		backgroundColor: '#e5e7eb',
		color: '#374151',
		border: 'none',
		borderRadius: '6px',
		cursor: 'pointer',
		fontSize: '14px',
	},
}
// Стили
const styles = {
	container: {
		minHeight: '100vh',
		background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
		padding: '20px',
		fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
	},
	authCard: {
		maxWidth: '500px',
		margin: '40px auto',
		backgroundColor: 'white',
		borderRadius: '12px',
		padding: '40px',
		boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
	},
	title: {
		color: 'white',
		fontSize: '2.5rem',
		textAlign: 'center',
		marginBottom: '30px',
		fontWeight: 'bold',
	},
	subtitle: {
		fontSize: '1.5rem',
		color: '#333',
		marginBottom: '25px',
		textAlign: 'center',
	},
	messageBox: {
		backgroundColor: '#d1fae5',
		color: '#065f46',
		padding: '15px',
		borderRadius: '8px',
		marginBottom: '25px',
		border: '1px solid #a7f3d0',
		textAlign: 'center',
	},
	form: {
		marginBottom: '25px',
	},
	formGroup: {
		marginBottom: '20px',
	},
	label: {
		display: 'block',
		marginBottom: '8px',
		color: '#555',
		fontWeight: '500',
		fontSize: '14px',
	},
	input: {
		width: '100%',
		padding: '12px 16px',
		border: '1px solid #ddd',
		borderRadius: '8px',
		fontSize: '16px',
	},
	button: {
		width: '100%',
		padding: '14px',
		backgroundColor: '#3b82f6',
		color: 'white',
		border: 'none',
		borderRadius: '8px',
		fontSize: '16px',
		fontWeight: '600',
		cursor: 'pointer',
	},
	buttonLoading: {
		width: '100%',
		padding: '14px',
		backgroundColor: '#9ca3af',
		color: 'white',
		border: 'none',
		borderRadius: '8px',
		fontSize: '16px',
		fontWeight: '600',
		cursor: 'not-allowed',
	},
	toggleContainer: {
		textAlign: 'center',
		marginTop: '20px',
	},
	toggleButton: {
		backgroundColor: 'transparent',
		color: '#3b82f6',
		border: 'none',
		cursor: 'pointer',
		fontSize: '14px',
		textDecoration: 'underline',
	},
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: '30px',
		flexWrap: 'wrap',
		gap: '15px',
	},
	userInfo: {
		display: 'flex',
		alignItems: 'center',
		gap: '15px',
	},
	userEmail: {
		color: 'white',
		fontSize: '14px',
		backgroundColor: 'rgba(255,255,255,0.1)',
		padding: '8px 12px',
		borderRadius: '6px',
	},
	logoutButton: {
		backgroundColor: '#ef4444',
		color: 'white',
		border: 'none',
		padding: '8px 16px',
		borderRadius: '6px',
		cursor: 'pointer',
		fontWeight: '600',
	},
	mainCard: {
		backgroundColor: 'white',
		borderRadius: '12px',
		padding: '30px',
		marginBottom: '20px',
		boxShadow: '0 5px 20px rgba(0,0,0,0.1)',
	},
	cardTitle: {
		fontSize: '1.8rem',
		color: '#333',
		marginBottom: '25px',
		textAlign: 'center',
	},
	emptyState: {
		textAlign: 'center',
		padding: '60px 20px',
	},
	emptyText: {
		color: '#666',
		fontSize: '18px',
		marginBottom: '10px',
	},
	tableContainer: {
		overflowX: 'auto',
	},
	table: {
		width: '100%',
		borderCollapse: 'collapse',
	},
	th: {
		padding: '15px',
		textAlign: 'left',
		backgroundColor: '#f9fafb',
		color: '#555',
		fontWeight: '600',
		borderBottom: '2px solid #e5e7eb',
	},
	tr: {
		borderBottom: '1px solid #f3f4f6',
	},
	td: {
		padding: '15px',
		color: '#333',
	},
	timeBadge: {
		backgroundColor: '#10b981',
		color: 'white',
		padding: '6px 12px',
		borderRadius: '20px',
		fontWeight: '600',
		fontSize: '14px',
	},
	actions: {
		textAlign: 'center',
		marginTop: '30px',
	},
	addButton: {
		backgroundColor: '#10b981',
		color: 'white',
		border: 'none',
		padding: '14px 28px',
		borderRadius: '8px',
		fontSize: '16px',
		fontWeight: '600',
		cursor: 'pointer',
	},
	infoCard: {
		backgroundColor: 'rgba(255,255,255,0.9)',
		borderRadius: '12px',
		padding: '25px',
	},
	infoTitle: {
		fontSize: '1.3rem',
		color: '#333',
		marginBottom: '15px',
	},
	infoList: {
		paddingLeft: '20px',
		color: '#555',
		lineHeight: '1.8',
	},
}

export default App
