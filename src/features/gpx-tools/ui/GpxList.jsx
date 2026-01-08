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
	EditOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import styles from './GpxList.module.css'
import supabase from '../../../supabase' // ← ПУТЬ МОЖЕТ БЫТЬ ДРУГИМ! Проверьте путь



const { Text } = Typography

export default function GpxList({
	tracks,
	selectedTrack,
	onTrackSelect,
	onTrackDeleted,
	user,
}) {
	const [loadingDelete, setLoadingDelete] = useState(null)
	const [editingTrackId, setEditingTrackId] = useState(null) // ← ДОБАВИТЬ
	const [editName, setEditName] = useState('') // ← ДОБАВИТЬ

	// Функция для начала редактирования
	const startEditing = (track, e) => {
		e?.stopPropagation()
		setEditingTrackId(track.id)
		setEditName(track.filename || '')
	}

	// Функция для сохранения нового имени
	// Функция для сохранения нового имени
	const saveEditName = async track => {
		if (!editName.trim()) {
			message.warning('Введите название трека')
			return
		}

		try {
			// 1. Получаем текущий URL файла из track
			const currentUrl = track.url

			// 2. Извлекаем путь к файлу из URL
			const urlParts = currentUrl.split('/')
			const oldFilePath = urlParts[urlParts.length - 1]

			// 3. Создаем новое имя файла с .gpx
			const newFileName = editName.endsWith('.gpx')
				? editName
				: `${editName}.gpx`
			const newFilePath = oldFilePath.replace(/[^_]*$/, newFileName)

			console.log('Переименование:', {
				old: oldFilePath,
				new: newFilePath,
				trackId: track.id,
			})

			// 4. Копируем файл с новым именем в Storage
			const { data: copyData, error: copyError } = await supabase.storage
				.from('gpx-tracks')
				.copy(oldFilePath, newFilePath)

			if (copyError) throw copyError

			// 5. Получаем новый публичный URL
			const { data: urlData } = supabase.storage
				.from('gpx-tracks')
				.getPublicUrl(newFilePath)

			// 6. Обновляем запись в таблице lap_times
			const { error: updateError } = await supabase
				.from('lap_times')
				.update({
					comment: `Переименован: ${newFileName}`, // Используем comment для хранения инфо
					gpx_track_url: urlData.publicUrl,
					updated_at: new Date().toISOString(),
				})
				.eq('id', track.id)

			if (updateError) throw updateError

			// 7. Удаляем старый файл (опционально)
			// const { error: deleteError } = await supabase.storage
			//   .from('gpx-tracks')
			//   .remove([oldFilePath]);
			// if (deleteError) console.warn('Не удалось удалить старый файл:', deleteError);

			message.success('Название обновлено')
			setEditingTrackId(null)
			onTrackDeleted?.() // Обновляем список
		} catch (error) {
			console.error('Ошибка обновления:', error)
			message.error(`Ошибка при обновлении названия: ${error.message}`)
		}
	}
	// Функция для отмены редактирования
	const cancelEditing = () => {
		setEditingTrackId(null)
		setEditName('')
	}

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
										{editingTrackId === track.id ? (
											// Режим редактирования
											<div className={styles.editContainer}>
												<input
													type='text'
													value={editName}
													onChange={e => setEditName(e.target.value)}
													onKeyDown={e => {
														if (e.key === 'Enter') saveEditName(track)
														if (e.key === 'Escape') cancelEditing()
													}}
													className={styles.nameInput}
													autoFocus
												/>
												<Space className={styles.editButtons}>
													<Button
														size='small'
														type='text'
														onClick={() => saveEditName(track)}
														className={styles.editButton}
														icon={<CheckCircleOutlined />}
													/>
													<Button
														size='small'
														type='text'
														onClick={cancelEditing}
														className={styles.editButton}
														icon={<DeleteOutlined />}
													/>
												</Space>
											</div>
										) : (
											// Обычный режим просмотра
											<>
												<Text strong className={styles.filename}>
													{track.filename}
												</Text>
											</>
										)}

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
										<Tooltip title='Редактировать название'>
											<Button
												size='small'
												onClick={e => startEditing(track, e)}
												icon={<EditOutlined />}
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
