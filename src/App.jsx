import React, { useState, useEffect } from 'react'
import { Layout, Tabs, Button, Card, Spin, message, Modal } from 'antd'
import {
	TrophyOutlined,
	PlusOutlined,
	InfoCircleOutlined,
	UserOutlined,
	LogoutOutlined,
	LoadingOutlined,
	FileOutlined,
} from '@ant-design/icons'
import { supabase } from './shared/api/supabase'
import { TbBeta } from 'react-icons/tb'

// Новые импорты из FSD структуры
import { Auth } from './features/auth'
import { Profile } from './features/profile'
import { AddTimeForm } from './features/lap-times'
import Leaderboard from './widgets/Leaderboard/ui/Leaderboard'
import { About } from './widgets/about'
import { GpxToolsPage } from './features/gpx-tools'
import Map from './widgets/Map'

import { EnvironmentOutlined } from '@ant-design/icons'



import './styles/base.css'
import './styles/components.css'
import './styles/utilities.css'
import './styles/App.css'

// ... остальной код App.jsx (нужно вставить из backup)
import './styles/utilities.css'
import './styles/App.css'

const { Header: AntHeader, Content, Footer } = Layout
const { TabPane } = Tabs

function App() {
	const [user, setUser] = useState(null)
	const [times, setTimes] = useState([])
	const [loading, setLoading] = useState(true)
	const [activeTab, setActiveTab] = useState(() => {
		const saved = localStorage.getItem('ski-track-active-tab')
		return saved || 'leaderboard'
	})
	const [isMobile, setIsMobile] = useState(false)
const [authModalVisible, setAuthModalVisible] = useState(false)

	// Определяем мобильное устройство
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 768)
		}

		checkMobile()
		window.addEventListener('resize', checkMobile)

		return () => window.removeEventListener('resize', checkMobile)
	}, [])

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setUser(session?.user || null)
			setLoading(false)

			// ВОССТАНАВЛИВАЕМ активную вкладку из localStorage
			const savedTab = localStorage.getItem('ski-track-active-tab')
			if (
				savedTab &&
				['leaderboard', 'map', 'add', 'profile', 'about'].includes(savedTab)
			) {
				setActiveTab(savedTab)
			}
		})

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user || null)
		})

		return () => subscription.unsubscribe()
	}, [])

	useEffect(() => {
		// Загружаем заезды ВСЕГДА, даже для гостей
		fetchTimes()
	}, [user]) // Добавляем user в зависимости

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
				style={{
					textAlign: 'center',
					padding: '50px 20px',
					minHeight: '100vh',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
				}}
			>
				<Spin
					indicator={
						<LoadingOutlined style={{ fontSize: 48, color: '#fff' }} spin />
					}
				/>
				<p style={{ marginTop: '20px', color: '#fff' }}>Загрузка...</p>
			</div>
		)
	}
	// Если пользователь не авторизован
	// if (!user) {
	// 	return (
	// 		<div
	// 			style={{
	// 				minHeight: '100vh',
	// 				padding: isMobile ? '10px' : '20px',
	// 				background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	// 				display: 'flex',
	// 				alignItems: 'center',
	// 				justifyContent: 'center',
	// 			}}
	// 		>
	// 			<div
	// 				style={{
	// 					width: '100%',
	// 					maxWidth: '500px',
	// 					padding: isMobile ? '15px' : '30px',
	// 				}}
	// 			>
	// 				<Auth onLoginSuccess={setUser} />
	// 			</div>
	// 		</div>
	// 	)
	// }

	const handleTabChange = key => {
		setActiveTab(key)
		localStorage.setItem('ski-track-active-tab', key)
	}

	return (
		<Layout
			className='layout'
			style={{
				minHeight: '100vh',
				background: isMobile
					? '#fff'
					: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
			}}
		>
			<AntHeader
				style={{
					background: isMobile ? '#fff' : '#fff',
					padding: isMobile ? '0 10px' : '0 20px',
					boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					height: isMobile ? '56px' : '64px',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center' }}>
					<h1
						style={{
							margin: 0,
							fontSize: isMobile ? '16px' : '24px',
							color: isMobile ? '#1890ff' : '#000',
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							maxWidth: isMobile ? '200px' : 'none',
							display: 'flex',
							alignItems: 'baseline', // ← Это важно!
						}}
					>
						<span>ProTreki</span>
						<span
							style={{
								fontSize: isMobile ? '10px' : '12px',
								background: '#1890ff',
								color: 'white',
								padding: '2px 6px',
								borderRadius: '10px',
								marginLeft: '8px',
								fontWeight: 'bold',
								verticalAlign: 'middle',
								lineHeight: 'normal',
							}}
						>
							Beta
						</span>
					</h1>
				</div>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: isMobile ? '6px' : '10px',
					}}
				>
					{user ? (
						// Для авторизованных пользователей
						<>
							<Button
								type='text'
								icon={<UserOutlined />}
								onClick={() => setAuthModalVisible(true)}
								style={{
									display: 'flex',
									alignItems: 'center',
									padding: isMobile ? '4px 8px' : '8px 12px',
									fontSize: isMobile ? '12px' : '14px',
								}}
							>
								{!isMobile && user.email}
							</Button>
							<Button
								type='text'
								icon={<LogoutOutlined />}
								onClick={handleLogout}
								danger
								size={isMobile ? 'small' : 'middle'}
							>
								{!isMobile && 'Выйти'}
							</Button>
						</>
					) : (
						// Для гостей
						<>
							<Button
								type='text'
								icon={<UserOutlined />}
								onClick={() => setActiveTab('profile')}
								style={{
									display: 'flex',
									alignItems: 'center',
									padding: isMobile ? '4px 8px' : '8px 12px',
									fontSize: isMobile ? '12px' : '14px',
								}}
							>
								{!isMobile && 'Гость'}
							</Button>
							<Button
								type='primary'
								onClick={() => setAuthModalVisible(true)}
								size={isMobile ? 'small' : 'middle'}
							>
								Войти
							</Button>
						</>
					)}
				</div>
				<Modal
					title='Авторизация'
					open={authModalVisible}
					onCancel={() => setAuthModalVisible(false)}
					footer={null}
					width={500}
					centered
					destroyOnClose
				>
					<Auth
						onLoginSuccess={userData => {
							setUser(userData)
							setAuthModalVisible(false)
							message.success('Вход выполнен успешно!')
						}}
					/>
				</Modal>
			</AntHeader>

			<Content
				style={{
					padding: isMobile ? '10px' : '20px',
					background: isMobile ? '#fff' : 'transparent',
				}}
			>
				{!isMobile ? (
					<Card
						style={{
							minHeight: 'calc(100vh - 180px)',
							borderRadius: '12px',
							boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
						}}
					>
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
									children: (
										<Leaderboard
											times={times}
											user={user}
											onTimeUpdated={fetchTimes}
										/>
									),
								},
								{
									key: 'tracks', // ← НОВАЯ ВКЛАДКА
									label: (
										<span>
											<FileOutlined /> Треки
										</span>
									),
									children: <GpxToolsPage user={user} />,
								},
								{
									key: 'map',
									label: (
										<span>
											<EnvironmentOutlined /> Карта
										</span>
									),
									children: <Map user={user} />,
								},
								{
									key: 'add',
									label: (
										<span>
											<PlusOutlined /> Добавить
										</span>
									),
									children: (
										<AddTimeForm user={user} onTimeAdded={fetchTimes} />
									),
								},
								{
									key: 'about',
									label: (
										<span>
											<InfoCircleOutlined /> О проекте
										</span>
									),
									children: <About />,
								},
							]}
						/>
					</Card>
				) : (
					// Мобильная версия без лишних оберток
					<div>
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
									key: 'tracks',
									label: (
										<span>
											<FileOutlined /> Треки
										</span>
									),
								},
								{
									key: 'map',
									label: (
										<span>
											<EnvironmentOutlined /> Карта
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
									key: 'profile',
									label: (
										<span>
											<UserOutlined /> Профиль
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
							style={{
								marginBottom: '10px',
							}}
						/>
						<div>
							{activeTab === 'leaderboard' && (
								<Leaderboard
									times={times}
									user={user}
									onTimeUpdated={fetchTimes}
								/>
							)}
							{activeTab === 'tracks' && <GpxToolsPage user={user} />}
							{activeTab === 'map' && <Map user={user} />}
							{activeTab === 'add' && (
								<AddTimeForm user={user} onTimeAdded={fetchTimes} />
							)}
							{activeTab === 'profile' && (
								<Profile user={user} onUpdate={fetchTimes} />
							)}
							{activeTab === 'about' && <About />}
						</div>
					</div>
				)}
			</Content>

			{!isMobile && (
				<Footer
					style={{
						textAlign: 'center',
						background: '#fff',
						padding: '15px 20px',
					}}
				>
					ProTreki ©2026
				</Footer>
			)}
		</Layout>
	)
}

export default App
