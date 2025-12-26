import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Profile from './components/Profile'
import AddTimeForm from './components/AddTimeForm'
import Leaderboard from './components/Leaderboard'
import About from './components/About'
import './styles/App.css'

function App() {
	const [user, setUser] = useState(null)
	const [times, setTimes] = useState([])
	const [loading, setLoading] = useState(true)
	const [activeTab, setActiveTab] = useState('leaderboard') // 'leaderboard', 'add', 'profile', 'about'

	useEffect(() => {
		// Проверяем аутентификацию
		supabase.auth.getSession().then(({ data: { session } }) => {
			setUser(session?.user || null)
			setLoading(false)
		})

		// Слушаем изменения аутентификации
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user || null)
		})

		return () => subscription.unsubscribe()
	}, [])

	useEffect(() => {
		if (user) {
			fetchTimes()
		}
	}, [user])

	async function fetchTimes() {
		try {
			let query = supabase
				.from('lap_times')
				.select('*')
				.order('time_seconds', { ascending: true })

			const { data, error } = await query

			if (error) throw error

			// Фильтруем результаты в зависимости от настроек пользователя
			if (user) {
				const { data: profile } = await supabase
					.from('profiles')
					.select('visibility_preference')
					.eq('id', user.id)
					.single()

				if (profile?.visibility_preference === 'private') {
					// Показываем только свои результаты
					setTimes(data.filter(time => time.user_id === user.id))
				} else {
					// Показываем все результаты
					setTimes(data)
				}
			} else {
				setTimes(data)
			}
		} catch (error) {
			console.error('Ошибка загрузки заездов:', error)
		}
	}

	async function handleLogout() {
		await supabase.auth.signOut()
		setUser(null)
	}

	if (loading) {
		return (
			<div className='container'>
				<div className='loading'>Загрузка...</div>
			</div>
		)
	}

	if (!user) {
		return (
			<div className='container'>
				<Auth onLoginSuccess={setUser} />
			</div>
		)
	}

	return (
		<div className='container'>
			<header className='header'>
				<div className='header-left'>
					<h1 className='title'>🎿 Лыжный Рейтинг</h1>
				</div>

				<div className='header-right'>
					{user && (
						<>
							<button
								className='email-profile-btn'
								onClick={() => setActiveTab('profile')}
								title='Перейти в профиль'
							>
								<span className='email-display'>{user.email}</span>
								<span className='profile-icon'>👤</span>
							</button>
							<button onClick={handleLogout} className='danger-btn compact'>
								Выйти
							</button>
						</>
					)}
				</div>
			</header>

			<main className='main-card'>
				<div className='tabs'>
					<button
						className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
						onClick={() => setActiveTab('leaderboard')}
					>
						<span className='tab-icon'>🏆</span>
						<span className='tab-text'>Таблица</span>
					</button>
					<button
						className={`tab ${activeTab === 'add' ? 'active' : ''}`}
						onClick={() => setActiveTab('add')}
					>
						<span className='tab-icon'>➕</span>
						<span className='tab-text'>Добавить</span>
					</button>
					<button
						className={`tab ${activeTab === 'about' ? 'active' : ''}`}
						onClick={() => setActiveTab('about')}
					>
						<span className='tab-icon'>ℹ️</span>
						<span className='tab-text'>О проекте</span>
					</button>
				</div>

				{activeTab === 'leaderboard' && (
					<Leaderboard times={times} user={user} />
				)}
				{activeTab === 'add' && (
					<AddTimeForm user={user} onTimeAdded={fetchTimes} />
				)}
				{activeTab === 'profile' && (
					<Profile user={user} onUpdate={fetchTimes} />
				)}
				{activeTab === 'about' && <About />}
			</main>

			<footer className='footer'>
				<p> 2025 Лыжный Рейтинг Друзей</p>
			</footer>
		</div>
	)
}

export default App
