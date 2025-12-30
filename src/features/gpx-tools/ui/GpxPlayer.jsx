import React from 'react'
import { Card, Alert, Typography } from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'
import styles from './GpxPlayer.module.css'

const { Title, Text } = Typography

export default function GpxPlayer({ track, user }) {
	if (!track) {
		return null
	}

	return (
		<Card className={styles.container}>
			<div className={styles.header}>
				<Title level={4} className={styles.title}>
					<PlayCircleOutlined /> Проигрыватель трека
				</Title>
				<Text type='secondary' className={styles.subtitle}>
					{track.filename}
				</Text>
			</div>

			<Alert
				message='Функция в разработке'
				description='Проигрыватель с паузой, статистикой и визуализацией скоро будет доступен.'
				type='info'
				showIcon
				className={styles.alert}
			/>

			<div className={styles.stats}>
				<div className={styles.statItem}>
					<Text type='secondary'>Длительность:</Text>
					<Text strong>
						{Math.floor(track.time / 60)}:
						{(track.time % 60).toString().padStart(2, '0')}
					</Text>
				</div>
				<div className={styles.statItem}>
					<Text type='secondary'>Дата заезда:</Text>
					<Text strong>{new Date(track.date).toLocaleDateString('ru-RU')}</Text>
				</div>
				<div className={styles.statItem}>
					<Text type='secondary'>Модель лыж:</Text>
					<Text strong>{track.skiModel || 'Не указана'}</Text>
				</div>
			</div>
		</Card>
	)
}
