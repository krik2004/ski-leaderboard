import React from 'react'
import { Card, Alert, Typography, Button } from 'antd'
import { SplitCellsOutlined, RocketOutlined } from '@ant-design/icons'
import styles from './GpxSplitter.module.css'

const { Title, Text } = Typography

export default function GpxSplitter({ track, onTrackUpdated, user }) {
	if (!track) {
		return null
	}

	return (
		<Card className={styles.container}>
			<div className={styles.header}>
				<Title level={4} className={styles.title}>
					<SplitCellsOutlined /> Разделение на круги
				</Title>
				<Text type='secondary' className={styles.subtitle}>
					Автоматическое определение кругов по эталонному треку
				</Text>
			</div>

			<Alert
				message='Функция в разработке'
				description='Автоматическое разделение трека на круги скоро будет доступно.'
				type='info'
				showIcon
				className={styles.alert}
			/>

			<div className={styles.workflow}>
				<div className={styles.step}>
					<div className={styles.stepNumber}>1</div>
					<div className={styles.stepContent}>
						<Text strong>Загрузите эталонный трек</Text>
						<Text type='secondary'>GPX файл с одним идеальным кругом</Text>
					</div>
				</div>

				<div className={styles.arrow}>→</div>

				<div className={styles.step}>
					<div className={styles.stepNumber}>2</div>
					<div className={styles.stepContent}>
						<Text strong>Анализ трека</Text>
						<Text type='secondary'>
							Автоматическое определение начала/конца кругов
						</Text>
					</div>
				</div>

				<div className={styles.arrow}>→</div>

				<div className={styles.step}>
					<div className={styles.stepNumber}>3</div>
					<div className={styles.stepContent}>
						<Text strong>Выбор зачетного круга</Text>
						<Text type='secondary'>Просмотр всех кругов и выбор лучшего</Text>
					</div>
				</div>
			</div>

			<div className={styles.actions}>
				<Button type='primary' icon={<RocketOutlined />} size='large' disabled>
					Запустить автоматическое разделение
				</Button>
				<Text type='secondary' className={styles.hint}>
					Для выбранного трека: {track.filename}
				</Text>
			</div>
		</Card>
	)
}
