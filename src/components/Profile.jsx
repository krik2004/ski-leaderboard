import React, { useState, useEffect } from 'react'
import {
	Form,
	Input,
	Button,
	Radio,
	Card,
	message,
	Spin,
	Typography,
	Space,
	Alert,
} from 'antd'
import {
	UserOutlined,
	SaveOutlined,
	EyeOutlined,
	EyeInvisibleOutlined,
	ExperimentOutlined,
} from '@ant-design/icons'
import { supabase } from '../../shared/api/supabase'

const { Title, Text } = Typography

export default function Profile({ user, onUpdate, isMobile }) {
	const [form] = Form.useForm()
	const [loading, setLoading] = useState(false)
	const [profileLoading, setProfileLoading] = useState(true)

	useEffect(() => {
		loadProfile()
	}, [user])

	async function loadProfile() {
		try {
			const { data } = await supabase
				.from('profiles')
				.select('username, ski_model, visibility_preference')
				.eq('id', user.id)
				.single()

			if (data) {
				form.setFieldsValue({
					username: data.username || '',
					skiModel: data.ski_model || '',
					visibility: data.visibility_preference || 'public',
				})
			}
		} catch (error) {
			console.error('Ошибка загрузки профиля:', error)
		} finally {
			setProfileLoading(false)
		}
	}

	async function handleSubmit(values) {
		const { username, skiModel, visibility } = values

		if (!username?.trim()) {
			message.error('Введите имя')
			return
		}

		setLoading(true)

		try {
			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (!session) throw new Error('Нет сессии')

			const { error } = await supabase.from('profiles').upsert({
				id: session.user.id,
				username: username.trim(),
				ski_model: skiModel?.trim() || null,
				visibility_preference: visibility,
				updated_at: new Date().toISOString(),
			})

			if (error) throw error

			message.success('Профиль успешно обновлен!')
			onUpdate?.()
		} catch (error) {
			console.error('Ошибка сохранения:', error)
			message.error('Ошибка: ' + error.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<Card
			title={
				<Space>
					<UserOutlined />
					<span>Мой профиль</span>
				</Space>
			}
			bordered={false}
			style={{ width: '100%' }}
		>
			<Spin spinning={profileLoading}>
				<Form
					form={form}
					layout='vertical'
					onFinish={handleSubmit}
					size='middle'
					disabled={loading}
				>
					<Space direction='vertical' size='large' style={{ width: '100%' }}>
						{/* Имя и модель лыж */}
						<div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
							<Form.Item
								label='Имя в таблице'
								name='username'
								rules={[
									{ required: true, message: 'Введите имя' },
									{ min: 2, message: 'Минимум 2 символа' },
								]}
								style={{ flex: 1, minWidth: '200px' }}
							>
								<Input
									placeholder='Ваше имя'
									prefix={<UserOutlined />}
									maxLength={30}
								/>
							</Form.Item>

							<Form.Item
								label='Модель лыж'
								name='skiModel'
								extra='Будет использоваться по умолчанию для новых заездов'
								style={{ flex: 1, minWidth: '200px' }}
							>
								<Input
									placeholder='Производитель Модель'
									prefix={<ExperimentOutlined />}
									list='ski-brands'
								/>
								<datalist id='ski-brands'>
									<option value='Fischer' />
									<option value='Rossignol' />
									<option value='Madshus' />
									<option value='Salomon' />
									<option value='Atomic' />
									<option value='Pioneer' />
									<option value='Tisa' />
									<option value='Karhu' />
									<option value='Peltonen' />
									<option value='Brados' />
								</datalist>
							</Form.Item>
						</div>

						{/* Настройки видимости */}
						<Form.Item label='Настройки видимости' name='visibility'>
							<Radio.Group style={{ width: '100%' }}>
								<Space
									direction='vertical'
									size='middle'
									style={{ width: '100%' }}
								>
									<Card
										size='small'
										style={{
											border: '1px solid #d9d9d9',
											borderRadius: '8px',
											cursor: 'pointer',
										}}
										onClick={() => form.setFieldValue('visibility', 'public')}
									>
										<Radio
											value='public'
											style={{
												width: '100%',
												display: 'flex',
												alignItems: 'flex-start',
											}}
										>
											<Space
												direction='vertical'
												size={2}
												style={{ marginLeft: '8px' }}
											>
												<Space size={8}>
													<EyeOutlined style={{ color: '#52c41a' }} />
													<Text strong>Публичное участие</Text>
												</Space>
												<div style={{ marginLeft: '24px' }}>
													<Text type='secondary' style={{ display: 'block' }}>
														• Имя в общем рейтинге
													</Text>
													<Text type='secondary' style={{ display: 'block' }}>
														• Полная конкуренция
													</Text>
												</div>
											</Space>
										</Radio>
									</Card>

									<Card
										size='small'
										style={{
											border: '1px solid #d9d9d9',
											borderRadius: '8px',
											cursor: 'pointer',
										}}
										onClick={() =>
											form.setFieldValue('visibility', 'anonymous')
										}
									>
										<Radio
											value='anonymous'
											style={{
												width: '100%',
												display: 'flex',
												alignItems: 'flex-start',
											}}
										>
											<Space
												direction='vertical'
												size={2}
												style={{ marginLeft: '8px' }}
											>
												<Space size={8}>
													<EyeInvisibleOutlined style={{ color: '#fa8c16' }} />
													<Text strong>Анонимное участие</Text>
												</Space>
												<div style={{ marginLeft: '24px' }}>
													<Text type='secondary' style={{ display: 'block' }}>
														• В рейтинге как "Лыжник №Х"
													</Text>
													<Text type='secondary' style={{ display: 'block' }}>
														• Вижу своё место
													</Text>
												</div>
											</Space>
										</Radio>
									</Card>
								</Space>
							</Radio.Group>
						</Form.Item>

						{/* Кнопка сохранения */}
						<Form.Item style={{ marginBottom: 0 }}>
							<Button
								type='primary'
								htmlType='submit'
								icon={<SaveOutlined />}
								loading={loading}
								size='large'
								block={isMobile}
								style={{
									height: '48px',
									fontSize: '16px',
								}}
							>
								Сохранить настройки
							</Button>
						</Form.Item>
					</Space>
				</Form>
			</Spin>
		</Card>
	)
}
