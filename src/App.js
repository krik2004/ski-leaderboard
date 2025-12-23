import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Profile from './components/Profile'
import Leaderboard from './components/Leaderboard'
import AddTimeForm from './components/AddTimeForm'
import './styles/App.css'

function App() {
	const [user, setUser] = useState(null)
	const [times, setTimes] = useState([])
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [activeTab, setActiveTab] = useState('leaderboard')

	useEffect(() => {
		checkUser()
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user || null)
			if (session) loadTimes()
		})
		return () => subscription.unsubscribe()
	}, [])

	async function checkUser() {
		const {
			data: { session },
		} = await supabase.auth.getSession()
		setUser(session?.user || null)
		if (session) loadTimes()
	}

	async function loadTimes() {
		setLoading(true)
		try {
			const { data, error } = await supabase
				.from('lap_times')
				.select('*')
				.order('time_seconds', { ascending: true })
				.limit(20)

			if (error) throw error
			setTimes(data || [])
		} catch (error) {
			console.error('Ошибка загрузки:', error)
			setMessage('Ошибка загрузки данных')
		} finally {
			setLoading(false)
		}
	}

	async function handleLogout() {
		await supabase.auth.signOut()
		setUser(null)
		setTimes([])
		setMessage('Вы вышли из системы')
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
			<div className='header'>
				<h1 className='title'>🎿 Лыжный Рейтинг</h1>
				<div className='user-info'>
					<span className='user-email'>{user.email}</span>
					<button onClick={handleLogout} className='danger-btn'>
						Выйти
					</button>
				</div>
			</div>
			<script
				src='//yastatic.net/weather/i/yandex.weather-medium.js'
				data-forecast='59.9310!30.3609'
			></script>
			.{message && <div className='message-box success'>{message}</div>}
			<script
				src='//yastatic.net/weather/i/yandex.weather-medium.js'
				data-forecast='59.9310!30.3609'
			></script>
			.
			<div className='tabs'>
				<button
					className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
					onClick={() => setActiveTab('leaderboard')}
				>
					🏆 Таблица
				</button>
				<button
					className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
					onClick={() => setActiveTab('profile')}
				>
					👤 Профиль
				</button>
			</div>
			{activeTab === 'leaderboard' ? (
				<>
					<Leaderboard times={times} user={user} />
					<AddTimeForm user={user} onTimeAdded={loadTimes} />
				</>
			) : (
				<Profile user={user} onUpdate={loadTimes} />
			)}
		</div>
	)
}

export default App
