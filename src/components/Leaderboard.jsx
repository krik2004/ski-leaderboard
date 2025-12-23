import React from 'react'

export default function Leaderboard({ times, user }) {
	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	return (
		<div className='leaderboard-card'>
			<h2>🏆 Таблица заездов ЛБК - Ангарский</h2>

			{times.length === 0 ? (
				<p className='no-data'>Пока нет заездов</p>
			) : (
				<table className='leaderboard-table'>
					<thead>
						<tr>
							<th>#</th>
							<th>Лыжник</th>
							<th>Время</th>
							<th>Дата</th>
							<th>Комментарий</th>
						</tr>
					</thead>
					<tbody>
						{times.map((time, index) => (
							<tr
								key={time.id}
								className={time.user_id === user?.id ? 'my-time' : ''}
							>
								<td>{index + 1}</td>
								<td>
									<strong>{time.user_name || 'Гость'}</strong>
								</td>
								<td>
									<span className='time-badge'>
										{formatTime(time.time_seconds)}
									</span>
								</td>
								<td>{new Date(time.date).toLocaleDateString('ru-RU')}</td>
								<td>{time.comment || '—'}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	)
}
