import React from 'react'
import { Card, Typography, List, Space } from 'antd'
import {
  InfoCircleOutlined,
  RocketOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CloudUploadOutlined,
  CodeOutlined,
  MessageOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import styles from './About.module.css'

const { Title, Text, Paragraph } = Typography

export default function About() {
  return (
		<Card
			title={
				<Space>
					<InfoCircleOutlined />
					<span>О проекте</span>
				</Space>
			}
			bordered={false}
		>
			<div className={styles.aboutContainer}>
				{/* Что это? */}
				<div className={styles.section}>
					<Title level={4}>
						<RocketOutlined style={{ marginRight: '8px' }} />
						Что это?
					</Title>
					<Paragraph>
						Лыжный Рейтинг Друзей — это платформа для сравнения результатов в
						лыжных заездах среди друзей. Отслеживайте свои результаты и
						прогресс!
					</Paragraph>
				</div>

				{/* Как это работает? */}
				<div className={styles.section}>
					<Title level={4}>Как это работает?</Title>
					<List
						size='small'
						dataSource={[
							'Добавляйте заезды — вводите время и загружайте GPX треки',
							'Редактируйте заезды — обновляйте время, модель лыж, добавляйте GPX треки',
							'Сравнивайте результаты — смотрите таблицу лидеров',
							'Подтверждайте заезды — GPX файлы добавляют статус "Подтверждено"',
							'Анализируйте прогресс — отслеживайте улучшение результатов',
						]}
						renderItem={item => (
							<List.Item>
								<Text>• {item}</Text>
							</List.Item>
						)}
					/>
				</div>

				{/* Конфиденциальность */}
				<div className={styles.section}>
					<Title level={4}>Конфиденциальность</Title>
					<Paragraph>
						Вы можете выбрать уровень видимости своих результатов:
					</Paragraph>
					<List
						size='small'
						dataSource={[
							{
								icon: <EyeOutlined style={{ color: '#52c41a' }} />,
								title: 'Публичный',
								desc: 'Все видят ваше имя и результаты',
							},
							{
								icon: <EyeInvisibleOutlined style={{ color: '#fa8c16' }} />,
								title: 'Анонимный',
								desc: 'Вас показывают как "Лыжник №X"',
							},
						]}
						renderItem={item => (
							<List.Item>
								<Space>
									{item.icon}
									<div>
										<Text strong>{item.title}</Text>
										<br />
										<Text type='secondary'>{item.desc}</Text>
									</div>
								</Space>
							</List.Item>
						)}
					/>
				</div>

				{/* Новости проекта */}
				<div className={styles.newsSection}>
					<Title level={4}>
						<CalendarOutlined style={{ marginRight: '8px' }} />
						Новости проекта
					</Title>

					<div className={styles.newsItem}>
						<div className={styles.newsDate}>27 декабря 2025</div>
						<div className={styles.newsTitle}>
							Добавлено редактирование заездов
						</div>
						<div className={styles.newsContent}>
							Теперь можно редактировать свои заезды: обновлять время, модель
							лыж, добавлять или удалять GPX треки. Для каждого заезда можно
							указать свою модель лыж.
						</div>
					</div>

					<div className={styles.newsItem}>
						<div className={styles.newsDate}>24 декабря 2025</div>
						<div className={styles.newsTitle}>
							Добавлены настройки конфиденциальности
						</div>
						<div className={styles.newsContent}>
							Теперь можно выбрать, как показывать ваши результаты: публично или
							анонимно. В анонимном режиме вы отображаетесь как "Лыжник №X".
						</div>
					</div>

					<div className={styles.newsItem}>
						<div className={styles.newsDate}>23 декабря 2025</div>
						<div className={styles.newsTitle}>Загрузка GPX треков</div>
						<div className={styles.newsContent}>
							Добавлена возможность загружать GPX файлы для подтверждения
							заездов. Заезды с треками отмечаются как "Подтвержденные".
							Исправлена загрузка файлов с кириллическими именами.
						</div>
					</div>

					<div className={styles.newsItem}>
						<div className={styles.newsDate}>21 декабря 2025</div>
						<div className={styles.newsTitle}>Запуск проекта</div>
						<div className={styles.newsContent}>
							Проект успешно запущен под названием "Лыжный Рейтинг Друзей".
						</div>
					</div>
				</div>

				{/* Технологии */}

				{/* Контакты */}
				{/* Контакты - отдельно с отступом */}
				<div className={`${styles.section} ${styles.contactsSection}`}>
					<Title level={4}>
						<MessageOutlined style={{ marginRight: '8px' }} />
						Контакты
					</Title>
					<Paragraph>
						<Space>
							Есть вопросы или предложения? Для связи: телеграм
							<a
								href='https://t.me/titov_films'
								target='_blank'
								rel='noopener noreferrer'
								className={styles.telegramLink}
							>
								@titov_films
							</a>
						</Space>
					</Paragraph>
				</div>

				{/* Технологии */}
				<div className={styles.techSection}>
					<Text type='secondary' className={styles.techText}>
						<CodeOutlined style={{ marginRight: '6px' }} />
						Технологии: React • Ant Design • Supabase • Vercel
					</Text>
				</div>
			</div>
		</Card>
	)
}