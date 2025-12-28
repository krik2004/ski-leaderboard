import React, { useState } from 'react'
import {
	Form,
	Input,
	Button,
	Card,
	Typography,
	Alert,
	Space,
	Divider,
	Spin,
} from 'antd'
import {
	UserOutlined,
	LockOutlined,
	LoginOutlined,
	UserAddOutlined,
	TrophyOutlined,
} from '@ant-design/icons'
import { supabase } from '../../../shared/api/supabase'
import styles from './Auth.module.css' // ← Импорт стилей из той же папки

const { Title, Text, Paragraph } = Typography

export default function Auth({ onLoginSuccess }) {
	const [form] = Form.useForm()
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState({ type: '', text: '' })
	const [isLogin, setIsLogin] = useState(true)

	const handleAuth = async values => {
		const { email, password } = values
		setLoading(true)
		setMessage({ type: '', text: '' })

		try {
			if (isLogin) {
				// Вход
				const { data, error } = await supabase.auth.signInWithPassword({
					email,
					password,
				})

				if (error) throw error

				onLoginSuccess(data.user)
				setMessage({
					type: 'success',
					text: '✅ Вход выполнен успешно!',
				})
			} else {
				// Регистрация
				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							username: email.split('@')[0],
						},
					},
				})

				if (error) throw error

				if (data.user) {
					// Создаем профиль с уникальным именем
					const username =
						email.split('@')[0] + Math.floor(Math.random() * 1000)

					await supabase.from('profiles').upsert({
						id: data.user.id,
						username: username,
						visibility_preference: 'public',
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					})
				}

				setMessage({
					type: 'success',
					text: '✅ Регистрация успешна! Проверьте email для подтверждения и войдите в систему.',
				})
				setIsLogin(true)
				form.resetFields()
			}
		} catch (error) {
			console.error('Ошибка аутентификации:', error)
			setMessage({
				type: 'error',
				text: `❌ Ошибка: ${error.message}`,
			})
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className={styles.authPage}>
			<Card className={styles.authCard} bordered={false}>
				<div className={styles.authHeader}>
					<TrophyOutlined className={styles.authIcon} />
					<Title level={2} className={styles.authTitle}>
						🎿 Лыжный Рейтинг
					</Title>
					<Text className={styles.authSubtitle}>
						{isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
					</Text>
				</div>

				{/* Сообщения */}
				{message.text && (
					<Alert
						message={message.text}
						type={message.type === 'success' ? 'success' : 'error'}
						showIcon
						closable
						onClose={() => setMessage({ type: '', text: '' })}
						style={{ marginBottom: '24px' }}
					/>
				)}

				{/* Форма */}
				<Spin spinning={loading}>
					<Form
						form={form}
						layout='vertical'
						onFinish={handleAuth}
						size='large'
						className={styles.authForm}
					>
						<Form.Item
							name='email'
							rules={[
								{ required: true, message: 'Введите email' },
								{ type: 'email', message: 'Введите корректный email' },
							]}
						>
							<Input
								prefix={<UserOutlined />}
								placeholder='Email'
								disabled={loading}
							/>
						</Form.Item>

						<Form.Item
							name='password'
							rules={[
								{ required: true, message: 'Введите пароль' },
								{ min: 6, message: 'Пароль должен быть не менее 6 символов' },
							]}
						>
							<Input.Password
								prefix={<LockOutlined />}
								placeholder='Пароль'
								disabled={loading}
							/>
						</Form.Item>

						<Form.Item style={{ marginBottom: 0 }}>
							<Button
								type='primary'
								htmlType='submit'
								icon={isLogin ? <LoginOutlined /> : <UserAddOutlined />}
								loading={loading}
								block
								size='large'
								style={{
									height: '48px',
									fontSize: '16px',
									marginTop: '8px',
								}}
							>
								{isLogin ? 'Войти' : 'Зарегистрироваться'}
							</Button>
						</Form.Item>
					</Form>
				</Spin>

				<Divider style={{ margin: '16px 0' }}>
					<Text type='secondary'>или</Text>
				</Divider>

				{/* Переключение между входом и регистрацией */}
				<div className={styles.authToggle}>
					<Button
						type='link'
						onClick={() => {
							setIsLogin(!isLogin)
							form.resetFields()
							setMessage({ type: '', text: '' })
						}}
						disabled={loading}
						className={styles.authToggleButton}
					>
						{isLogin
							? 'Нет аккаунта? Зарегистрируйтесь'
							: 'Уже есть аккаунт? Войдите'}
					</Button>
				</div>

				{/* Дополнительная информация */}
				<Alert
					message='Информация'
					description={
						<Space direction='vertical' size={2}>
							<Text type='secondary'>
								• Для регистрации нужен только email и пароль
							</Text>
							<Text type='secondary'>
								• После регистрации проверьте email для подтверждения
							</Text>
							<Text type='secondary'>
								• Имя пользователя можно изменить в профиле
							</Text>
						</Space>
					}
					type='info'
					showIcon
					className={styles.authInfo}
				/>
			</Card>
		</div>
	)
}
