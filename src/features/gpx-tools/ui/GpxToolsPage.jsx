import React, { useState, useEffect } from 'react'
import { Card, Tabs, Spin, Alert, Typography, Space } from 'antd'
import {
	FileOutlined,
	ScissorOutlined,
	PlayCircleOutlined,
	SwapOutlined,
	SplitCellsOutlined,
} from '@ant-design/icons'
import { supabase } from '../../../shared/api/supabase'
import GpxList from './GpxList'
import GpxEditor from './GpxEditor'
import GpxPlayer from './GpxPlayer'
import GpxComparator from './GpxComparator'
import GpxSplitter from './GpxSplitter'
import styles from './GpxToolsPage.module.css'

const { TabPane } = Tabs
const { Title, Text } = Typography

export default function GpxToolsPage({ user }) {
	const [loading, setLoading] = useState(true)
	const [tracks, setTracks] = useState([])
	const [selectedTrack, setSelectedTrack] = useState(null)
	const [activeTab, setActiveTab] = useState('list')

	useEffect(() => {
		loadUserTracks()
	}, [user])

	async function loadUserTracks() {
		if (!user) {
			setLoading(false)
			return
		}

		try {
			setLoading(true)

			const { data: lapTimes, error } = await supabase
				.from('lap_times')
				.select('id, time_seconds, gpx_track_url, date, ski_model, comment')
				.eq('user_id', user.id)
				.not('gpx_track_url', 'is', null)
				.order('date', { ascending: false })

			if (error) throw error

			const formattedTracks = lapTimes.map(lap => ({
				id: lap.id,
				url: lap.gpx_track_url,
				time: lap.time_seconds,
				date: lap.date,
				skiModel: lap.ski_model,
				comment: lap.comment,
				filename: lap.gpx_track_url?.split('/').pop() || 'track.gpx',
			}))

			setTracks(formattedTracks)
		} catch (error) {
			console.error('Ошибка загрузки треков:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleTrackSelect = track => {
		setSelectedTrack(track)
	}

	const handleTabChange = key => {
		setActiveTab(key)
	}

	if (loading) {
		return (
			<div className={styles.loadingContainer}>
				<Spin size='large' />
				<div className={styles.loadingText}>Загрузка треков...</div>
			</div>
		)
	}

	if (!user) {
		return (
			<Alert
				message='Требуется авторизация'
				description='Для работы с GPX треками необходимо войти в систему.'
				type='warning'
				showIcon
				className={styles.authAlert}
			/>
		)
	}

	return (
		<Card className={styles.container}>
			<Space direction='vertical' size='large' className={styles.content}>
				<div className={styles.header}>
					<Title level={3} className={styles.title}>
						🎯 Инструменты для GPX треков
					</Title>
					<Text type='secondary' className={styles.subtitle}>
						Работайте с вашими лыжными треками: редактируйте, анализируйте,
						сравнивайте
					</Text>
				</div>

				<Tabs
					activeKey={activeTab}
					onChange={handleTabChange}
					type='card'
					size='large'
					className={styles.tabs}
				>
					<TabPane
						tab={
							<span className={styles.tabLabel}>
								<FileOutlined /> Мои треки
							</span>
						}
						key='list'
					>
						<GpxList
							tracks={tracks}
							selectedTrack={selectedTrack}
							onTrackSelect={handleTrackSelect}
							onTrackDeleted={loadUserTracks}
							user={user}
						/>
					</TabPane>

					<TabPane
						tab={
							<span className={styles.tabLabel}>
								<ScissorOutlined /> Редактировать
							</span>
						}
						key='edit'
						disabled={!selectedTrack}
					>
						<GpxEditor
							track={selectedTrack}
							onTrackUpdated={loadUserTracks}
							user={user}
						/>
					</TabPane>

					<TabPane
						tab={
							<span className={styles.tabLabel}>
								<PlayCircleOutlined /> Проигрыватель
							</span>
						}
						key='play'
						disabled={!selectedTrack}
					>
						<GpxPlayer track={selectedTrack} user={user} />
					</TabPane>

					<TabPane
						tab={
							<span className={styles.tabLabel}>
								<SwapOutlined /> Сравнить
							</span>
						}
						key='compare'
						disabled={!selectedTrack}
					>
						<GpxComparator track={selectedTrack} tracks={tracks} user={user} />
					</TabPane>

					<TabPane
						tab={
							<span className={styles.tabLabel}>
								<SplitCellsOutlined /> Разделить на круги
							</span>
						}
						key='split'
						disabled={!selectedTrack}
					>
						<GpxSplitter
							track={selectedTrack}
							onTrackUpdated={loadUserTracks}
							user={user}
						/>
					</TabPane>
				</Tabs>

				{!selectedTrack && activeTab !== 'list' && (
					<Alert
						message='Выберите трек'
						description="Для использования инструментов выберите трек из списка 'Мои треки'"
						type='info'
						showIcon
						className={styles.selectAlert}
					/>
				)}
			</Space>
		</Card>
	)
}
