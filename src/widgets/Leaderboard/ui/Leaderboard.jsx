import React, { useState, useEffect } from 'react'
import { Table, Tag, Tooltip, Button, Modal, message } from 'antd'
import {
	EditOutlined,
	FileTextOutlined,
	EyeOutlined,
	TrophyOutlined,
} from '@ant-design/icons'
import { supabase } from '../../../shared/api/supabase'
import EditTimeForm from '../../../features/lap-times/ui/EditTimeForm'

const Leaderboard = ({ times, user, onTimeUpdated, isMobile = false }) => {
	const [anonymousNumbers, setAnonymousNumbers] = useState({})
	const [userVisibility, setUserVisibility] = useState('public')
	const [skierProfiles, setSkierProfiles] = useState({})
	const [editingTime, setEditingTime] = useState(null)
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const [loading, setLoading] = useState(false)

	// Загружаем настройки видимости всех пользователей
	useEffect(() => {
		async function loadProfiles() {
			if (times.length === 0) return

			const userIds = [...new Set(times.map(time => time.user_id))]

			const { data: profiles } = await supabase
				.from('profiles')
				.select('id, username, visibility_preference')
				.in('id', userIds)

			if (profiles) {
				const profilesMap = {}
				profiles.forEach(profile => {
					profilesMap[profile.id] = profile
				})
				setSkierProfiles(profilesMap)

				// Генерируем номера для анонимных пользователей
				const anonymousMap = {}
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

	// Форматирование времени
	const formatTime = seconds => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	// Получение отображаемого имени
	const getDisplayName = time => {
		const profile = skierProfiles[time.user_id]
		const isCurrentUser = user && time.user_id === user.id

		if (isCurrentUser && userVisibility === 'private') {
			return 'Вы'
		}

		if (profile?.visibility_preference === 'anonymous') {
			const number = anonymousNumbers[time.user_id] || '?'
			return `Лыжник №${number}`
		}

		const name = profile?.username || time.user_name || 'Гость'
		// Ограничиваем длину имени для мобильных
		if (isMobile && name.length > 15) {
			return name.substring(0, 15) + '...'
		}
		return name
	}

	// Фильтрация заездов
	const filteredTimes = times.filter(time => {
		if (!user) return true

		const profile = skierProfiles[time.user_id]
		const isCurrentUser = time.user_id === user.id

		if (isCurrentUser) return true

		if (userVisibility === 'private') return false

		return true
	})

	// Обработка редактирования
	const handleEditClick = time => {
		setEditingTime(time)
		setIsEditModalOpen(true)
	}

	const handleUpdateSuccess = () => {
		setIsEditModalOpen(false)
		setEditingTime(null)
		onTimeUpdated?.()
		message.success('Заезд обновлен')
	}

	const handleDeleteTime = async timeId => {
		Modal.confirm({
			title: 'Удалить заезд?',
			content: 'Это действие нельзя отменить. Удалить заезд?',
			okText: 'Да, удалить',
			cancelText: 'Отмена',
			okType: 'danger',
			async onOk() {
				try {
					setLoading(true)
					const { error } = await supabase
						.from('lap_times')
						.delete()
						.eq('id', timeId)

					if (error) throw error

					message.success('Заезд удален')
					onTimeUpdated?.()
				} catch (error) {
					console.error('Ошибка удаления:', error)
					message.error('Ошибка при удалении заезда')
				} finally {
					setLoading(false)
				}
			},
		})
	}

	// Колонки таблицы
	const columns = [
		{
			title: '#',
			dataIndex: 'position',
			key: 'position',
			width: 40,
			align: 'center',
			render: (_, __, index) => index + 1,
		},
		{
			title: 'Лыжник',
			dataIndex: 'user_id',
			key: 'skier',
			width: isMobile ? 120 : 150,
			render: (userId, record) => {
				const displayName = getDisplayName(record)
				const isCurrentUser = user && userId === user.id

				return (
					<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
						<span
							style={{
								fontWeight: isCurrentUser ? 600 : 400,
								color: isCurrentUser ? '#1890ff' : '#000',
							}}
						>
							{displayName}
						</span>
						{isCurrentUser && (
							<Tag color='blue' style={{ fontSize: '10px', padding: '0 4px' }}>
								вы
							</Tag>
						)}
					</div>
				)
			},
		},
		{
			title: 'Время',
			dataIndex: 'time_seconds',
			key: 'time',
			width: 70,
			align: 'center',
			render: seconds => (
				<Tag color='green' style={{ margin: 0, fontWeight: 600 }}>
					{formatTime(seconds)}
				</Tag>
			),
		},
		{
			title: 'Лыжи',
			dataIndex: 'ski_model',
			key: 'ski_model',
			width: isMobile ? 100 : 120,
			render: model =>
				model ? (
					<Tag color='geekblue' style={{ fontSize: '11px' }}>
						{model.length > 12 ? model.substring(0, 12) + '...' : model}
					</Tag>
				) : (
					<span style={{ color: '#bfbfbf' }}>—</span>
				),
		},
		{
			title: 'Статус',
			dataIndex: 'verified',
			key: 'verified',
			width: 50,
			align: 'center',
			render: verified =>
				verified ? (
					<Tooltip title='Подтверждено GPX'>
						<Tag color='success' style={{ cursor: 'help', margin: 0 }}>
							✓
						</Tag>
					</Tooltip>
				) : (
					<Tooltip title='Без подтверждения'>
						<Tag color='warning' style={{ cursor: 'help', margin: 0 }}>
							?
						</Tag>
					</Tooltip>
				),
		},
		...(!isMobile
			? [
					{
						title: 'Комментарий',
						dataIndex: 'comment',
						key: 'comment',
						width: 150,
						render: comment =>
							comment ? (
								<Tooltip title={comment}>
									<span
										style={{
											display: 'inline-block',
											maxWidth: '100%',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
											cursor: 'help',
										}}
									>
										<FileTextOutlined /> {comment}
									</span>
								</Tooltip>
							) : (
								<span style={{ color: '#bfbfbf' }}>—</span>
							),
					},
			  ]
			: []),
		{
			title: 'Трек',
			dataIndex: 'gpx_track_url',
			key: 'track',
			width: 70,
			align: 'center',
			render: (url, record) => (
				<div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
					{url && (
						<Tooltip title='Просмотреть трек'>
							<Button
								type='text'
								icon={<EyeOutlined />}
								size='small'
								href={url}
								target='_blank'
								rel='noopener noreferrer'
							/>
						</Tooltip>
					)}
					{user && record.user_id === user.id && (
						<Tooltip title='Редактировать'>
							<Button
								type='text'
								icon={<EditOutlined />}
								size='small'
								onClick={() => handleEditClick(record)}
							/>
						</Tooltip>
					)}
				</div>
			),
		},
		{
			title: 'Дата',
			dataIndex: 'date',
			key: 'date',
			width: 90,
			render: date =>
				date ? (
					<span style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
						{new Date(date).toLocaleDateString('ru-RU')}
					</span>
				) : null,
		},
	]

	// Статистика
	const stats = {
		total: filteredTimes.length,
		verified: filteredTimes.filter(t => t.verified).length,
		participants: new Set(filteredTimes.map(t => t.user_id)).size,
	}

	return (
		<div>
			{/* Информация о режиме просмотра */}
			{user && userVisibility === 'private' && (
				<div
					style={{
						background: '#fffbe6',
						border: '1px solid #ffe58f',
						borderRadius: '6px',
						padding: '8px 12px',
						marginBottom: '16px',
						fontSize: '14px',
						color: '#d48806',
					}}
				>
					🔒 Режим просмотра: <strong>Только свои результаты</strong>
				</div>
			)}

			{/* Таблица */}
			<Table
				columns={columns}
				dataSource={filteredTimes}
				rowKey='id'
				pagination={{
					pageSize: 20,
					showSizeChanger: true,
					showQuickJumper: true,
					size: isMobile ? 'small' : 'default',
				}}
				size={isMobile ? 'small' : 'middle'}
				scroll={isMobile ? { x: 600 } : undefined}
				locale={{ emptyText: 'Пока нет заездов. Будьте первым!' }}
				footer={() => (
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							fontSize: '12px',
							color: '#666',
							padding: '8px 0',
						}}
					>
						<span>Всего: {stats.total} заездов</span>
						<span>Подтверждено: {stats.verified}</span>
						<span>Участников: {stats.participants}</span>
					</div>
				)}
			/>



			{/* Модальное окно редактирования */}
			{editingTime && (
				<Modal
					title='Редактировать заезд'
					open={isEditModalOpen}
					onCancel={() => {
						setIsEditModalOpen(false)
						setEditingTime(null)
					}}
					footer={null}
					width={isMobile ? '90%' : 600}
					destroyOnClose
				>
					<EditTimeForm
						time={editingTime}
						onUpdate={handleUpdateSuccess}
						onDelete={handleDeleteTime}
						onClose={() => {
							setIsEditModalOpen(false)
							setEditingTime(null)
						}}
					/>
				</Modal>
			)}
		</div>
	)
}

export default Leaderboard
