import React from 'react'

export default function About() {
	return (
		<div className='about-card'>
			<h2>О проекте</h2>

			<div className='section'>
				<h3>Что это?</h3>
				<p>
					Лыжный Рейтинг Друзей — это платформа для сравнения результатов в
					лыжных заездах среди друзей. Отслеживайте свои результаты, свой прогресс
				</p>
			</div>

			<div className='section'>
				<h3>Как это работает?</h3>
				<ul>
					<li>
						<strong>Добавляйте заезды</strong> — вводите время и загружайте GPX
						треки
					</li>
					<li>
						<strong>Сравнивайте результаты</strong> — смотрите таблицу лидеров
					</li>
					<li>
						<strong>Подтверждайте заезды</strong> — GPX файлы добавляют статус
						"Подтверждено"
					</li>
					<li>
						<strong>Анализируйте прогресс</strong> — отслеживайте улучшение
						результатов
					</li>
				</ul>
			</div>

			<div className='section'>
				<h3>Конфиденциальность</h3>
				<p>Вы можете выбрать уровень видимости своих результатов:</p>
				<ul>
					<li>
						<strong>Публичный</strong> — все видят ваше имя и результаты
					</li>
					<li>
						<strong>Анонимный</strong> — вас показывают как "Лыжник №X"
					</li>
				</ul>
			</div>

			<div className='news-section'>
				<h3>Новости проекта</h3>

				<div className='news-item'>
					<div className='news-date'>24 декабря 2025</div>
					<div className='news-title'>
						Добавлены настройки конфиденциальности
					</div>
					<div className='news-content'>
						Теперь можно выбрать, как показывать ваши результаты: публично,
						анонимно
					</div>
				</div>

				<div className='news-item'>
					<div className='news-date'>23 декабря 2025</div>
					<div className='news-title'>Загрузка GPX треков</div>
					<div className='news-content'>
						Добавлена возможность загружать GPX файлы для подтверждения заездов.
						Заезды с треками отмечаются как "Подтвержденные".
					</div>
				</div>

				<div className='news-item'>
					<div className='news-date'>21 декабря 2025</div>
					<div className='news-title'>Запуск проекта</div>
					<div className='news-content'>
						Проект успешно запущен.
					</div>
				</div>
			</div>

			<div className='section tech-info'>
				<h3>Технологии</h3>
				<p>Проект построен на современном стеке:</p>
				<ul>
					<li>
						<strong>Frontend:</strong> React, CSS3
					</li>
					<li>
						<strong>Backend:</strong> Supabase (PostgreSQL, Auth, Storage)
					</li>
					<li>
						<strong>Хостинг:</strong> Vercel
					</li>
					<li>
						<strong>Деплой:</strong> Непрерывное развертывание из GitHub
					</li>
				</ul>
			</div>

			<div className='section contact-info'>
				<h3>Контакты</h3>
				<p>
					Есть вопросы или предложения?
для связи: телеграм @titov_films
				</p>
			</div>
		</div>
	)
}
