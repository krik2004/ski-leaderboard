// ===== src/features/gpx-tools/ui/GpxUnifiedDemo.jsx =====
import React, { useState, useEffect } from 'react'
import {
	Card,
	Alert,
	Select,
	Slider,
	Switch,
	Row,
	Col,
	Button,
	Space,
	Typography,
} from 'antd'
import {
	RocketOutlined,
	CodeOutlined,
	SettingOutlined,
} from '@ant-design/icons'
import UnifiedMap from './components/UnifiedMap'

const { Option } = Select
const { Text } = Typography

export default function GpxUnifiedDemo({
	tracks = [],
	user,
	selectedTracks = [],
}) {
	const [showLegend, setShowLegend] = useState(true)
	const [height, setHeight] = useState(500)
	const [playerEnabled, setPlayerEnabled] = useState(false)
	const [currentPointIndex, setCurrentPointIndex] = useState(0)
	const [mapMode, setMapMode] = useState('standard') // standard, satellite, terrain

	// Используем выбранные треки из родительского компонента
	const trackUrls = selectedTracks.map(track => track.url).filter(Boolean)
	const trackNames = selectedTracks.map(track => track.filename)

	return (
		<Card style={{ minHeight: '600px' }}>
			<Row gutter={[16, 16]}>
				{/* Левая панель - настройки */}
				<Col span={6}>
					<Card size='small' title='Настройки UnifiedMap'>
						<Text
							type='secondary'
							style={{ display: 'block', marginBottom: 16 }}
						>
							Выбрано треков: {selectedTracks.length}
							<br />
							{selectedTracks.map((t, i) => (
								<div key={t.id} style={{ fontSize: '12px', marginTop: 4 }}>
									{i + 1}. {t.filename}
								</div>
							))}
						</Text>

						<div style={{ marginBottom: 16 }}>
							<h4>Настройки отображения:</h4>
							<Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
								<Col span={24}>
									<Text>Режим карты:</Text>
									<Select
										value={mapMode}
										onChange={setMapMode}
										size='small'
										style={{ width: '100%', marginTop: 4 }}
									>
										<Option value='standard'>Стандартный</Option>
										<Option value='satellite'>Спутник</Option>
										<Option value='terrain'>Рельеф</Option>
									</Select>
								</Col>
							</Row>

							<Row gutter={[8, 8]}>
								<Col span={24}>
									<Switch
										checked={showLegend}
										onChange={setShowLegend}
										checkedChildren='Легенда вкл'
										unCheckedChildren='Легенда выкл'
									/>
								</Col>
								<Col span={24}>
									<Switch
										checked={playerEnabled}
										onChange={setPlayerEnabled}
										checkedChildren='Плеер вкл'
										unCheckedChildren='Плеер выкл'
										style={{ marginTop: 8 }}
									/>
								</Col>
							</Row>
						</div>

						<div style={{ marginBottom: 16 }}>
							<Text>Высота карты: {height}px</Text>
							<Slider
								min={300}
								max={800}
								step={50}
								value={height}
								onChange={setHeight}
								style={{ marginTop: 8 }}
							/>
						</div>

						{playerEnabled && (
							<div style={{ marginBottom: 16 }}>
								<Text>Тест плеера:</Text>
								<Slider
									min={0}
									max={1000}
									value={currentPointIndex}
									onChange={setCurrentPointIndex}
									tooltip={{ formatter: v => `Точка ${v}` }}
									style={{ marginTop: 8 }}
								/>
							</div>
						)}

						<Space style={{ marginTop: 16 }}>
							<Button
								icon={<SettingOutlined />}
								size='small'
								onClick={handleCenterMap}
							>
								Центрировать
							</Button>
						</Space>

						<Alert
							message='Подсказка'
							description="Выберите треки на вкладке 'Мои треки', затем вернитесь сюда"
							type='info'
							showIcon
							style={{ marginTop: 16 }}
						/>
					</Card>
				</Col>

				{/* Правая панель - карта */}
				<Col span={18}>
					<Card
						size='small'
						title={`UnifiedMap Demo (${trackUrls.length} треков)`}
						extra={
							<Space>
								<Button
									icon={<CodeOutlined />}
									size='small'
									onClick={() => {
										console.log('Выбранные треки:', selectedTracks)
										console.log('URLs:', trackUrls)
									}}
								>
									Debug Info
								</Button>
							</Space>
						}
					>
						{selectedTracks.length === 0 ? (
							<Alert
								message='Нет выбранных треков'
								description={
									<div>
										<p>1. Перейдите на вкладку "Мои треки"</p>
										<p>
											2. Выберите треки для отображения (можно 1 или несколько)
										</p>
										<p>3. Вернитесь на эту вкладку</p>
									</div>
								}
								type='info'
								showIcon
							/>
						) : (
							<UnifiedMap
								trackUrls={trackUrls}
								trackNames={trackNames}
								trackColors={[
									'#1890ff',
									'#f5222d',
									'#52c41a',
									'#faad14',
									'#722ed1',
								]}
								fitBounds={true}
								height={`${height}px`}
								showLegend={showLegend}
								currentPointIndex={playerEnabled ? currentPointIndex : null}
								playerMarkerOptions={
									playerEnabled
										? {
												html: `<div style="
                      width: 20px;
                      height: 20px;
                      background: #ff4d4f;
                      border-radius: 50%;
                      border: 3px solid white;
                      box-shadow: 0 0 10px rgba(0,0,0,0.7);
                      animation: pulse 1s infinite;
                    ">
                      <style>
                        @keyframes pulse {
                          0% { transform: scale(1); }
                          50% { transform: scale(1.2); }
                          100% { transform: scale(1); }
                        }
                      </style>
                    </div>`,
												iconSize: [26, 26],
												iconAnchor: [13, 13],
										  }
										: null
								}
								onMapReady={map => {
									console.log('✅ UnifiedMap готова:', map)
									window.demoMap = map 
								}}
								onTracksLoaded={tracksData => {
									console.log('📊 Треки загружены в UnifiedMap:', tracksData)
								}}
							/>
						)}
					</Card>

					{/* Статистика */}
					{selectedTracks.length > 0 && (
						<Card size='small' style={{ marginTop: 16 }}>
							<h4>Информация о выбранных треках:</h4>
							<Row gutter={[8, 8]}>
								{selectedTracks.map((track, idx) => (
									<Col key={track.id} span={24 / selectedTracks.length}>
										<Card size='small'>
											<Text strong>{track.filename}</Text>
											<div style={{ fontSize: '12px', marginTop: 4 }}>
												<div>ID: {track.id}</div>
												<div>
													Время:{' '}
													{track.time
														? `${Math.floor(track.time / 60)}:${(
																track.time % 60
														  )
																.toString()
																.padStart(2, '0')}`
														: '—'}
												</div>
												{track.skiModel && <div>Лыжи: {track.skiModel}</div>}
												<div>
													Дата: {new Date(track.date).toLocaleDateString()}
												</div>
											</div>
										</Card>
									</Col>
								))}
							</Row>
						</Card>
					)}
				</Col>
			</Row>
		</Card>
	)
}
