import React from 'react'
import { Select } from 'antd'
import { trails, defaultTrail } from './trailsData'
import styles from './TrailSelector.module.css'

const { Option } = Select

const TrailSelector = ({ selectedTrail, onTrailChange }) => {
	const handleChange = value => {
		const trail = trails.find(t => t.id === value) || defaultTrail
		onTrailChange(trail)
	}

	return (
		<>
			<div className={styles.selectorContainer}>
				<span className={styles.selectorLabel}>Центрировать карту:</span>
				<Select
					className={styles.selector}
					value={selectedTrail.id}
					onChange={handleChange}
					placeholder='Выберите трассу'
					size='large'
				>
					{trails.map(trail => (
						<Option key={trail.id} value={trail.id}>
							{trail.name}
						</Option>
					))}
				</Select>
			</div>
		</>
	)
}

export default TrailSelector
