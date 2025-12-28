import React, { useState, useEffect } from 'react'
import { Layout, Tabs, Button, Card, Spin, message } from 'antd'
import {
	TrophyOutlined,
	PlusOutlined,
	InfoCircleOutlined,
	UserOutlined,
	LogoutOutlined,
	LoadingOutlined,
} from '@ant-design/icons'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Profile from './components/Profile'
import AddTimeForm from './components/AddTimeForm'
import Leaderboard from './components/Leaderboard'
import About from './components/About'
import './styles/App.css'

const { Header: AntHeader, Content, Footer } = Layout
const { TabPane } = Tabs

function App() {
	const [user, setUser] = useState(null)
	const [times, setTimes] = useState([])
	const [loading, setLoading] = useState(true)
	const [activeTab, setActiveTab] = useState('leaderboard')

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setUser(session?.user || null)
			setLoading(false)
		})

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

			if (user) {
				const { data: profile } = await supabase
					.from('profiles')
					.select('visibility_preference')
					.eq('id', user.id)
					.single()

				if (profile?.visibility_preference === 'private') {
					setTimes(data.filter(time => time.user_id === user.id))
				} else {
					setTimes(data)
				}
			} else {
				setTimes(data)
			}
		} catch (error) {
			console.error('Ошибка загрузки заездов:', error)
			message.error('Ошибка загрузки заездов')
		}
	}

	async function handleLogout() {
		await supabase.auth.signOut()
		setUser(null)
		message.success('Вы вышли из системы')
	}

	if (loading) {
		return (
			<div
				className='container'
				style={{ textAlign: 'center', padding: '50px' }}
			>
				<Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
				<p style={{ marginTop: '20px' }}>Загрузка...</p>
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

	const handleTabChange = key => {
		setActiveTab(key)
	}

	return (
		<Layout className='layout' style={{ minHeight: '100vh' }}>
			<AntHeader
				style={{
					background: '#fff',
					padding: '0 20px',
					boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center' }}>
					<h1 style={{ margin: 0, fontSize: '24px' }}>🎿 Лыжный Рейтинг</h1>
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
					<Button
						type='text'
						icon={<UserOutlined />}
						onClick={() => setActiveTab('profile')}
						style={{ display: 'flex', alignItems: 'center' }}
					>
						{user.email}
					</Button>
					<Button
						type='text'
						icon={<LogoutOutlined />}
						onClick={handleLogout}
						danger
					>
						Выйти
					</Button>
				</div>
			</AntHeader>

			<Content style={{ padding: '20px' }}>
				<Card style={{ minHeight: 'calc(100vh - 180px)' }}>
					<Tabs
						activeKey={activeTab}
						onChange={handleTabChange}
						items={[
							{
								key: 'leaderboard',
								label: (
									<span>
										<TrophyOutlined /> Таблица
									</span>
								),
							},
							{
								key: 'add',
								label: (
									<span>
										<PlusOutlined /> Добавить
									</span>
								),
							},
							{
								key: 'about',
								label: (
									<span>
										<InfoCircleOutlined /> О проекте
									</span>
								),
							},
						]}
					/>

					<div style={{ marginTop: '20px' }}>
						{activeTab === 'leaderboard' && (
							<Leaderboard
								times={times}
								user={user}
								onTimeUpdated={fetchTimes}
							/>
						)}
						{activeTab === 'add' && (
							<AddTimeForm user={user} onTimeAdded={fetchTimes} />
						)}
						{activeTab === 'profile' && (
							<Profile user={user} onUpdate={fetchTimes} />
						)}
						{activeTab === 'about' && <About />}
					</div>
				</Card>
			</Content>

			<Footer style={{ textAlign: 'center' }}>Лыжный Рейтинг ©2025</Footer>
		</Layout>
	)
}

export default App
