import React from 'react'
import { Card, Alert, Typography, Select } from 'antd'
import { SwapOutlined } from '@ant-design/icons'
import styles from './GpxComparator.module.css'

const { Title, Text } = Typography
const { Option } = Select

export default function GpxComparator({ track, tracks, user }) {
	if (!track) {
		return null
	}

	return (
		<Card className={styles.container}>
			<div className={styles.header}>
				<Title level={4} className={styles.title}>
					<SwapOutlined /> Сравнение треков
				</Title>
				<Text type='secondary' className={styles.subtitle}>
					Сравните два трека как в Garmin Connect
				</Text>
			</div>

			<Alert
				message='Функция в разработке'
				description='Сравнение двух треков с отображением отставания в метрах и секундах скоро будет доступно.'
				type='info'
				showIcon
				className={styles.alert}
			/>

			<div className={styles.comparisonSetup}>
				<div className={styles.trackSelection}>
					<div className={styles.trackCard}>
						<Text strong>Трек 1 (основной)</Text>
						<Text>{track.filename}</Text>
						<Text type='secondary'>
							{Math.floor(track.time / 60)}:
							{(track.time % 60).toString().padStart(2, '0')}
						</Text>
					</div>

					<div className={styles.vsLabel}>VS</div>

					<div className={styles.trackCard}>
						<Text strong>Трек 2 (для сравнения)</Text>
						<Select
							placeholder='Выберите трек для сравнения'
							className={styles.select}
							size='middle'
						>
							{tracks
								.filter(t => t.id !== track.id)
								.map(t => (
									<Option key={t.id} value={t.id}>
										{t.filename} ({Math.floor(t.time / 60)}:
										{(t.time % 60).toString().padStart(2, '0')})
									</Option>
								))}
						</Select>
					</div>
				</div>
			</div>

			<div className={styles.statsPreview}>
				<Text type='secondary'>Будут отображаться:</Text>
				<ul className={styles.featuresList}>
					<li>Две движущиеся точки на карте</li>
					<li>Отставание в метрах и секундах</li>
					<li>Совмещенные графики скорости/высоты</li>
					<li>Анализ различий на ключевых участках</li>
				</ul>
			</div>
		</Card>
	)
}
