import React from 'react'

export default function Leaderboard({ times, user }) {
	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	function formatDistance(km) {
		return km ? `${km.toFixed(1)} км` : '—'
	}

	return (
		<div className='leaderboard-card'>
			<h2>🏆 Таблица заездов</h2>

			{times.length === 0 ? (
				<p className='no-data'>Пока нет заездов. Будьте первым!</p>
			) : (
				<div className='table-responsive'>
					<table className='leaderboard-table'>
						<thead>
							<tr>
								<th>#</th>
								<th>Лыжник</th>
								<th>Время</th>
								<th>Лыжи</th>
								<th>Статус</th>
								<th>Комментарий</th>
								<th>Трек</th>
								<th>Дата</th>
							</tr>
						</thead>
						<tbody>
							{times.map((time, index) => (
								<tr
									key={time.id}
									className={time.user_id === user?.id ? 'my-time' : ''}
								>
									<td className='position'>{index + 1}</td>
									<td className='skier'>
										<strong>{time.user_name || 'Гость'}</strong>
										{time.user_id === user?.id && (
											<span className='you-badge'>Вы</span>
										)}
									</td>
									<td className='time'>
										<span className='time-badge'>
											{formatTime(time.time_seconds)}
										</span>
									</td>
									<td className='ski-model'>
										{time.ski_model ? (
											<span className='model-badge'>{time.ski_model}</span>
										) : (
											<span className='no-model'>—</span>
										)}
									</td>
									<td className='verification'>
										{time.verified ? (
											<span
												className='verified-badge'
												title='Подтверждено GPX треком'
											>
												✅
											</span>
										) : (
											<span
												className='not-verified'
												title='Нет подтверждающего трека'
											>
												⚠️
											</span>
										)}
									</td>
									<td className='comment' title={time.comment || ''}>
										{time.comment ? (
											<div className='comment-content'>
												{time.comment.length > 30
													? time.comment.substring(0, 30) + '...'
													: time.comment}
											</div>
										) : (
											<span className='no-comment'>—</span>
										)}
									</td>
									<td className='track'>
										{time.gpx_track_url ? (
											<a
												href={time.gpx_track_url}
												target='_blank'
												rel='noopener noreferrer'
												className='track-link'
												title={`Дистанция: ${formatDistance(
													time.track_distance
												)}`}
											>
												📊
											</a>
										) : (
											<span className='no-track'>—</span>
										)}
									</td>
									<td className='date'>
										{new Date(time.date).toLocaleDateString('ru-RU')}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<div className='table-footer'>
				<div className='footer-stats'>
					<span>Всего: {times.length} заездов</span>
					<span>✅ Подтверждено: {times.filter(t => t.verified).length}</span>
					<span>📝 С комментариями: {times.filter(t => t.comment).length}</span>
				</div>
			</div>
		</div>
	)
}
