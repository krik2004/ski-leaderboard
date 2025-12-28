import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import EditTimeForm from './EditTimeForm'

export default function Leaderboard({ times, user, onTimeUpdated }) {
	const [anonymousNumbers, setAnonymousNumbers] = useState({})
	const [userVisibility, setUserVisibility] = useState('public')
	const [skierProfiles, setSkierProfiles] = useState({})
	// Определяем, мобильное ли устройство
	const [isMobile, setIsMobile] = useState(false)

	const [editingTime, setEditingTime] = useState(null)
	const [showEditForm, setShowEditForm] = useState(false)

	const [isLoading, setIsLoading] = useState(false)
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 768)
		}

		checkMobile()
		window.addEventListener('resize', checkMobile)

		return () => window.removeEventListener('resize', checkMobile)
	}, [])
	// Загружаем настройки видимости всех пользователей
	useEffect(() => {
		async function loadProfiles() {
			if (times.length === 0) return

			// Собираем все ID пользователей из заездов
			const userIds = [...new Set(times.map(time => time.user_id))]

			const { data: profiles } = await supabase
				.from('profiles')
				.select('id, username, visibility_preference')
				.in('id', userIds)

			if (profiles) {
				// Создаем объект для быстрого доступа
				const profilesMap = {}
				profiles.forEach(profile => {
					profilesMap[profile.id] = profile
				})
				setSkierProfiles(profilesMap)

				// Генерируем номера для анонимных пользователей
				const anonymousMap = {}
				let counter = 1

				// Сортируем анонимных пользователей по времени первого заезда
				const anonymousUsers = profiles
					.filter(p => p.visibility_preference === 'anonymous')
					.map(p => {
						const userTimes = times.filter(t => t.user_id === p.id)
						const bestTime =
							userTimes.length > 0
								? Math.min(...userTimes.map(t => t.time_seconds))
								: Infinity
						return { id: p.id, bestTime }
					})
					.sort((a, b) => a.bestTime - b.bestTime)

				// Присваиваем номера в порядке лучшего времени
				anonymousUsers.forEach((user, index) => {
					anonymousMap[user.id] = index + 1
				})

				setAnonymousNumbers(anonymousMap)
			}
		}

		loadProfiles()
	}, [times])

	// Загружаем настройки текущего пользователя
	useEffect(() => {
		async function loadCurrentUserVisibility() {
			if (user) {
				const { data } = await supabase
					.from('profiles')
					.select('visibility_preference')
					.eq('id', user.id)
					.single()

				if (data) {
					setUserVisibility(data.visibility_preference || 'public')
				}
			}
		}
		loadCurrentUserVisibility()
	}, [user])

	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	// Функция для получения отображаемого имени
	function getDisplayName(time) {
		const profile = skierProfiles[time.user_id]
		const isCurrentUser = user && time.user_id === user.id

		// Если это текущий пользователь и у него приватный режим
		if (isCurrentUser && userVisibility === 'private') {
			return 'Вы'
		}

		// Если пользователь анонимный
		if (profile?.visibility_preference === 'anonymous') {
			const number = anonymousNumbers[time.user_id] || '?'
			return `Лыжник №${number}`
		}

		// Возвращаем имя из профиля или из заезда
		return profile?.username || time.user_name || 'Гость'
	}

	// Фильтруем заезды в зависимости от настроек текущего пользователя
	const filteredTimes = times.filter(time => {
		if (!user) return true // Неаутентифицированные видят все

		const profile = skierProfiles[time.user_id]
		const isCurrentUser = time.user_id === user.id

		// Если это текущий пользователь - всегда показываем
		if (isCurrentUser) return true

		// Если пользователь хочет видеть только себя - скрываем других
		if (userVisibility === 'private') return false

		// Показываем всех остальных
		return true
	})
	// Функция для открытия формы редактирования
	function handleEditTime(time) {
		setEditingTime(time)
		setShowEditForm(true)
	}

	// Функция для обновления заезда
	async function handleUpdateTime(updatedData) {
		try {
			const { error } = await supabase
				.from('lap_times')
				.update(updatedData)
				.eq('id', editingTime.id)

			if (error) throw error

			// Успешное обновление - закрываем форму
			setShowEditForm(false)
			setEditingTime(null)

			// Перезагружаем страницу для обновления данных
			window.location.reload()
		} catch (error) {
			console.error('Ошибка обновления:', error)
			alert('❌ Ошибка при обновлении заезда: ' + error.message)
		}
	}
	async function handleDeleteTime(timeId) {
		if (!confirm('Удалить этот заезд? Это действие нельзя отменить.')) return

		setIsLoading(true)
		try {
			const { error } = await supabase
				.from('lap_times')
				.delete()
				.eq('id', timeId)

			if (error) throw error

			// Обновляем таблицу
			await fetchTimes()
		} catch (error) {
			console.error('Ошибка удаления:', error)
			alert('Ошибка при удалении заезда')
		} finally {
			setIsLoading(false)
		}
	}
	return (
		<div className='leaderboard-card'>
			<h4>🏆 Таблица заездов ЛБК Ангарский (малый, освещенный круг 2,5км)</h4>

			{/* Информация о текущем режиме просмотра */}
			{user && userVisibility === 'private' && (
				<div className='view-mode-info'>
					🔒 Режим просмотра: <strong>Только свои результаты</strong>
				</div>
			)}

			{filteredTimes.length === 0 ? (
				<p className='no-data'>Пока нет заездов. Будьте первым!</p>
			) : (
				<div className='table-container'>
					<table className='leaderboard-table'>
						<thead>
							<tr>
								<th>#</th>
								<th>{isMobile ? 'Имя' : 'Лыжник'}</th>
								<th>Время</th>
								<th>{isMobile ? 'Лыжи' : 'Модель лыж'}</th>
								<th title='Статус подтверждения'>
									{isMobile ? '✓' : 'Статус'}
								</th>
								<th title='Комментарий'>{isMobile ? '💬' : 'Комментарий'}</th>
								<th title='GPX трек'>{isMobile ? '📊' : 'Трек'}</th>
								<th>{isMobile ? 'Дата' : 'Дата заезда'}</th>
							</tr>
						</thead>
						<tbody>
							{filteredTimes.map((time, index) => {
								const isCurrentUser = user && time.user_id === user.id
								const displayName = getDisplayName(time)

								return (
									<tr key={time.id} className={isCurrentUser ? 'my-time' : ''}>
										<td className='position'>{index + 1}</td>
										<td className='skier'>
											<div className='skier-info'>
												<strong>{displayName}</strong>
												{isCurrentUser && <span className='you-label'>вы</span>}
											</div>
										</td>
										<td className='time'>
											<span className='time-badge'>
												{formatTime(time.time_seconds)}
											</span>
										</td>
										<td className='ski-model'>
											{time.ski_model ? (
												<span className='model-badge'>{time.ski_model}</span>
											) : (
												<span className='no-model'>—</span>
											)}
										</td>
										<td className='verification'>
											{time.verified ? (
												<span
													className='verified-badge'
													title='Подтверждено GPX треком'
												>
													✅
												</span>
											) : (
												<span
													className='not-verified'
													title='Нет подтверждающего трека'
												>
													⚠️
												</span>
											)}
										</td>
										<td className='comment' title={time.comment || ''}>
											{time.comment ? (
												<div className='comment-content'>
													{time.comment.length > 30
														? time.comment.substring(0, 30) + '...'
														: time.comment}
												</div>
											) : (
												<span className='no-comment'>—</span>
											)}
										</td>

										<td className='track'>
											<div className='track-actions'>
												{time.gpx_track_url ? (
													<a
														href={time.gpx_track_url}
														target='_blank'
														rel='noopener noreferrer'
														className='track-link'
														title='Просмотреть трек'
													>
														📊
													</a>
												) : (
													<span className='no-track' title='Нет GPX трека'>
														—
													</span>
												)}

												{isCurrentUser && (
													<button
														onClick={() => {
															setEditingTime(time)
															setShowEditForm(true)
														}}
														className='edit-btn'
														title='Редактировать'
													>
														<svg
															width='16'
															height='16'
															viewBox='0 0 24 24'
															fill='none'
															stroke='currentColor'
															strokeWidth='2'
														>
															<path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
															<path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
														</svg>
													</button>
												)}
											</div>
										</td>

										<td className='date compact-date'>
											{time.date
												? new Date(time.date).toLocaleDateString('ru-RU', {
														day: '2-digit',
														month: '2-digit',
														year: '2-digit',
												  })
												: new Date(time.created_at).toLocaleDateString(
														'ru-RU',
														{
															day: '2-digit',
															month: '2-digit',
															year: '2-digit',
														}
												  )}
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}

			<div className='table-footer'>
				<div className='footer-stats'>
					<span>Всего: {filteredTimes.length} заездов</span>
					<span>
						✅ Подтверждено: {filteredTimes.filter(t => t.verified).length}
					</span>
					<span>
						👥 Участников: {new Set(filteredTimes.map(t => t.user_id)).size}
					</span>
					{userVisibility === 'private' && <span>🔒 Режим: только свои</span>}
				</div>
			</div>
			{/* Новый блок: Карта трассы в разработке */}
			<div className='feature-preview'>
				<div className='feature-preview-header'>
					<h6>Карта трассы в разработке</h6>
				</div>
				<div className='feature-preview-content'></div>
			</div>
			{/* Модальное окно редактирования */}
			{showEditForm && editingTime && (
				<EditTimeForm
					time={editingTime}
					onUpdate={handleUpdateTime}
					onDelete={handleDeleteTime}
					onClose={() => {
						setEditingTime(null)
						setShowEditForm(false)
					}}
				/>
			)}
		</div>
	)
}
