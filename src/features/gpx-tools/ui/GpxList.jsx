import React, { useState } from 'react'
import {
	List,
	Card,
	Tag,
	Button,
	Space,
	Typography,
	Alert,
	Popconfirm,
	message,
	Tooltip,
	Empty,
} from 'antd'
import {
	PlayCircleOutlined,
	ScissorOutlined,
	SwapOutlined,
	SplitCellsOutlined,
	EyeOutlined,
	DeleteOutlined,
	DownloadOutlined,
	CheckCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import styles from './GpxList.module.css'

const { Text } = Typography

export default function GpxList({
	tracks,
	selectedTrack,
	onTrackSelect,
	onTrackDeleted,
	user,
}) {
	const [loadingDelete, setLoadingDelete] = useState(null)

	// Форматирование времени
	const formatTime = seconds => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	// Форматирование даты
	const formatDate = dateString => {
		return dayjs(dateString).format('DD.MM.YYYY HH:mm')
	}

	// Удаление трека
	const handleDeleteTrack = async trackId => {
		setLoadingDelete(trackId)
		try {
			// TODO: Удалить из таблицы lap_times
			// TODO: Удалить файл из Storage
			message.success('Трек удален')
			onTrackDeleted?.()
		} catch (error) {
			console.error('Ошибка удаления:', error)
			message.error('Ошибка при удалении трека')
		} finally {
			setLoadingDelete(null)
		}
	}

	// Действия с треком
	const handleActionClick = (action, track, e) => {
		e.stopPropagation()

		switch (action) {
			case 'select':
				onTrackSelect(track)
				break
			case 'view':
				window.open(track.url, '_blank')
				break
			case 'download':
				// Скачивание файла
				const link = document.createElement('a')
				link.href = track.url
				link.download = track.filename
				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)
				break
			case 'edit':
				onTrackSelect(track)
				break
			case 'play':
				onTrackSelect(track)
				break
			case 'compare':
				onTrackSelect(track)
				break
			case 'split':
				onTrackSelect(track)
				break
		}
	}

	if (tracks.length === 0) {
		return (
			<Empty
				image={Empty.PRESENTED_IMAGE_SIMPLE}
				description={
					<div className={styles.emptyContainer}>
						<Text type='secondary'>У вас еще нет загруженных GPX треков</Text>
						<Text type='secondary' className={styles.emptySubtext}>
							Загрузите трек через вкладку "Добавить" в таблице заездов
						</Text>
					</div>
				}
			/>
		)
	}

	return (
		<div className={styles.container}>
			<Alert
				message='Информация'
				description='Выберите трек для работы с инструментами редактирования, проигрывания или сравнения'
				type='info'
				showIcon
				className={styles.infoAlert}
			/>

			<List
				dataSource={tracks}
				renderItem={track => (
					<List.Item key={track.id}>
						<Card
							className={`${styles.trackCard} ${
								selectedTrack?.id === track.id ? styles.selected : ''
							}`}
							onClick={() => onTrackSelect(track)}
						>
							<div className={styles.cardContent}>
								{/* Основная информация */}
								<div className={styles.mainInfo}>
									<div className={styles.trackHeader}>
										<Text strong className={styles.filename}>
											{track.filename}
										</Text>
										{track.verified && (
											<Tooltip title='Подтвержденный трек'>
												<Tag
													icon={<CheckCircleOutlined />}
													color='success'
													className={styles.verifiedTag}
												>
													Подтверждено
												</Tag>
											</Tooltip>
										)}
									</div>

									<div className={styles.metadata}>
										<Space size='large' wrap>
											<div className={styles.metaItem}>
												<Text type='secondary'>Дата:</Text>
												<Text strong className={styles.metaValue}>
													{formatDate(track.date)}
												</Text>
											</div>

											<div className={styles.metaItem}>
												<Text type='secondary'>Время:</Text>
												<Tag color='green' className={styles.timeTag}>
													{formatTime(track.time)}
												</Tag>
											</div>

											{track.skiModel && (
												<div className={styles.metaItem}>
													<Text type='secondary'>Лыжи:</Text>
													<Text strong className={styles.metaValue}>
														{track.skiModel}
													</Text>
												</div>
											)}

											{track.comment && (
												<div className={styles.metaItem}>
													<Text type='secondary'>Комментарий:</Text>
													<Text className={styles.comment}>
														{track.comment}
													</Text>
												</div>
											)}
										</Space>
									</div>
								</div>

								{/* Действия */}
								<div className={styles.actions}>
									<Space wrap>
										<Tooltip title='Просмотреть в новой вкладке'>
											<Button
												icon={<EyeOutlined />}
												size='small'
												onClick={e => handleActionClick('view', track, e)}
											/>
										</Tooltip>

										<Tooltip title='Скачать GPX файл'>
											<Button
												icon={<DownloadOutlined />}
												size='small'
												onClick={e => handleActionClick('download', track, e)}
											/>
										</Tooltip>

										<Tooltip title='Редактировать трек'>
											<Button
												icon={<ScissorOutlined />}
												size='small'
												type={
													selectedTrack?.id === track.id ? 'primary' : 'default'
												}
												onClick={e => handleActionClick('edit', track, e)}
											/>
										</Tooltip>

										<Tooltip title='Проиграть трек'>
											<Button
												icon={<PlayCircleOutlined />}
												size='small'
												onClick={e => handleActionClick('play', track, e)}
											/>
										</Tooltip>

										<Tooltip title='Сравнить с другим'>
											<Button
												icon={<SwapOutlined />}
												size='small'
												onClick={e => handleActionClick('compare', track, e)}
											/>
										</Tooltip>

										<Tooltip title='Разделить на круги'>
											<Button
												icon={<SplitCellsOutlined />}
												size='small'
												onClick={e => handleActionClick('split', track, e)}
											/>
										</Tooltip>

										<Popconfirm
											title='Удалить трек?'
											description='Это действие удалит трек из базы данных и хранилища файлов.'
											onConfirm={() => handleDeleteTrack(track.id)}
											okText='Да, удалить'
											cancelText='Отмена'
											okType='danger'
										>
											<Button
												icon={<DeleteOutlined />}
												size='small'
												danger
												loading={loadingDelete === track.id}
											/>
										</Popconfirm>
									</Space>
								</div>
							</div>
						</Card>
					</List.Item>
				)}
				className={styles.list}
			/>
		</div>
	)
}
