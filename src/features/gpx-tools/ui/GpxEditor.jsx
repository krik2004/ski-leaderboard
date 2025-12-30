import React from 'react'
import { Card, Alert, Typography } from 'antd'
import { ScissorOutlined } from '@ant-design/icons'
import styles from './GpxEditor.module.css'

const { Title, Text } = Typography

export default function GpxEditor({ track, onTrackUpdated, user }) {
	if (!track) {
		return null
	}

	return (
		<Card className={styles.container}>
			<div className={styles.header}>
				<Title level={4} className={styles.title}>
					<ScissorOutlined /> Редактирование трека
				</Title>
				<Text type='secondary' className={styles.subtitle}>
					{track.filename}
				</Text>
			</div>

			<Alert
				message='Функция в разработке'
				description='Инструмент для обрезки начала и конца трека скоро будет доступен.'
				type='info'
				showIcon
				className={styles.alert}
			/>

			<div className={styles.content}>
				<Text>Выбран трек: {track.filename}</Text>
				<Text>
					Время: {Math.floor(track.time / 60)}:
					{(track.time % 60).toString().padStart(2, '0')}
				</Text>
				<Text>Дата: {new Date(track.date).toLocaleDateString('ru-RU')}</Text>
			</div>
		</Card>
	)
}
