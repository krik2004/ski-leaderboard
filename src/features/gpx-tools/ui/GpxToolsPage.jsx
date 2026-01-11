//  (Корневой компонент)
// Назначение: Главная страница инструментов GPX

// Функции: Управление вкладками, загрузка треков пользователя, координация между компонентами

// Состояния: Список треков, выбранные треки, активная вкладка

import React, { useState, useEffect } from 'react'
import { Card, Tabs, Spin, Alert, Typography, Space } from 'antd'
import {
	FileOutlined,
	ScissorOutlined,
	PlayCircleOutlined,
	SwapOutlined,
	SplitCellsOutlined,
	RocketOutlined,
} from '@ant-design/icons'
import { supabase } from '../../../shared/api/supabase'
import GpxList from './GpxList'
import GpxEditor from './GpxEditor'
import GpxComparator from './GpxComparator'
import GpxSplitter from './GpxSplitter'
import styles from './GpxToolsPage.module.css'
import GpxUnifiedDemo from './GpxUnifiedDemo'


const { TabPane } = Tabs
const { Title, Text } = Typography

export default function GpxToolsPage({ user }) {
	const [loading, setLoading] = useState(true)
	const [tracks, setTracks] = useState([])
	const [selectedTrack, setSelectedTrack] = useState(null)
	const [activeTab, setActiveTab] = useState('list')
	const [selectedTracks, setSelectedTracks] = useState([])

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
	// Добавьте после loadUserTracks
	const handleTracksSelect = tracks => {
		setSelectedTracks(tracks)
	}
	const handleTrackSelect = track => {
		setSelectedTrack(track)
		// Для мультивыбора
		setSelectedTracks(prev => {
			if (prev.some(t => t.id === track.id)) {
				return prev.filter(t => t.id !== track.id)
			} else {
				if (prev.length >= 2) {
					return [...prev.slice(0, 1), track]
				} else {
					return [...prev, track]
				}
			}
		})
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
			{console.log('🔍 GpxToolsPage перерендерился, user:', user?.id)}
			<Space direction='vertical' size='small' className={styles.content}>
				<Tabs
					activeKey={activeTab}
					onChange={handleTabChange}
					type='card'
					size='small'
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
							selectedTracks={selectedTracks}
							onTrackSelect={handleTrackSelect}
							onTracksSelect={handleTracksSelect}
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
						disabled={selectedTracks.length !== 1} // ← ИЗМЕНИТЬ: только 1 трек
					>
						{selectedTracks.length === 1 ? (
							<GpxEditor
								track={selectedTracks[0]} // ← Берем первый выбранный трек
								onTrackUpdated={loadUserTracks}
								user={user}
							/>
						) : (
							<Alert
								message='Выберите один трек'
								description='Для редактирования выберите один трек'
								type='info'
								showIcon
							/>
						)}
					</TabPane>

					<TabPane
						tab={
							<span className={styles.tabLabel}>
								<SwapOutlined /> Сравнить
							</span>
						}
						key='compare'
						disabled={selectedTracks.length !== 2} // ← ИЗМЕНИТЬ: ровно 2 трека
					>
						{selectedTracks.length === 2 ? (
							<GpxComparator tracks={selectedTracks} user={user} />
						) : (
							<Alert
								message='Выберите два трека'
								description='Для сравнения выберите два трека'
								type='info'
								showIcon
							/>
						)}
					</TabPane>
					<TabPane
						tab={
							<span className={styles.tabLabel}>
								<RocketOutlined /> UnifiedMap Demo
							</span>
						}
						key='unified'
						disabled={selectedTracks.length === 0} // ← Только если выбраны треки
					>
						{selectedTracks.length > 0 ? (
							<GpxUnifiedDemo
								tracks={tracks}
								user={user}
								selectedTracks={selectedTracks}
							/>
						) : (
							<Alert
								message='Выберите треки'
								description='Для демонстрации UnifiedMap выберите один или несколько треков на вкладке "Мои треки"'
								type='info'
								showIcon
							/>
						)}
					</TabPane>

					<TabPane
						tab={
							<span className={styles.tabLabel}>
								<SplitCellsOutlined /> Разделить на круги
							</span>
						}
						key='split'
						disabled={selectedTracks.length !== 1} // ← ИЗМЕНИТЬ: только 1 трек
					>
						{selectedTracks.length === 1 ? (
							<GpxSplitter
								track={selectedTracks[0]} // ← Берем первый выбранный трек
								onTrackUpdated={loadUserTracks}
								user={user}
							/>
						) : (
							<Alert
								message='Выберите один трек'
								description='Для разделения выберите один трек'
								type='info'
								showIcon
							/>
						)}
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
